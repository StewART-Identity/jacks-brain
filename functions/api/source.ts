/**
 * PATCH /api/source
 *
 * Updates a source page's frontmatter `title` field without touching the
 * rest of the page. The display name shown in the wiki UI is the
 * frontmatter title, so this endpoint is what backs inline-edit on the
 * Retention page.
 *
 * Request body: { slug: string; title: string }
 *   slug   — the source page slug, e.g. "2026-04-23-img-2369"
 *            (no path prefix, no .md extension)
 *   title  — the new title to write into the page's frontmatter
 *
 * Auth: trusts Cloudflare Access. Defense-in-depth check on the
 * Cf-Access-Authenticated-User-Email header rejects requests that
 * didn't come through Access.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   GITHUB_TOKEN  — fine-grained PAT with contents:write
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface PatchBody {
  slug?: unknown
  title?: unknown
}

interface ContentResponse {
  content: string
  sha: string
  encoding: string
}

const BRANCH = "main"

// Slug rules:
//  - no path separators
//  - no leading dots, no .. anywhere
//  - reasonable character set (we expect lowercased hyphenated stems)
function isSafeSlug(s: unknown): s is string {
  if (typeof s !== "string" || s.length === 0 || s.length > 200) return false
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return false
  if (s.startsWith(".")) return false
  return /^[a-z0-9._-]+$/i.test(s)
}

function isReasonableTitle(t: unknown): t is string {
  return typeof t === "string" && t.trim().length > 0 && t.length <= 300
}

// Replace (or insert) the YAML frontmatter `title:` field. Preserves the
// rest of the document byte-for-byte. Handles quoted and unquoted forms.
function updateFrontmatterTitle(source: string, newTitle: string): string {
  const escaped = newTitle.replace(/"/g, '\\"')
  const replacement = `title: "${escaped}"`

  // Document must start with a frontmatter block.
  const fmMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) {
    // No frontmatter — prepend one.
    return `---\n${replacement}\n---\n\n${source}`
  }

  const fmBody = fmMatch[1]
  const titleLineRe = /^title:.*$/m

  let newFmBody: string
  if (titleLineRe.test(fmBody)) {
    newFmBody = fmBody.replace(titleLineRe, replacement)
  } else {
    newFmBody = replacement + "\n" + fmBody
  }

  return source.replace(fmMatch[0], `---\n${newFmBody}\n---`)
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  // Defense in depth — Cloudflare Access sets this header on every request
  // it lets through. If it's missing, the request didn't come via Access.
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  let body: PatchBody
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isSafeSlug(body.slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 })
  }
  if (!isReasonableTitle(body.title)) {
    return Response.json({ error: "Invalid title" }, { status: 400 })
  }

  const slug = body.slug
  const newTitle = body.title.trim()
  const path = `content/reflect/sources/${slug}.md`
  const api = `https://api.github.com/repos/${GITHUB_REPO}`
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jacks-brain-source-edit",
  }

  // 1. Read the current source page to get its content + sha.
  const getRes = await fetch(
    `${api}/contents/${path}?ref=${BRANCH}`,
    { headers },
  )
  if (getRes.status === 404) {
    return Response.json({ error: "Source page not found" }, { status: 404 })
  }
  if (!getRes.ok) {
    const text = await getRes.text()
    return Response.json(
      { error: `GitHub read failed: ${getRes.status} ${text}` },
      { status: 502 },
    )
  }
  const file = (await getRes.json()) as ContentResponse
  const currentContent = atob(file.content.replace(/\n/g, ""))

  // 2. Update the frontmatter title in-memory.
  const newContent = updateFrontmatterTitle(currentContent, newTitle)
  if (newContent === currentContent) {
    return Response.json({ ok: true, unchanged: true })
  }

  // 3. Encode and PUT back.
  // btoa needs Latin-1; use TextEncoder for safe UTF-8 → base64.
  const bytes = new TextEncoder().encode(newContent)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const newContentB64 = btoa(binary)

  const putRes = await fetch(
    `${api}/contents/${path}`,
    {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Rename source: ${slug} → "${newTitle}"`,
        content: newContentB64,
        sha: file.sha,
        branch: BRANCH,
      }),
    },
  )
  if (!putRes.ok) {
    const text = await putRes.text()
    return Response.json(
      { error: `GitHub write failed: ${putRes.status} ${text}` },
      { status: 502 },
    )
  }

  return Response.json({ ok: true, slug, title: newTitle })
}
