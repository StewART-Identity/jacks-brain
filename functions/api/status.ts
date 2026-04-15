/**
 * GET /api/status
 *
 * Returns recent ingest workflow runs so the UI can show progress.
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
  status: string
  conclusion: string | null
  html_url: string
  created_at: string
  updated_at: string
}

interface GitHubRunsResponse {
  workflow_runs: WorkflowRun[]
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    // Fetch recent runs for both ingest workflows
    const [ingestRuns, youtubeRuns] = await Promise.all([
      fetchRuns(GITHUB_TOKEN, GITHUB_REPO, "ingest.yml"),
      fetchRuns(GITHUB_TOKEN, GITHUB_REPO, "youtube-ingest.yml"),
    ])

    // Merge and sort by date, take 10 most recent
    const allRuns = [...ingestRuns, ...youtubeRuns]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((run) => ({
        id: run.id,
        name: run.name,
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
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=5`,
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
