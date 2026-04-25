/**
 * GET /api/retention
 *
 * Returns the retention log as structured JSON for the RetentionList
 * component. Reads the markdown table in data/retention-log.md and for
 * each row, looks up the current title of the source page (so the
 * "Title" column reflects renames done since the row was logged).
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
  loggedAt: string | null
}

const BRANCH = "main"
const RETENTION_PATH = "data/retention-log.md"

// Mirror of the slug derivation in scripts/catalog.mjs:
//   lowercase, replace any leading/trailing junk, hyphenate non-alphanumerics,
//   and STRIP any leading YYYY-MM-DD- prefix so re-catalogs of the same
//   underlying file produce the same slug.
function deriveSlug(filename: string): string {
  // Source pages preserve their date prefix (e.g. "2026-04-23-img-2369.md"),
  // so the slug is just: stem → lowercase → non-alphanumerics collapsed to hyphens.
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

interface CommitListItem {
  sha: string
  commit: {
    message: string
    committer: { date: string }
  }
}

/**
 * Build a map of {filename → ISO timestamp} by walking commits to
 * data/retention-log.md in reverse-chronological order. Mirrors the same
 * approach used in /api/status against static/originals/, so that two
 * documents logged on the same date sort by the actual commit time
 * (newest first) instead of falling back to whatever order they happen
 * to appear in the markdown table.
 *
 * The append_retention_entry MCP tool always commits with a message like
 * "Log retention: <action> <filename>", and the upload form's pipeline
 * follows the same convention. We extract the filename from each commit
 * message and take the newest commit per filename.
 *
 * One API call, per_page=100. If the log ever grows past that, older
 * entries fall back to the row's date column via the sort comparator.
 */
async function getRetentionTimestamps(
  api: string,
  headers: Record<string, string>,
): Promise<Map<string, string>> {
  const res = await fetch(
    `${api}/commits?path=${encodeURIComponent(RETENTION_PATH)}&per_page=100`,
    { headers },
  )
  if (!res.ok) return new Map()

  const commits = (await res.json()) as CommitListItem[]
  const timestamps = new Map<string, string>()

  // Newest-first. First match per filename wins.
  for (const c of commits) {
    const msg = c.commit.message
    // Match the YYYY-MM-DD-<rest> filename out of the message body.
    const match = msg.match(/(\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+)/)
    if (match && !timestamps.has(match[1])) {
      timestamps.set(match[1], c.commit.committer.date)
    }
  }
  return timestamps
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

  // 1. Read the retention markdown and the per-row commit timestamps
  // in parallel. The timestamp map lets us tiebreak same-date rows by
  // their actual commit time, matching what /api/status does for
  // static/originals/.
  const [retRes, timestamps] = await Promise.all([
    fetch(`${api}/contents/${RETENTION_PATH}?ref=${BRANCH}`, { headers }),
    getRetentionTimestamps(api, headers),
  ])
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
    `${api}/contents/content/collection/sources?ref=${BRANCH}`,
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
        `${api}/contents/content/collection/sources/${slug}.md?ref=${BRANCH}`,
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
      // Real commit timestamp drives sort order. Falls back to the date
      // column if we couldn't resolve a timestamp (e.g. older entries
      // beyond the per_page=100 commits window).
      loggedAt: timestamps.get(row.details) || null,
    }
  })

  // Sort newest-first. Primary key: commit timestamp. Falls back to the
  // date column for any row without a resolved timestamp.
  rows.sort((a, b) => {
    const aKey = a.loggedAt || a.date || ""
    const bKey = b.loggedAt || b.date || ""
    return bKey.localeCompare(aKey)
  })

  return Response.json({ rows })
}
