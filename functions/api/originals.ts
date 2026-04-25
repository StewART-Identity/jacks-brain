/**
 * GET /api/originals
 *
 * Lists every file in static/originals/ in the GitHub repo, with each
 * entry including the original filename, a download URL pointing at the
 * repo's raw content, the date it was acquired (last commit touching the
 * file), and a flag indicating whether a corresponding source page exists
 * in content/recall/sources/ (i.e. whether it has been cataloged yet).
 *
 * Backs the SourcesList component on /recall/sources/.
 *
 * Response shape:
 *   { files: [
 *       { name, downloadUrl, acquired, cataloged }
 *     ] }
 *
 * Auth: trusts Cloudflare Access. Defense-in-depth check on the
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

interface DirEntry {
  name: string
  type: string
  download_url: string | null
}

interface CommitListEntry {
  commit: { author?: { date?: string }; committer?: { date?: string } }
}

interface OriginalFile {
  name: string
  downloadUrl: string
  acquired: string | null
  cataloged: boolean
}

const BRANCH = "main"
const ORIGINALS_DIR = "static/originals"
const SOURCES_DIR = "content/recall/sources"

// Source pages preserve their date prefix in the filename (e.g.
// "2026-04-23-img-2369.md"), so the slug we compute from the original
// filename should also keep it. This is the canonical derivation: lowercase
// the stem, collapse non-alphanumerics to hyphens, trim trailing hyphens.
function deriveSlug(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").toLowerCase()
  return stem.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
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
    "User-Agent": "jacks-brain-originals",
  }

  // 1. List static/originals/
  const dirRes = await fetch(
    `${api}/contents/${ORIGINALS_DIR}?ref=${BRANCH}`,
    { headers },
  )
  if (dirRes.status === 404) {
    return Response.json({ files: [] })
  }
  if (!dirRes.ok) {
    const text = await dirRes.text()
    return Response.json(
      { error: `GitHub read failed: ${dirRes.status} ${text}` },
      { status: 502 },
    )
  }
  const entries = (await dirRes.json()) as DirEntry[]
  const fileEntries = entries.filter(
    (e) => e.type === "file" && e.name !== ".gitkeep" && e.download_url,
  )

  // 2. List content/recall/sources/ to know which originals have been cataloged.
  const cataloguedSlugs = new Set<string>()
  const sourcesRes = await fetch(
    `${api}/contents/${SOURCES_DIR}?ref=${BRANCH}`,
    { headers },
  )
  if (sourcesRes.ok) {
    const sourceEntries = (await sourcesRes.json()) as DirEntry[]
    for (const s of sourceEntries) {
      if (s.type === "file" && s.name.endsWith(".md") && s.name !== "index.md") {
        cataloguedSlugs.add(s.name.replace(/\.md$/, ""))
      }
    }
  }

  // 3. For each original, look up the most recent commit touching it
  // (this is its "acquired" date — when the file was added to the repo).
  // GitHub's commits-touching-path API takes a path query param.
  const files: OriginalFile[] = await Promise.all(
    fileEntries.map(async (e) => {
      const slug = deriveSlug(e.name)
      let acquired: string | null = null
      try {
        const commitsRes = await fetch(
          `${api}/commits?path=${encodeURIComponent(`${ORIGINALS_DIR}/${e.name}`)}&per_page=1`,
          { headers },
        )
        if (commitsRes.ok) {
          const commits = (await commitsRes.json()) as CommitListEntry[]
          if (commits.length > 0) {
            const date = commits[0].commit.author?.date || commits[0].commit.committer?.date
            if (date) acquired = date.slice(0, 10) // YYYY-MM-DD
          }
        }
      } catch {
        // Acquisition date is best-effort; if commits API fails, leave null
      }
      return {
        name: e.name,
        downloadUrl: e.download_url!,
        acquired,
        cataloged: cataloguedSlugs.has(slug),
      }
    }),
  )

  // Sort by acquired date descending (newest first), filename as tiebreaker
  files.sort((a, b) => {
    if (a.acquired && b.acquired && a.acquired !== b.acquired) {
      return a.acquired < b.acquired ? 1 : -1
    }
    return a.name.localeCompare(b.name)
  })

  return Response.json({ files })
}
