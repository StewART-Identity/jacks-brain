/**
 * GET /api/status
 *
 * Returns the true cataloging state of each acquired document by
 * cross-referencing static/originals/ files, content/collection/sources/
 * pages, and active workflow runs.
 *
 * States:
 *   CATALOGED    — source page exists in the wiki
 *   IN_PROGRESS  — a workflow is currently processing this file
 *   QUEUED       — a workflow is queued to process this file
 *   FAILED       — no source page and no active workflow for this file
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

// Match any token with a file extension we use for originals. Shared
// between commit-message timestamp lookup and active-run filename
// extraction. The token can include underscores, dots, hyphens, letters,
// digits — the same set we restrict acquire_for_catalog filenames to.
const FILENAME_RE = /([A-Za-z0-9._-]+\.(?:md|png|jpg|jpeg|gif|webp|pdf|docx|pptx|xlsx|csv|txt|html|json|mp4|mov|webm))/gi

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
 * Pull the most-likely filename out of an arbitrary string (commit message,
 * workflow display title, etc.) by finding all filename-shaped tokens and
 * picking the longest one. Longest wins because it's the most specific:
 * a re-acquisition message like "Re-acquire jacks-rules.md with complete
 * text" might also contain shorter incidental tokens.
 *
 * Returns null when nothing filename-shaped is found.
 */
function extractFilename(s: string): string | null {
  if (!s) return null
  const matches = [...s.matchAll(FILENAME_RE)].map(m => m[1])
  if (matches.length === 0) return null
  matches.sort((a, b) => b.length - a.length)
  return stripAutolink(matches[0])
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

  for (const c of commits) {
    const filename = extractFilename(c.commit.message)
    if (!filename) continue
    if (!timestamps.has(filename)) {
      timestamps.set(filename, c.commit.committer.date)
    }
  }
  return timestamps
}

/**
 * Fetch all in-flight catalog runs and bucket them by the filename each is
 * processing. Each run targets exactly one file: the catalog workflow is
 * push-triggered on static/originals/**, so head_commit.message identifies
 * the file (typically "Acquire <filename> for cataloging" from the MCP
 * default, or whatever custom message the operator passed). The
 * upload-form path uses display_title "upload: <filename>" — we honor both.
 *
 * We query in_progress and queued separately because GitHub's status
 * filter only accepts one value at a time. Each call uses per_page=100 to
 * cover large batch acquisitions where 20+ runs can be queued at once.
 *
 * Returns two sets keyed by extracted filename. A file present in either
 * set is "active"; absence from both means the run window has closed and
 * the file is either cataloged or genuinely failed.
 */
async function getActiveRunsByFile(
  token: string,
  repo: string,
): Promise<{ inProgress: Set<string>; queued: Set<string> }> {
  const [inProgressRes, queuedRes] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/catalog.yml/runs?status=in_progress&per_page=100`,
      { headers: ghHeaders(token) },
    ),
    fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/catalog.yml/runs?status=queued&per_page=100`,
      { headers: ghHeaders(token) },
    ),
  ])

  const inProgressData: GitHubRunsResponse = inProgressRes.ok
    ? await inProgressRes.json()
    : { workflow_runs: [] }
  const queuedData: GitHubRunsResponse = queuedRes.ok
    ? await queuedRes.json()
    : { workflow_runs: [] }

  const fileFromRun = (run: WorkflowRun): string | null => {
    // Upload-form path: display_title is "upload: <filename>".
    const uploadMatch = (run.display_title || "").match(/upload:\s*(.+)/)
    if (uploadMatch) return uploadMatch[1].trim()
    // MCP / push path: filename is in the head commit message.
    return (
      extractFilename(run.head_commit?.message || "") ||
      extractFilename(run.display_title || "")
    )
  }

  const bucket = (runs: WorkflowRun[]): Set<string> => {
    const s = new Set<string>()
    for (const run of runs) {
      const f = fileFromRun(run)
      if (f) s.add(f)
    }
    return s
  }

  return {
    inProgress: bucket(inProgressData.workflow_runs),
    queued: bucket(queuedData.workflow_runs),
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const [originalsRes, sourcesRes, activeRuns, timestamps] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/static/originals`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/content/collection/sources`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      getActiveRunsByFile(GITHUB_TOKEN, GITHUB_REPO),
      getOriginalsTimestamps(GITHUB_TOKEN, GITHUB_REPO),
    ])

    const originalsRaw: GitHubFile[] = originalsRes.ok ? await originalsRes.json() : []
    // Defensively strip any autolink wrapper off filenames returned by
    // the contents API. We've observed GitHub's contents API returning
    // `name` values like "[X.md](http://X.md)" for some files whose names
    // look URL-shaped, even though the file on disk is named cleanly.
    // If `name` comes back clean (the common case), this is a no-op.
    const originals: GitHubFile[] = originalsRaw.map(f => ({
      ...f,
      name: stripAutolink(f.name),
    }))
    const sources: GitHubFile[] = sourcesRes.ok ? await sourcesRes.json() : []

    // Build set of cataloged source page stems
    const catalogedStems = new Set(
      sources
        .filter((f) => f.name.endsWith(".md") && f.name !== "index.md")
        .map((f) => f.name.replace(/\.md$/, "")),
    )

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

        // Find the matching cataloged source-page stem, if any.
        // The match logic is fuzzy because source pages are slugified
        // (lowercase, non-alphanumerics → hyphens) while originals
        // preserve their original case and underscores. We compare
        // normalized forms.
        const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        const matchingSourceStem = [...catalogedStems].find((s) => {
          const normalizedSource = s.toLowerCase()
          return normalizedSource.includes(normalizedStem) ||
            normalizedStem.includes(normalizedSource.replace(/^\d{4}-\d{2}-\d{2}-/, ""))
        })
        const isCataloged = !!matchingSourceStem

        // Document display name: derive from the source page's filename
        // when we have one (it's clean, in our control, and never gets
        // mangled by upstream tooling). Re-attach the extension from the
        // original file so the displayed name is e.g. "x.md" not "x".
        // Fall back to the de-prefixed original filename only when there's
        // no source page yet (uncataloged uploads).
        const extMatch = f.name.match(/\.([A-Za-z0-9]+)$/)
        const ext = extMatch ? "." + extMatch[1] : ""
        const documentName = matchingSourceStem
          ? matchingSourceStem.replace(/^\d{4}-\d{2}-\d{2}-/, "") + ext
          : dePrefixed

        // Active-run lookup is per-file. We check both the full name and
        // the de-prefixed name because run commit messages may refer to
        // the file either way (and the upload-form path emits the bare
        // filename without the date prefix).
        const isInProgress =
          activeRuns.inProgress.has(f.name) ||
          activeRuns.inProgress.has(dePrefixed)
        const isQueued =
          activeRuns.queued.has(f.name) ||
          activeRuns.queued.has(dePrefixed)

        let status: string
        if (isCataloged) {
          status = "cataloged"
        } else if (isInProgress) {
          status = "in_progress"
        } else if (isQueued) {
          status = "queued"
        } else {
          status = "failed"
        }

        return {
          document: documentName,
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

    // Auto-refresh trigger for the frontend poller.
    const hasActive = documents.some(
      (d) => d.status === "in_progress" || d.status === "queued",
    )

    return Response.json({ documents, hasActive })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
