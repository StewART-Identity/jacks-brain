/**
 * GET /api/originals/:filename
 *
 * Proxies a download for a single file in static/originals/ in the GitHub
 * repo, fetching it via the GitHub API and streaming the bytes back to
 * the browser with appropriate Content-Type and Content-Disposition
 * headers.
 *
 * Why a proxy and not a static link:
 *   - The repo can be private. The browser never sees GITHUB_TOKEN.
 *   - URLs are clean (/api/originals/foo.docx instead of raw.githubusercontent.com/...).
 *   - Auth is enforced — Cloudflare Access must have authenticated the user.
 *   - Originals don't bloat the Pages build artifact.
 *
 * Source page download links should follow the form:
 *   [Download original](/api/originals/2026-04-25-foo.docx)
 *
 * Auth: trusts Cloudflare Access. The Cf-Access-Authenticated-User-Email
 * header must be present. (Same defense-in-depth pattern as upload.ts and
 * the listing endpoint at /api/originals.)
 *
 * Path safety: the filename comes from the URL path. We validate it
 * matches a permissive pattern (alnum, dot, dash, underscore) and
 * explicitly reject ".." and slashes — there is no way to escape the
 * static/originals/ directory.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   GITHUB_TOKEN  — fine-grained PAT with contents:read
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const BRANCH = "main"
const ORIGINALS_DIR = "static/originals"

// Map common file extensions to MIME types. The browser uses Content-Type
// to decide whether to render the file inline or trigger a download. For
// our purposes, Content-Disposition: attachment forces the download
// regardless.
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  zip: "application/zip",
}

function mimeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return MIME_TYPES[ext] ?? "application/octet-stream"
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Defense in depth: Cloudflare Access sets this header on every request
  // it allows through. Missing header = bypassed Access.
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json(
      { error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" },
      { status: 500 },
    )
  }

  // Pull the filename from the dynamic route param.
  const filename = (context.params.filename as string) ?? ""

  // Path safety. We accept only typical filename characters and reject
  // anything that could traverse out of the originals directory.
  if (!filename || !/^[A-Za-z0-9._-]+$/.test(filename)) {
    return Response.json(
      { error: "Invalid filename" },
      { status: 400 },
    )
  }
  if (filename.includes("..") || filename.startsWith(".")) {
    return Response.json(
      { error: "Invalid filename" },
      { status: 400 },
    )
  }

  // Fetch via the GitHub Contents API. We ask for the raw bytes via the
  // Accept header, which makes GitHub return the file body directly
  // rather than a base64-wrapped JSON envelope.
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${ORIGINALS_DIR}/${filename}?ref=${BRANCH}`
  let upstream: Response
  try {
    upstream = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "jacks-brain-originals-proxy",
      },
    })
  } catch (err) {
    return Response.json(
      { error: "Upstream fetch failed", detail: String(err) },
      { status: 502 },
    )
  }

  if (upstream.status === 404) {
    return Response.json({ error: "File not found" }, { status: 404 })
  }
  if (!upstream.ok) {
    return Response.json(
      { error: "Upstream error", status: upstream.status },
      { status: 502 },
    )
  }

  // Stream the body back to the browser with download headers. We don't
  // read it into memory — we hand the body off to Cloudflare's runtime
  // which streams it directly to the client.
  const headers = new Headers()
  headers.set("Content-Type", mimeFor(filename))
  headers.set(
    "Content-Disposition",
    `attachment; filename="${filename.replace(/"/g, "")}"`,
  )
  // Cloudflare caches at the edge; cache for an hour. Originals are
  // immutable in practice (uploads create new dated filenames), so a
  // longer TTL is safe — but an hour is a sensible default.
  headers.set("Cache-Control", "private, max-age=3600")

  // Pass through Content-Length if upstream provided it.
  const upstreamLength = upstream.headers.get("Content-Length")
  if (upstreamLength) {
    headers.set("Content-Length", upstreamLength)
  }

  return new Response(upstream.body, { status: 200, headers })
}
