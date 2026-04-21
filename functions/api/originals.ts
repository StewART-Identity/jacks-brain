/**
 * GET /api/originals
 *
 * Lists files in static/originals/ and cross-references with content/recall/sources/
 * to determine cataloging status.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface GitHubFile {
  name: string
  path: string
  type: string
  size: number
  download_url: string
}

interface GitHubCommit {
  commit: {
    author: {
      date: string
    }
    message: string
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    // Fetch files in static/originals/
    const [originalsRes, sourcesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/static/originals`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "jacks-brain",
        },
      }),
      fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/content/recall/sources`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "jacks-brain",
        },
      }),
    ])

    const originals: GitHubFile[] = originalsRes.ok ? await originalsRes.json() : []
    const sources: GitHubFile[] = sourcesRes.ok ? await sourcesRes.json() : []

    // Build set of cataloged file stems (source pages match acquisition filenames)
    const catalogedStems = new Set(
      sources
        .filter((f) => f.name.endsWith(".md") && f.name !== ".gitkeep")
        .map((f) => f.name.replace(/\.md$/, ""))
    )

    // Filter out .gitkeep and build file list
    const files = originals
      .filter((f) => f.type === "file" && f.name !== ".gitkeep")
      .map((f) => {
        const stem = f.name.replace(/\.[^.]+$/, "")
        // Extract date from filename (YYYY-MM-DD prefix)
        const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/)
        const acquired = dateMatch ? dateMatch[1] : null
        const cataloged = catalogedStems.has(stem)

        return {
          name: f.name,
          downloadUrl: `/originals/${f.name}`,
          size: f.size,
          acquired,
          cataloged,
        }
      })
      .sort((a, b) => (b.acquired || "").localeCompare(a.acquired || ""))

    return Response.json({ files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
