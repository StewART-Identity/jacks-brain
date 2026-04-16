/**
 * GET /api/status
 *
 * Returns recent document processing workflow runs.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   GITHUB_TOKEN  — fine-grained PAT with actions:read
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface WorkflowRun {
  id: number
  name: string
  display_title: string
  status: string
  conclusion: string | null
  html_url: string
  created_at: string
  updated_at: string
  head_commit: {
    message: string
  } | null
}

interface GitHubRunsResponse {
  workflow_runs: WorkflowRun[]
}

function extractDocumentName(run: WorkflowRun): string {
  // Try display_title first (shows commit message for push-triggered runs)
  const title = run.display_title || ""

  // "upload: 2026-04-16-MyDocument.docx" → "MyDocument.docx"
  const uploadMatch = title.match(/upload:\s*(.+)/)
  if (uploadMatch) {
    // Strip date prefix if present
    return uploadMatch[1].replace(/^\d{4}-\d{2}-\d{2}-/, "").trim()
  }

  // Check head_commit message
  const commitMsg = run.head_commit?.message || ""
  const commitMatch = commitMsg.match(/upload:\s*(.+)/)
  if (commitMatch) {
    return commitMatch[1].replace(/^\d{4}-\d{2}-\d{2}-/, "").trim()
  }

  // Fallback to workflow name
  return run.name
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const [ingestRuns, youtubeRuns] = await Promise.all([
      fetchRuns(GITHUB_TOKEN, GITHUB_REPO, "ingest.yml"),
      fetchRuns(GITHUB_TOKEN, GITHUB_REPO, "youtube-ingest.yml"),
    ])

    const allRuns = [...ingestRuns, ...youtubeRuns]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map((run) => ({
        id: run.id,
        document: extractDocumentName(run),
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        created: run.created_at,
        updated: run.updated_at,
      }))

    return Response.json({ runs: allRuns })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

async function fetchRuns(token: string, repo: string, workflow: string): Promise<WorkflowRun[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "jacks-brain-upload",
      },
    }
  )

  if (!response.ok) return []
  const data = (await response.json()) as GitHubRunsResponse
  return data.workflow_runs || []
}
