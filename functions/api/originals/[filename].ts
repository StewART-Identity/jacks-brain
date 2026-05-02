/**
 * GET /api/originals/:filename
 *
 * Proxies a download for a single file in static/originals/ (the
 * cataloged corpus) or static/in-flight/ (the file currently being
 * cataloged). The two-directory check lets a download link work both
 * after a catalog completes and during the brief window when the file
 * is mid-catalog.
 *
 * Auth: trusts Cloudflare Access (Cf-Access-Authenticated-User-Email
 * header). Path safety: filename must match a permissive alphanumeric
 * pattern, no slashes, no leading dot.
 *
 * Required env vars:
 *   GITHUB_TOKEN  — fine-grained PAT with contents:read
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const BRANCH = "main"
// Try originals first (the common case — cataloged files), fall through
// to in-flight (rare — file is mid-catalog).
const SEARCH_DIRS = ["static/originals", "static/in-flight"]

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

  const filename = (context.params.filename as string) ?? ""

  if (!filename || !/^[A-Za-z0-9._-]+$/.test(filename)) {
    return Response.json({ error: "Invalid filename" }, { status: 400 })
  }
  if (filename.includes("..") || filename.startsWith(".")) {
    return Response.json({ error: "Invalid filename" }, { status: 400 })
  }

  // Try each directory in order. Stop at the first one that has the file.
  let upstream: Response | null = null
  let lastStatus: number = 404
  for (const dir of SEARCH_DIRS) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${dir}/${filename}?ref=${BRANCH}`
    try {
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.raw",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "jacks-brain-originals-proxy",
        },
      })
      if (res.ok) {
        upstream = res
        break
      }
      lastStatus = res.status
    } catch (err) {
      return Response.json(
        { error: "Upstream fetch failed", detail: String(err) },
        { status: 502 },
      )
    }
  }

  if (!upstream) {
    if (lastStatus === 404) {
      return Response.json({ error: "File not found" }, { status: 404 })
    }
    return Response.json(
      { error: "Upstream error", status: lastStatus },
      { status: 502 },
    )
  }

  const headers = new Headers()
  headers.set("Content-Type", mimeFor(filename))
  headers.set(
    "Content-Disposition",
    `attachment; filename="${filename.replace(/"/g, "")}"`,
  )
  headers.set("Cache-Control", "private, max-age=3600")

  const upstreamLength = upstream.headers.get("Content-Length")
  if (upstreamLength) {
    headers.set("Content-Length", upstreamLength)
  }

  return new Response(upstream.body, { status: 200, headers })
}
