/**
 * GET /api/status
 *
 * Patch tag: status-fix-v5 (debug: surface raw f.name in JSON).
 * If you don't see this comment in the deployed file, the upload was
 * silently no-op'd — re-upload or copy/paste the file by hand.
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
    message: string
    committer: { date: string }
  }
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "jacks-brain",
  }
}

/**
 * Strip markdown-autolink wrappers `[X](Y)` out of a string. Some upstream
 * tooling auto-converts URL-shaped tokens like `name.md` into autolink form,
 * and we've observed it both as a full-string wrap (`[2026-04-25-x.md](...)`)
 * and as a partial wrap that leaves a non-URL prefix outside the brackets
 * (`2026-04-25-[x.md](...)`). Use a global replace so both cases collapse
 * back to the link text. If the input has no autolinks, this is a no-op.
 */
function stripAutolink(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
}

/**
 * Build a map of {filename → ISO timestamp of the commit that last touched it}
 * by walking commits that affected static/originals/ in reverse-chronological
 * order. The first commit we see per file is the newest.
 *
 * We extract filenames out of commit messages because the list-commits
 * endpoint doesn't include `files`. The previous version of this regex
 * required a YYYY-MM-DD date prefix in the matched filename, which broke
 * for any commit whose message used a non-default template (e.g. a
 * re-acquisition where the operator passed a custom commit_message
 * referring to the file by its bare name without the date prefix).
 *
 * The new regex anchors on file extensions instead, which is much harder
 * to fool: any token ending in a known extension (.md, .png, .docx, etc.)
 * preceded by reasonable filename characters is treated as a candidate.
 * If the message contains no recognizable filename, we just don't get a
 * timestamp for that commit and the sort falls back to the date column.
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

  // Match any token with a file extension we use for originals. The token
  // can include underscores, dots, hyphens, letters, digits — the same set
  // we restrict acquire_for_catalog filenames to.
  const filenameRe = /([A-Za-z0-9._-]+\.(?:md|png|jpg|jpeg|gif|webp|pdf|docx|pptx|xlsx|csv|txt|html|json|mp4|mov|webm))/gi

  for (const c of commits) {
    const msg = c.commit.message
    // Find ALL filename-shaped tokens in the message and pick the longest
    // (most specific) one. This handles two cases:
    //  - "Acquire 2026-04-25-something.md for cataloging" (one match, easy)
    //  - "Re-acquire jacks-rules-for-website-design.md with complete text"
    //    (no date prefix, but still has a recognizable filename token)
    const matches = [...msg.matchAll(filenameRe)].map(m => m[1])
    if (matches.length === 0) continue
    matches.sort((a, b) => b.length - a.length)
    const filename = stripAutolink(matches[0])
    if (!timestamps.has(filename)) {
      timestamps.set(filename, c.commit.committer.date)
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

    const originalsRaw: GitHubFile[] = originalsRes.ok ? await originalsRes.json() : []
    // DEBUG v5: capture raw names from GitHub before any of our processing,
    // and also log the body bytes if the JSON parse mangled them.
    const debugRawNames = originalsRaw.map(f => f.name)
    // Defensively strip any autolink wrapper off filenames returned by
    // the contents API. We've observed this happening for files whose
    // names look URL-ish (e.g. anything ending in .md). If `name` comes
    // back clean, this is a no-op.
    const originals: GitHubFile[] = originalsRaw.map(f => ({
      ...f,
      name: stripAutolink(f.name),
    }))
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
        // string is still what we display in the table column. The
        // timestamps map keys on the bare filename, so we look up by the
        // full prefixed name (and also try the de-prefixed name as a
        // fallback for commit messages that referred to the file without
        // its date prefix).
        const dePrefixed = f.name.replace(/^\d{4}-\d{2}-\d{2}-/, "")
        const acquiredAt =
          timestamps.get(f.name) ||
          timestamps.get(dePrefixed) ||
          null

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
          document: dePrefixed,
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

    return Response.json({ documents, hasActive, debugRawNames })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
