/**
 * GET /api/retention
 *
 * Returns the retention log as structured JSON for the RetentionList
 * component. Reads the markdown table in data/retention-log.md and for
 * each row, looks up the current title of the source page (so the "Title"
 * column reflects renames done since the row was logged).
 *
 * The audit log lives at data/retention-log.md (outside Quartz's content/
 * directory) so Quartz doesn't render it as a wiki page — that would
 * double-render the table alongside this component.
 *
 * Response shape:
 *   { rows: [
 *       { date, action, filename, slug, title, sourcePresent }
 *     ] }
 *
 *   sourcePresent is false when the source page no longer exists
 *   (e.g. after a nuke). The UI shows those rows with a muted dash and
 *   disables inline editing.
 *
 * Auth: trusts Cloudflare Access. Defense-in-depth check on
 * Cf-Access-Authenticated-User-Email header.
 *
 * Requires env vars:
 *   GITHUB_TOKEN  — fine-grained PAT with contents:read
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface ContentResponse {
  content: string
  encoding: string
}

interface RetentionRow {
  date: string
  action: string
  filename: string
  slug: string
  title: string
  sourcePresent: boolean
}

const BRANCH = "main"
const RETENTION_PATH = "data/retention-log.md"

// Mirror of the slug derivation in scripts/catalog.mjs. Source pages
// preserve their date prefix (filename "2026-04-23-img-2369.md"), so the
// slug is just: stem → lowercase → non-alphanumerics collapsed to hyphens.
function deriveSlug(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase()
  return stem.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function decodeBase64Utf8(b64: string): string {
  const cleaned = b64.replace(/\n/g, "")
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Parse the GitHub Flavored Markdown table out of the page body.
// Expected shape (header + separator + data rows):
//   | Date | Action | Details |
//   |------|--------|---------|
//   | 2026-04-23 | Cataloged | 2026-04-23-IMG_2369.png |
function parseTable(markdown: string): { date: string; action: string; details: string }[] {
  const lines = markdown.split(/\r?\n/)
  const rows: { date: string; action: string; details: string }[] = []
  let inTable = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("|")) {
      if (inTable) inTable = false
      continue
    }
    // Skip header and separator rows
    if (/^\|\s*Date\s*\|/i.test(trimmed)) { inTable = true; continue }
    if (/^\|\s*[-: ]+\s*\|/.test(trimmed)) continue
    if (!inTable) continue
    const cells = trimmed
      .replace(/^\||\|$/g, "")
      .split("|")
      .map(c => c.trim())
    if (cells.length < 3) continue
    rows.push({ date: cells[0], action: cells[1], details: cells[2] })
  }
  return rows
}

// Pull the YAML frontmatter title out of a source page.
function extractTitle(markdown: string): string | null {
  const fm = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return null
  const titleLine = fm[1].split(/\r?\n/).find(l => /^title:/.test(l))
  if (!titleLine) return null
  const value = titleLine.replace(/^title:\s*/, "").trim()
  // Strip surrounding single or double quotes if present
  return value.replace(/^["'](.*)["']$/, "$1")
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}`
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jacks-brain-retention",
  }

  // 1. Read the retention markdown
  const retRes = await fetch(
    `${api}/contents/${RETENTION_PATH}?ref=${BRANCH}`,
    { headers },
  )
  if (retRes.status === 404) {
    return Response.json({ rows: [] })
  }
  if (!retRes.ok) {
    const text = await retRes.text()
    return Response.json(
      { error: `GitHub read failed: ${retRes.status} ${text}` },
      { status: 502 },
    )
  }
  const retFile = (await retRes.json()) as ContentResponse
  const retContent = decodeBase64Utf8(retFile.content)
  const tableRows = parseTable(retContent)

  if (tableRows.length === 0) {
    return Response.json({ rows: [] })
  }

  // 2. List all source pages so we know which slugs exist.
  const sourcesRes = await fetch(
    `${api}/contents/content/recall/sources?ref=${BRANCH}`,
    { headers },
  )
  const sourcesPresent = new Set<string>()
  if (sourcesRes.ok) {
    const entries = (await sourcesRes.json()) as { name: string; type: string }[]
    for (const e of entries) {
      if (e.type === "file" && e.name.endsWith(".md") && e.name !== "index.md") {
        sourcesPresent.add(e.name.replace(/\.md$/, ""))
      }
    }
  }

  // 3. For each unique slug we'll display, fetch the current title.
  // Cache by slug so we only fetch each source page once even if it appears
  // in multiple retention rows.
  const slugToTitle = new Map<string, string>()
  const uniqueSlugs = new Set<string>()
  for (const row of tableRows) {
    const slug = deriveSlug(row.details)
    if (sourcesPresent.has(slug)) uniqueSlugs.add(slug)
  }

  await Promise.all(
    [...uniqueSlugs].map(async (slug) => {
      const r = await fetch(
        `${api}/contents/content/recall/sources/${slug}.md?ref=${BRANCH}`,
        { headers },
      )
      if (!r.ok) return
      const f = (await r.json()) as ContentResponse
      const md = decodeBase64Utf8(f.content)
      const t = extractTitle(md)
      if (t) slugToTitle.set(slug, t)
    }),
  )

  // 4. Build the response rows.
  const rows: RetentionRow[] = tableRows.map((row) => {
    const slug = deriveSlug(row.details)
    const sourcePresent = sourcesPresent.has(slug)
    return {
      date: row.date,
      action: row.action,
      filename: row.details,
      slug,
      title: slugToTitle.get(slug) || (sourcePresent ? row.details : ""),
      sourcePresent,
    }
  })

  return Response.json({ rows })
}
