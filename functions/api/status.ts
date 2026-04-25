/**
 * GET /api/status
 *
 * Returns the true cataloging state of each acquired document by
 * cross-referencing static/originals/ files, content/collection/sources/
 * pages, and active workflow runs.
 *
 * States:
 *   CATALOGED    — source page exists in the wiki
 *   IN_PROGRESS  — a workflow is currently processing
 *   QUEUED       — a workflow is queued to process
 *   FAILED       — no source page and no active workflow
 *
 * Requires env vars:
 *   GITHUB_TOKEN  — fine-grained PAT with contents:read + actions:read
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface GitHubFile {
  name: string
  type: string
}

interface WorkflowRun {
  id: number
  name: string
  display_title: string
  status: string
  conclusion: string | null
  created_at: string
  head_commit: { message: string } | null
}

interface GitHubRunsResponse {
  workflow_runs: WorkflowRun[]
}

interface GitHubCommit {
  sha: string
  commit: {
    committer: { date: string }
  }
  files?: { filename: string }[]
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "jacks-brain",
  }
}

/**
 * Build a map of {filename → ISO timestamp of the commit that last touched it}
 * by walking commits that affected static/originals/ in reverse-chronological
 * order. The first commit we see per file is the newest, which is what we
 * want for "acquired" ordering — re-acquisitions (overwrites via
 * acquire_for_catalog) bubble that file to the top of the list, matching
 * user expectation that the most recent activity surfaces first.
 *
 * One API call regardless of file count. We fetch per_page=100 which covers
 * the foreseeable scale of static/originals/; if it ever grows past that,
 * the older files just fall back to the date in their filename via the
 * sort comparator below.
 */
async function getOriginalsTimestamps(
  token: string,
  repo: string,
): Promise<Map<string, string>> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?path=static/originals&per_page=100`,
    { headers: ghHeaders(token) },
  )
  if (!res.ok) return new Map()

  const commits: GitHubCommit[] = await res.json()
  const timestamps = new Map<string, string>()

  // Commits are returned newest-first. For each commit, we'd ideally read
  // its `files` list to know which originals it touched — but the list-commits
  // endpoint doesn't include files, only get-single-commit does. Rather than
  // fan out to N detail calls, we approximate: assume the commit message
  // names the file (our acquire_for_catalog tool always commits with a
  // message containing the filename). This holds for tool-driven acquisitions
  // and degrades gracefully (filename-prefix sort) for anything else.
  for (const c of commits) {
    const msg = (c as unknown as { commit: { message: string } }).commit.message
    // Match filenames like 2026-04-25-something.md inside the commit message.
    const match = msg.match(/(\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+)/)
    if (match && !timestamps.has(match[1])) {
      timestamps.set(match[1], c.commit.committer.date)
    }
  }
  return timestamps
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const [originalsRes, sourcesRes, runsRes, timestamps] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/static/originals`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/content/collection/sources`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/catalog.yml/runs?per_page=10`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      getOriginalsTimestamps(GITHUB_TOKEN, GITHUB_REPO),
    ])

    const originals: GitHubFile[] = originalsRes.ok ? await originalsRes.json() : []
    const sources: GitHubFile[] = sourcesRes.ok ? await sourcesRes.json() : []
    const runsData: GitHubRunsResponse = runsRes.ok
      ? await runsRes.json()
      : { workflow_runs: [] }

    // Build set of cataloged source page stems
    const catalogedStems = new Set(
      sources
        .filter((f) => f.name.endsWith(".md") && f.name !== "index.md")
        .map((f) => f.name.replace(/\.md$/, "")),
    )

    // Check for any active workflows
    const activeRuns = runsData.workflow_runs.filter(
      (r) => r.status === "in_progress" || r.status === "queued",
    )
    const hasActiveRun = activeRuns.length > 0

    // Extract document names from active runs
    const activeDocNames = new Set<string>()
    for (const run of activeRuns) {
      const title = run.display_title || run.head_commit?.message || ""
      const match = title.match(/upload:\s*(.+)/)
      if (match) activeDocNames.add(match[1].trim())
    }

    // Build document status list
    const documents = originals
      .filter(
        (f) =>
          f.type === "file" &&
          f.name !== ".gitkeep" &&
          f.name !== ".catalog-trigger",
      )
      .map((f) => {
        const stem = f.name.replace(/\.[^.]+$/, "")
        const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/)
        const acquired = dateMatch ? dateMatch[1] : null

        // Real commit timestamp drives sort order; the date-only `acquired`
        // string is still what we display in the table column.
        const acquiredAt = timestamps.get(f.name) || null

        // Check if this document has a source page (match by stem substring)
        const isCataloged = [...catalogedStems].some((s) => {
          const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          const normalizedSource = s.toLowerCase()
          return normalizedSource.includes(normalizedStem) ||
            normalizedStem.includes(normalizedSource.replace(/^\d{4}-\d{2}-\d{2}-/, ""))
        })

        // Check if an active workflow is processing this file
        const isActive = activeDocNames.has(f.name) || (hasActiveRun && !isCataloged)

        let status: string
        if (isCataloged) {
          status = "cataloged"
        } else if (activeRuns.some((r) => r.status === "in_progress") && isActive) {
          status = "in_progress"
        } else if (activeRuns.some((r) => r.status === "queued") && isActive) {
          status = "queued"
        } else if (!isCataloged) {
          status = "failed"
        } else {
          status = "cataloged"
        }

        return {
          document: f.name.replace(/^\d{4}-\d{2}-\d{2}-/, ""),
          acquired,
          acquiredAt,
          status,
        }
      })
      .sort((a, b) => {
        // Primary: commit timestamp (newest first). Falls back to filename
        // date prefix for any file we couldn't resolve a timestamp for.
        const aKey = a.acquiredAt || a.acquired || ""
        const bKey = b.acquiredAt || b.acquired || ""
        return bKey.localeCompare(aKey)
      })

    // Also include active run info for auto-refresh detection
    const hasActive = documents.some(
      (d) => d.status === "in_progress" || d.status === "queued",
    )

    return Response.json({ documents, hasActive })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
