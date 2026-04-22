/**
 * POST /api/nuke
 *
 * Deletes all wiki content from the GitHub repo using the Git Trees API.
 *
 * Strategy (5 subrequests total, independent of file count):
 *   1. GET  /git/refs/heads/main           — get current commit SHA
 *   2. GET  /git/commits/{sha}             — get the tree SHA from that commit
 *   3. GET  /git/trees/{sha}?recursive=1   — list all paths in the tree
 *   4. POST /git/trees                     — create new tree: mark target files
 *                                            deleted (sha: null), set 6 index
 *                                            files to fresh content (inline)
 *   5. POST /git/commits                   — create commit pointing at new tree
 *   6. PATCH /git/refs/heads/main          — move main to new commit
 *
 * Why Git Trees instead of Contents API: the Contents API needs one HTTP
 * request per file operation, which on a single Cloudflare Worker invocation
 * exceeds the subrequest cap once the wiki has 30+ files. Git Trees bundles
 * every file change into one POST, so this scales to any repo size.
 *
 * What gets deleted:
 *   - content/recall/sources/*.md       (except index.md)
 *   - content/recall/entities/*.md      (except index.md)
 *   - content/recall/concepts/*.md      (except index.md)
 *   - content/recall/synthesis/*.md     (except index.md)
 *   - static/originals/*                (all acquired document originals)
 *
 * What gets reset to empty templates:
 *   - content/index.md
 *   - content/learn/memory.md
 *   - content/recall/sources/index.md
 *   - content/recall/entities/index.md
 *   - content/recall/concepts/index.md
 *   - content/recall/synthesis/index.md
 *
 * Requires env vars:
 *   GITHUB_TOKEN — fine-grained PAT with contents:write
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface RefResponse {
  object: { sha: string }
}

interface CommitResponse {
  tree: { sha: string }
}

interface TreeEntry {
  path: string
  mode: string
  type: string
  sha?: string | null
  content?: string
}

interface TreeResponse {
  sha: string
  tree: TreeEntry[]
  truncated: boolean
}

interface NewTreeResponse {
  sha: string
}

interface NewCommitResponse {
  sha: string
}

const BRANCH = "main"

// Directories whose contents (except index.md) should be wiped clean.
// These are the "content" directories cataloging writes to.
const WIPE_DIRS = [
  "content/recall/sources/",
  "content/recall/entities/",
  "content/recall/concepts/",
  "content/recall/synthesis/",
  "static/originals/",
]

// Files that should be reset to empty-state templates (not deleted).
// These anchor the UI — deleting them would 404 the navigation.
const RESET_TEMPLATES: Record<string, string> = {
  "content/index.md":
    `---\ntitle: "Jack's Brain"\n---\n\nWelcome to the knowledge wiki. Use the sidebar to navigate.\n\n- **[[learn/knowledge|Knowledge]]** — Upload files and videos to catalog\n- **[[learn/memory|Memory]]** — Chronological record of cataloging activity\n- **[[recall/sources|Sources]]** — Summaries of cataloged documents\n- **[[recall/entities|Entities]]** — People, organizations, tools, systems\n- **[[recall/concepts|Concepts]]** — Ideas, theories, frameworks\n- **[[recall/synthesis|Synthesis]]** — Cross-cutting analysis\n- **[[visualize/graph-view|Graph View]]** — Interactive map of connections\n`,

  "content/learn/memory.md":
    `---\ntitle: "Memory"\n---\n\nPermanent record of knowledge added to the wiki, organized by date.\n\n| Date | Action | Details |\n|------|--------|--------|\n`,

  "content/recall/sources/index.md":
    `---\ntitle: "Sources"\n---\n\nAcquired documents and their cataloging status. Click a filename to download the original.\n\n| Content | Summary | Date |\n|---------|---------|------|\n`,

  "content/recall/entities/index.md":
    `---\ntitle: "Entities"\n---\n\nPeople, organizations, tools, and systems referenced across sources.\n\n| Content | Summary |\n|---------|--------|\n`,

  "content/recall/concepts/index.md":
    `---\ntitle: "Concepts"\n---\n\nIdeas, theories, frameworks, and principles extracted from sources.\n\n| Content | Summary |\n|---------|--------|\n`,

  "content/recall/synthesis/index.md":
    `---\ntitle: "Synthesis"\n---\n\nCross-cutting analysis, comparisons, and theses drawn from multiple sources.\n\n| Content | Summary | Date |\n|---------|---------|------|\n`,
}

// ─── HTTP helper ───────────────────────────────────────────────────────────

async function ghFetch(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "jacks-brain-nuke",
      "X-GitHub-Api-Version": "2022-11-28",
      ...((options.headers as Record<string, string>) || {}),
    },
  })
}

// ─── Endpoint ──────────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}`

  try {
    // ── Subrequest 1: current commit SHA ──────────────────────────────────
    const refRes = await ghFetch(`${api}/git/ref/heads/${BRANCH}`, GITHUB_TOKEN)
    if (!refRes.ok) {
      const text = await refRes.text()
      return Response.json(
        { error: `Failed to read branch ref: ${refRes.status} ${text}` },
        { status: 500 },
      )
    }
    const ref: RefResponse = await refRes.json()
    const currentCommitSha = ref.object.sha

    // ── Subrequest 2: tree SHA from that commit ───────────────────────────
    const commitRes = await ghFetch(
      `${api}/git/commits/${currentCommitSha}`,
      GITHUB_TOKEN,
    )
    if (!commitRes.ok) {
      const text = await commitRes.text()
      return Response.json(
        { error: `Failed to read commit: ${commitRes.status} ${text}` },
        { status: 500 },
      )
    }
    const commit: CommitResponse = await commitRes.json()
    const baseTreeSha = commit.tree.sha

    // ── Subrequest 3: full tree (recursive) ───────────────────────────────
    const treeRes = await ghFetch(
      `${api}/git/trees/${baseTreeSha}?recursive=1`,
      GITHUB_TOKEN,
    )
    if (!treeRes.ok) {
      const text = await treeRes.text()
      return Response.json(
        { error: `Failed to read tree: ${treeRes.status} ${text}` },
        { status: 500 },
      )
    }
    const tree: TreeResponse = await treeRes.json()

    if (tree.truncated) {
      // 100k paths / 7 MB ceiling; far beyond what this wiki will ever hit.
      // If we do hit it, pagination requires per-subtree fetches, which
      // defeats the whole point of this rewrite.
      return Response.json(
        { error: "Tree response truncated — repo too large for single-shot nuke" },
        { status: 500 },
      )
    }

    // ── Build new-tree changeset ──────────────────────────────────────────
    // Two kinds of entries:
    //   - Files under WIPE_DIRS (except index.md): sha=null → delete
    //   - Files in RESET_TEMPLATES: content=<template> → overwrite
    //
    // Entries NOT in this changeset are inherited from base_tree unchanged.

    const changes: TreeEntry[] = []
    let toDelete = 0

    for (const entry of tree.tree) {
      if (entry.type !== "blob") continue
      if (!entry.path) continue

      // Skip anything under a WIPE_DIR that isn't index.md
      const inWipeDir = WIPE_DIRS.some((dir) => entry.path.startsWith(dir))
      const isIndex = entry.path.endsWith("/index.md")

      if (inWipeDir && !isIndex) {
        // Mark for deletion (sha: null is the wire signal)
        changes.push({
          path: entry.path,
          mode: entry.mode,
          type: "blob",
          sha: null,
        })
        toDelete++
      }
    }

    // Add the 6 index-file resets as inline content
    for (const [path, content] of Object.entries(RESET_TEMPLATES)) {
      changes.push({
        path,
        mode: "100644",
        type: "blob",
        content,
      })
    }

    if (changes.length === 0) {
      return Response.json({
        success: true,
        deleted: 0,
        message: "Nothing to nuke — repo already clean.",
      })
    }

    // ── Subrequest 4: create new tree ─────────────────────────────────────
    //
    // JSON.stringify would drop `sha: null` if we used sha?: string | null
    // with omitempty semantics — but we're building the object inline, so
    // explicit `null` serializes correctly as `"sha": null`. This is what
    // the Retool blog warns about: tree-builder libraries in other
    // languages serialize `null` fields as missing fields.
    const newTreeRes = await ghFetch(`${api}/git/trees`, GITHUB_TOKEN, {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: changes,
      }),
    })
    if (!newTreeRes.ok) {
      const text = await newTreeRes.text()
      return Response.json(
        { error: `Failed to create tree: ${newTreeRes.status} ${text}` },
        { status: 500 },
      )
    }
    const newTree: NewTreeResponse = await newTreeRes.json()

    // ── Subrequest 5: create commit ───────────────────────────────────────
    const newCommitRes = await ghFetch(`${api}/git/commits`, GITHUB_TOKEN, {
      method: "POST",
      body: JSON.stringify({
        message: `nuke: wipe wiki content (${toDelete} files deleted, 6 templates reset)`,
        tree: newTree.sha,
        parents: [currentCommitSha],
      }),
    })
    if (!newCommitRes.ok) {
      const text = await newCommitRes.text()
      return Response.json(
        { error: `Failed to create commit: ${newCommitRes.status} ${text}` },
        { status: 500 },
      )
    }
    const newCommit: NewCommitResponse = await newCommitRes.json()

    // ── Subrequest 6: update branch ref ───────────────────────────────────
    const patchRes = await ghFetch(
      `${api}/git/refs/heads/${BRANCH}`,
      GITHUB_TOKEN,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: newCommit.sha,
          force: false,
        }),
      },
    )
    if (!patchRes.ok) {
      const text = await patchRes.text()
      return Response.json(
        { error: `Failed to update branch: ${patchRes.status} ${text}` },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      deleted: toDelete,
      commit: newCommit.sha,
      message: `Deleted ${toDelete} files. Reset 6 template files. New commit: ${newCommit.sha.slice(0, 7)}`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

