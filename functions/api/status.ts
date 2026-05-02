/**
 * GET /api/status
 *
 * Returns the true cataloging state of every acquired document by
 * cross-referencing four sources:
 *   - raw/queue/ — files staged but not yet promoted (PENDING)
 *   - static/originals/ — files promoted into the cataloging zone
 *   - content/collection/sources/ — wiki pages produced by the catalog
 *   - GitHub Actions runs — workflows currently in flight
 *
 * States:
 *   PENDING      — file is in raw/queue/, not yet promoted. Awaiting its
 *                  turn behind whatever's currently cataloging (or about
 *                  to be promoted if nothing is). Removable via the
 *                  Acquisition page checkboxes.
 *   IN_PROGRESS  — file is in static/originals/, catalog workflow run
 *                  for it is actively executing.
 *   CATALOGED    — source page exists in the wiki for this file.
 *   FAILED       — file is in static/originals/, no source page exists,
 *                  no active run is processing it. Catalog ran (or never
 *                  started) and didn't produce a source page.
 *
 * The QUEUED state from the previous design is gone. With the unified
 * queue model, there is at most one file in static/originals/ at any
 * time (the one being cataloged), so we never have files waiting on
 * GitHub Actions concurrency — they're either cataloging now or they're
 * still in raw/queue/ as PENDING.
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
 * picking the longest one. Longest wins because it's the most specific.
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
 * Same shape as getOriginalsTimestamps, but for files in raw/queue/.
 * The commit message that lands a queue file is "upload: <filename>"
 * (web upload), "Acquire <filename> for cataloging" (MCP default), or
 * a custom commit_message (operator-supplied). All paths produce a
 * recognizable filename token in the message.
 */
