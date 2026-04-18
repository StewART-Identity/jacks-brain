/**
 * POST /api/nuke
 *
 * Deletes all wiki content from the GitHub repo:
 *   - content/recall/sources/, entities/, concepts/, synthesis/ (wiki pages)
 *   - static/originals/ (uploaded documents)
 *   - Resets content/index.md, content/learn/memory.md to empty state
 *
 * Requires env vars:
 *   GITHUB_TOKEN — fine-grained PAT with contents:write
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface GitHubFile {
  name: string
  path: string
  sha: string
  type: string
}

async function ghFetch(url: string, token: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "jacks-brain-nuke",
      ...((options.headers as Record<string, string>) || {}),
    },
  })
}

async function listFiles(repo: string, token: string, path: string): Promise<GitHubFile[]> {
  const res = await ghFetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    token,
  )
  if (!res.ok) return []
  const items: GitHubFile[] = await res.json()
  return items.filter((f) => f.type === "file" && f.name !== ".gitkeep" && f.name !== "index.md")
}

async function deleteFile(repo: string, token: string, path: string, sha: string, message: string) {
  return ghFetch(`https://api.github.com/repos/${repo}/contents/${path}`, token, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: "main" }),
  })
}

async function updateFile(
  repo: string,
  token: string,
  path: string,
  content: string,
  message: string,
) {
  const getRes = await ghFetch(`https://api.github.com/repos/${repo}/contents/${path}`, token)
  if (!getRes.ok) return
  const file: { sha: string } = await getRes.json()

  return ghFetch(`https://api.github.com/repos/${repo}/contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: btoa(content),
      sha: file.sha,
      branch: "main",
    }),
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  try {
    const dirs = [
      "content/recall/sources",
      "content/recall/entities",
      "content/recall/concepts",
      "content/recall/synthesis",
      "static/originals",
    ]

    let deleted = 0

    for (const dir of dirs) {
      const files = await listFiles(GITHUB_REPO, GITHUB_TOKEN, dir)
      for (const file of files) {
        const res = await deleteFile(
          GITHUB_REPO,
          GITHUB_TOKEN,
          file.path,
          file.sha,
          `nuke: delete ${file.path}`,
        )
        if (res.ok) deleted++
      }
    }

    const emptyIndex = `---\ntitle: "Jack's Brain"\n---\n\nWelcome to the knowledge wiki. Use the sidebar to navigate.\n\n- **[[learn/knowledge|Knowledge]]** — Upload files and videos to ingest\n- **[[learn/memory|Memory]]** — Chronological record of ingestions\n- **[[recall/sources|Sources]]** — Summaries of ingested documents\n- **[[recall/entities|Entities]]** — People, organizations, tools, systems\n- **[[recall/concepts|Concepts]]** — Ideas, theories, frameworks\n- **[[recall/synthesis|Synthesis]]** — Cross-cutting analysis\n- **[[visualize/graph-view|Graph View]]** — Interactive map of connections\n`

    const emptyMemory = `---\ntitle: "Memory"\n---\n\nPermanent record of knowledge added to the wiki, organized by date.\n\n| Date | Action | Details |\n|------|--------|--------|\n`

    const emptySources = `---\ntitle: "Sources"\n---\n\nUploaded documents and their ingestion status. Click a filename to download the original.\n\n| Content | Summary | Date |\n|---------|---------|------|\n`

    const emptyEntities = `---\ntitle: "Entities"\n---\n\nPeople, organizations, tools, and systems referenced across sources.\n\n| Content | Summary |\n|---------|--------|\n`

    const emptyConcepts = `---\ntitle: "Concepts"\n---\n\nIdeas, theories, frameworks, and principles extracted from sources.\n\n| Content | Summary |\n|---------|--------|\n`

    const emptySynthesis = `---\ntitle: "Synthesis"\n---\n\nCross-cutting analysis, comparisons, and theses drawn from multiple sources.\n\n| Content | Summary | Date |\n|---------|---------|------|\n`

    await Promise.all([
      updateFile(GITHUB_REPO, GITHUB_TOKEN, "content/index.md", emptyIndex, "nuke: reset index"),
      updateFile(GITHUB_REPO, GITHUB_TOKEN, "content/learn/memory.md", emptyMemory, "nuke: reset memory"),
      updateFile(GITHUB_REPO, GITHUB_TOKEN, "content/recall/sources/index.md", emptySources, "nuke: reset sources"),
      updateFile(GITHUB_REPO, GITHUB_TOKEN, "content/recall/entities/index.md", emptyEntities, "nuke: reset entities"),
      updateFile(GITHUB_REPO, GITHUB_TOKEN, "content/recall/concepts/index.md", emptyConcepts, "nuke: reset concepts"),
      updateFile(GITHUB_REPO, GITHUB_TOKEN, "content/recall/synthesis/index.md", emptySynthesis, "nuke: reset synthesis"),
    ])

    return Response.json({
      success: true,
      deleted,
      message: `Deleted ${deleted} files. Reset index, memory, and listing pages.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
