/**
 * GET /api/status
 *
 * Returns the cataloging state of every acquired document by reading
 * three directories:
 *   - static/queue/ — files staged but not yet promoted (PENDING)
 *   - static/in-flight/ — file currently being cataloged (IN_PROGRESS)
 *   - static/originals/ — completed corpus
 *
 * States:
 *   PENDING      — file is in static/queue/. Removable via the
 *                  Acquisition page checkboxes.
 *   IN_PROGRESS  — file is in static/in-flight/. Catalog workflow is
 *                  actively executing on it. At most one at a time.
 *   CATALOGED    — file is in static/originals/ AND a matching wiki
 *                  source page exists.
 *   FAILED       — file is in static/originals/, no matching source
 *                  page, no in-flight presence. Catalog ran (possibly
 *                  failed) and didn't produce wiki output.
 *
 * The "is something currently in flight" signal is the static/in-flight/
 * directory itself. This is more reliable than querying the GitHub
 * Actions API: the directory changes atomically with the workflow's git
 * operations, and it doesn't have the API-status-update latency window.
 *
 * Required env vars:
 *   GITHUB_TOKEN  — fine-grained PAT with contents:read
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

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    committer: { date: string }
  }
}

const FILENAME_RE = /([A-Za-z0-9._-]+\.(?:md|png|jpg|jpeg|gif|webp|pdf|docx|pptx|xlsx|csv|txt|html|json|mp4|mov|webm))/gi

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "jacks-brain",
  }
}

function stripAutolink(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
}

function extractFilename(s: string): string | null {
  if (!s) return null
  const matches = [...s.matchAll(FILENAME_RE)].map(m => m[1])
  if (matches.length === 0) return null
  matches.sort((a, b) => b.length - a.length)
  return stripAutolink(matches[0])
}

/**
 * Build a {filename → ISO timestamp} map by walking commit messages
 * for a directory. The first time we see a filename token (since we
 * walk newest-first), that's its most recent commit timestamp. Used to
 * order rows by actual acquisition time rather than by the date encoded
 * in the filename, which can be stale or missing.
 */
async function getDirTimestamps(
  token: string,
  repo: string,
  path: string,
): Promise<Map<string, string>> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?path=${path}&per_page=100`,
    { headers: ghHeaders(token) },
  )
  if (!res.ok) return new Map()
  const commits: GitHubCommit[] = await res.json()
  const out = new Map<string, string>()
  for (const c of commits) {
    const filename = extractFilename(c.commit.message)
    if (!filename) continue
    if (!out.has(filename)) out.set(filename, c.commit.committer.date)
  }
  return out
}

async function listDir(
  token: string,
  repo: string,
  path: string,
): Promise<GitHubFile[]> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: ghHeaders(token) },
  )
  if (!res.ok) return []
  const items: GitHubFile[] = await res.json()
  // Defensively strip autolink wrappers off filenames.
  return items.map(f => ({ ...f, name: stripAutolink(f.name) }))
}

interface DocumentRow {
  document: string
  filename: string
  location: "queue" | "in-flight" | "originals"
  acquired: string | null
  acquiredAt: string | null
  status: "pending" | "in_progress" | "cataloged" | "failed"
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const [queueFiles, inFlightFiles, originalFiles, sources, queueTimes, inFlightTimes, originalsTimes] =
      await Promise.all([
        listDir(GITHUB_TOKEN, GITHUB_REPO, "static/queue"),
        listDir(GITHUB_TOKEN, GITHUB_REPO, "static/in-flight"),
        listDir(GITHUB_TOKEN, GITHUB_REPO, "static/originals"),
        listDir(GITHUB_TOKEN, GITHUB_REPO, "content/collection/sources"),
        getDirTimestamps(GITHUB_TOKEN, GITHUB_REPO, "static/queue"),
        getDirTimestamps(GITHUB_TOKEN, GITHUB_REPO, "static/in-flight"),
        getDirTimestamps(GITHUB_TOKEN, GITHUB_REPO, "static/originals"),
      ])

    const catalogedStems = new Set(
      sources
        .filter(f => f.name.endsWith(".md") && f.name !== "index.md")
        .map(f => f.name.replace(/\.md$/, "")),
    )

    function findMatchingSourceStem(filename: string): string | null {
      const stem = filename.replace(/\.[^.]+$/, "")
      const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      const match = [...catalogedStems].find(s => {
        const ns = s.toLowerCase()
        return ns.includes(normalizedStem) ||
          normalizedStem.includes(ns.replace(/^\d{4}-\d{2}-\d{2}-/, ""))
      })
      return match || null
    }

    function displayName(filename: string, matchingStem: string | null): string {
      const dePrefixed = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "")
      if (!matchingStem) return dePrefixed
      const extMatch = filename.match(/\.([A-Za-z0-9]+)$/)
      const ext = extMatch ? "." + extMatch[1] : ""
      return matchingStem.replace(/^\d{4}-\d{2}-\d{2}-/, "") + ext
    }

    function rowFromFile(
      f: GitHubFile,
      location: DocumentRow["location"],
      times: Map<string, string>,
      status: DocumentRow["status"],
      matchingStem: string | null = null,
    ): DocumentRow {
      const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/)
      const dePrefixed = f.name.replace(/^\d{4}-\d{2}-\d{2}-/, "")
      return {
        document: status === "cataloged" || status === "failed"
          ? displayName(f.name, matchingStem)
          : dePrefixed,
        filename: f.name,
        location,
        acquired: dateMatch ? dateMatch[1] : null,
        acquiredAt: times.get(f.name) || times.get(dePrefixed) || null,
        status,
      }
    }

    const documents: DocumentRow[] = []

    // PENDING — files in static/queue/.
    for (const f of queueFiles) {
      if (f.type !== "file" || f.name === ".gitkeep") continue
      documents.push(rowFromFile(f, "queue", queueTimes, "pending"))
    }

    // IN_PROGRESS — files in static/in-flight/.
    for (const f of inFlightFiles) {
      if (f.type !== "file" || f.name === ".gitkeep") continue
      documents.push(rowFromFile(f, "in-flight", inFlightTimes, "in_progress"))
    }

    // CATALOGED / FAILED — files in static/originals/.
    for (const f of originalFiles) {
      if (f.type !== "file" || f.name === ".gitkeep" || f.name === ".catalog-trigger") continue
      const matchingStem = findMatchingSourceStem(f.name)
      const status: DocumentRow["status"] = matchingStem ? "cataloged" : "failed"
      documents.push(rowFromFile(f, "originals", originalsTimes, status, matchingStem))
    }

    // Sort: PENDING (newest first), then IN_PROGRESS, then CATALOGED+FAILED
    // interleaved by acquired time newest first.
    const STATUS_ORDER: Record<DocumentRow["status"], number> = {
      pending: 0,
      in_progress: 1,
      cataloged: 2,
      failed: 2,
    }
    documents.sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (so !== 0) return so
      const aKey = a.acquiredAt || a.acquired || ""
      const bKey = b.acquiredAt || b.acquired || ""
      return bKey.localeCompare(aKey)
    })

    // Active = anything in-flight or pending. The frontend polls while
    // active is true.
    const hasActive = documents.some(
      d => d.status === "in_progress" || d.status === "pending",
    )

    return Response.json({ documents, hasActive })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