async function getQueueTimestamps(
  token: string,
  repo: string,
): Promise<Map<string, string>> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?path=raw/queue&per_page=100`,
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
 * Fetch in-flight catalog runs and bucket them by the filename each is
 * processing. Each run targets exactly one file: the catalog workflow is
 * push-triggered on static/originals/**, so head_commit.message identifies
 * the file (via "promote from queue: <filename>" for queue-promoted files,
 * "upload: <filename>" for legacy direct uploads, or "Acquire <filename>
 * for cataloging" for legacy MCP).
 *
 * Returns one set keyed by extracted filename. Any file present is "active"
 * — it's the one currently being cataloged. With the queue model, this set
 * has at most one element at a time. We still query both in_progress and
 * queued statuses to cover the brief window between "run created" and
 * "runner allocated."
 */
async function getActiveRunFile(
  token: string,
  repo: string,
): Promise<Set<string>> {
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

  const out = new Set<string>()
  for (const run of [...inProgressData.workflow_runs, ...queuedData.workflow_runs]) {
    // Match the various commit-message templates we use:
    //   "promote from queue: <filename>"
    //   "upload: <filename>"
    //   anything else with a filename token
    const dt = run.display_title || ""
    const msg = run.head_commit?.message || ""
    const promoteMatch = (msg + " " + dt).match(/promote from queue:\s*(\S+)/)
    if (promoteMatch) {
      out.add(promoteMatch[1])
      continue
    }
    const uploadMatch = dt.match(/upload:\s*(.+)/)
    if (uploadMatch) {
      out.add(uploadMatch[1].trim())
      continue
    }
    const fname = extractFilename(msg) || extractFilename(dt)
    if (fname) out.add(fname)
  }
  return out
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const [originalsRes, sourcesRes, queueRes, activeRunFiles, originalsTimes, queueTimes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/static/originals`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/content/collection/sources`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/raw/queue`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      getActiveRunFile(GITHUB_TOKEN, GITHUB_REPO),
      getOriginalsTimestamps(GITHUB_TOKEN, GITHUB_REPO),
      getQueueTimestamps(GITHUB_TOKEN, GITHUB_REPO),
    ])

    const originalsRaw: GitHubFile[] = originalsRes.ok ? await originalsRes.json() : []
    const queueRaw: GitHubFile[] = queueRes.ok ? await queueRes.json() : []
    // Defensively strip any autolink wrapper off filenames.
    const originals: GitHubFile[] = originalsRaw.map(f => ({
      ...f,
      name: stripAutolink(f.name),
    }))
    const queueFiles: GitHubFile[] = queueRaw.map(f => ({
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

    // Helper: for a given filename, find the matching cataloged source-page
    // stem if any. The match is fuzzy because source pages are slugified
    // (lowercase, non-alphanumerics → hyphens) while originals preserve
    // original case and underscores.
    function findMatchingSourceStem(filename: string): string | null {
      const stem = filename.replace(/\.[^.]+$/, "")
      const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      const match = [...catalogedStems].find((s) => {
        const normalizedSource = s.toLowerCase()
        return normalizedSource.includes(normalizedStem) ||
          normalizedStem.includes(normalizedSource.replace(/^\d{4}-\d{2}-\d{2}-/, ""))
      })
      return match || null
    }

    // Helper: build the display name for a row. If a source page exists,
    // use its slug + the original file's extension (clean, in our control).
    // Otherwise, use the de-prefixed original filename.
    function displayName(filename: string, matchingStem: string | null): string {
      const dePrefixed = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "")
      if (!matchingStem) return dePrefixed
      const extMatch = filename.match(/\.([A-Za-z0-9]+)$/)
      const ext = extMatch ? "." + extMatch[1] : ""
      return matchingStem.replace(/^\d{4}-\d{2}-\d{2}-/, "") + ext
    }

    interface DocumentRow {
      document: string
      filename: string  // raw filename as it sits in the repo, used by the deletion endpoint
      location: "queue" | "originals"
      acquired: string | null
      acquiredAt: string | null
      status: "pending" | "in_progress" | "cataloged" | "failed"
    }

    const documents: DocumentRow[] = []

    // Pass 1: PENDING rows from raw/queue/
    for (const f of queueFiles) {
      if (f.type !== "file" || f.name === ".gitkeep") continue
      const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/)
      const dePrefixed = f.name.replace(/^\d{4}-\d{2}-\d{2}-/, "")
      documents.push({
        document: dePrefixed,
        filename: f.name,
        location: "queue",
        acquired: dateMatch ? dateMatch[1] : null,
        acquiredAt: queueTimes.get(f.name) || queueTimes.get(dePrefixed) || null,
        status: "pending",
      })
    }

    // Pass 2: rows from static/originals/ (IN_PROGRESS / CATALOGED / FAILED)
    for (const f of originals) {
      if (f.type !== "file" || f.name === ".gitkeep" || f.name === ".catalog-trigger") continue
      const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/)
      const dePrefixed = f.name.replace(/^\d{4}-\d{2}-\d{2}-/, "")
      const matchingStem = findMatchingSourceStem(f.name)
      const isCataloged = !!matchingStem
      const isActive =
        activeRunFiles.has(f.name) || activeRunFiles.has(dePrefixed)

      let status: DocumentRow["status"]
      if (isCataloged) {
        status = "cataloged"
      } else if (isActive) {
        status = "in_progress"
      } else {
        status = "failed"
      }

      documents.push({
        document: displayName(f.name, matchingStem),
        filename: f.name,
        location: "originals",
        acquired: dateMatch ? dateMatch[1] : null,
        acquiredAt: originalsTimes.get(f.name) || originalsTimes.get(dePrefixed) || null,
        status,
      })
    }

    // Sort: PENDING first (newest first within PENDING), then IN_PROGRESS,
    // then CATALOGED + FAILED interleaved by acquired-at desc.
    const STATUS_ORDER: Record<DocumentRow["status"], number> = {
      pending: 0,
      in_progress: 1,
      cataloged: 2,
      failed: 2,  // intermix with cataloged so the corpus is shown chronologically
    }
    documents.sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (so !== 0) return so
      const aKey = a.acquiredAt || a.acquired || ""
      const bKey = b.acquiredAt || b.acquired || ""
      return bKey.localeCompare(aKey)
    })

    // hasActive controls whether the frontend keeps polling. PENDING
    // counts as active because the queue is moving (or about to). The
    // poll cadence stays the same; the page just keeps refreshing while
    // there's anything in flight.
    const hasActive = documents.some(
      (d) => d.status === "in_progress" || d.status === "pending",
    )

    return Response.json({ documents, hasActive })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
