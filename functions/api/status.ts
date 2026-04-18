/**
 * GET /api/status
 *
 * Returns the true ingestion state of each uploaded document by
 * cross-referencing static/originals/ files, content/recall/sources/
 * pages, and active workflow runs.
 *
 * States:
 *   INGESTED     — source page exists in the wiki
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

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "jacks-brain",
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const [originalsRes, sourcesRes, runsRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/static/originals`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/content/recall/sources`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ingest.yml/runs?per_page=10`,
        { headers: ghHeaders(GITHUB_TOKEN) },
      ),
    ])

    const originals: GitHubFile[] = originalsRes.ok ? await originalsRes.json() : []
    const sources: GitHubFile[] = sourcesRes.ok ? await sourcesRes.json() : []
    const runsData: GitHubRunsResponse = runsRes.ok
      ? await runsRes.json()
      : { workflow_runs: [] }

    // Build set of ingested source page stems
    const ingestedStems = new Set(
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
          f.name !== ".ingest-trigger",
      )
      .map((f) => {
        const stem = f.name.replace(/\.[^.]+$/, "")
        const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/)
        const uploaded = dateMatch ? dateMatch[1] : null

        // Check if this document has a source page (match by stem substring)
        const isIngested = [...ingestedStems].some((s) => {
          const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          const normalizedSource = s.toLowerCase()
          return normalizedSource.includes(normalizedStem) ||
            normalizedStem.includes(normalizedSource.replace(/^\d{4}-\d{2}-\d{2}-/, ""))
        })

        // Check if an active workflow is processing this file
        const isActive = activeDocNames.has(f.name) || (hasActiveRun && !isIngested)

        let status: string
        if (isIngested) {
          status = "ingested"
        } else if (activeRuns.some((r) => r.status === "in_progress") && isActive) {
          status = "in_progress"
        } else if (activeRuns.some((r) => r.status === "queued") && isActive) {
          status = "queued"
        } else if (!isIngested) {
          status = "failed"
        } else {
          status = "ingested"
        }

        return {
          document: f.name.replace(/^\d{4}-\d{2}-\d{2}-/, ""),
          uploaded,
          status,
        }
      })
      .sort((a, b) => (b.uploaded || "").localeCompare(a.uploaded || ""))

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
