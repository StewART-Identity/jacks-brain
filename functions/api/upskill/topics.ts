/**
 * /api/upskill/topics — list and create Upskill topics.
 *
 * GET  /api/upskill/topics        → list all topics, sorted by order
 * POST /api/upskill/topics        → create a new topic from {title, slug, order, summary}
 *
 * A topic is stored as TWO files committed atomically:
 *
 *   data/upskill/<slug>/meta.json             — descriptor for the
 *                                                sidebar emitter
 *   content/upskill/<slug>/index.md           — the topic's landing
 *                                                page (gets the full
 *                                                Quartz pipeline:
 *                                                breadcrumbs, dates,
 *                                                folder-content listing
 *                                                of study material)
 *
 * Keeping these in sync is the API's job; that's why this endpoint
 * uses a tree-based multi-file commit rather than two sequential
 * Contents-API PUTs. If the second write failed after the first
 * succeeded, the topic would be in a half-state (sidebar entry
 * without a landing page, or vice versa). The atomic commit avoids
 * that class of bug.
 *
 * Auth and env-var contract is identical to notes.ts.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

const BRANCH = "main"
const DATA_DIR = "data/upskill"
const CONTENT_DIR = "content/upskill"

interface TopicSummary {
  slug: string
  title: string
  order: number
  summary: string
  hidden: boolean
}

/* ───── Frontmatter / YAML helpers (lifted from notes.ts) ─────────── */

function escapeYamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`
}

function isValidTopicSlug(slug: string): boolean {
  // Kebab-case, must start with a letter, only [a-z0-9-] thereafter.
  // Forbids leading numbers (URLs that begin with a digit feel odd)
  // and forbids consecutive dashes (a-style guard).
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) return false
  if (slug.includes("--")) return false
  if (slug.endsWith("-")) return false
  // Reserved slugs that would collide with section pages.
  if (slug === "manage" || slug === "index") return false
  return true
}

/**
 * Build the meta.json contents for a topic. Stable ordering of keys
 * so the file diffs cleanly between updates.
 */
function buildMetaJson(opts: {
  slug: string
  title: string
  order: number
  summary: string
  hidden?: boolean
}): string {
  const obj: Record<string, unknown> = {
    slug: opts.slug,
    title: opts.title,
    order: opts.order,
    summary: opts.summary,
  }
  if (opts.hidden) obj.hidden = true
  return JSON.stringify(obj, null, 2) + "\n"
}

/**
 * Build the content/upskill/<slug>/index.md shim. This is a real Quartz
 * page — gets breadcrumbs, dates, FolderContent listing for free.
 *
 * The body is the summary as a single paragraph followed by a marker
 * comment. The marker isn't strictly necessary, but if someone hand-
 * edits this file later to add a longer intro, the marker tells future
 * us (and future Claude) "this section is regenerated, that section is
 * yours." For now we don't regenerate on edit; the marker is just a
 * forward-compatibility hedge.
 */
function buildTopicLandingMarkdown(opts: {
  title: string
  summary: string
  created: string
}): string {
  const tagList = "[]"
  const lines = [
    "---",
    `title: ${escapeYamlString(opts.title)}`,
    `created: ${opts.created}`,
    `modified: ${opts.created}`,
    `tags: ${tagList}`,
    "---",
    "",
    opts.summary,
    "",
  ]
  return lines.join("\n")
}

function isoNow(): string {
  return new Date().toISOString()
}

/* ───── GitHub helpers ────────────────────────────────────────────── */

interface GhEntry {
  name: string
  path: string
  type: "file" | "dir"
  sha: string
  size: number
}

async function ghListDir(env: Env, path: string): Promise<GhEntry[]> {
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "jacks-brain-upskill",
      },
    },
  )
  if (res.status === 404) return []
  if (!res.ok) {
    throw new Error(`GitHub list failed: ${res.status}`)
  }
  const body = await res.json()
  if (!Array.isArray(body)) return []
  return body as GhEntry[]
}

async function ghReadFileRaw(env: Env, path: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "jacks-brain-upskill",
      },
    },
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`GitHub read failed: ${res.status}`)
  }
  return await res.text()
}

/**
 * Multi-file commit via the Git Data API (refs/commits/trees/blobs).
 * The Contents API only allows one file per call. For atomic two-file
 * topic creation we need to:
 *   1. Get the current ref → commit sha
 *   2. Get the current commit → tree sha
 *   3. Create a new tree with our two files merged in
 *   4. Create a commit pointing at that tree
 *   5. Update the ref to the new commit
 *
 * This is the standard "GitHub multi-file commit" pattern. Documented
 * here because we'll reuse it in topics/[slug].ts too.
 */
async function ghCommitMultipleFiles(
  env: Env,
  files: Array<{ path: string; content: string }>,
  message: string,
): Promise<{ commitSha: string }> {
  const base = `https://api.github.com/repos/${env.GITHUB_REPO}`
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "jacks-brain-upskill",
  }

  // 1. Current ref
  const refRes = await fetch(`${base}/git/refs/heads/${BRANCH}`, { headers })
  if (!refRes.ok) throw new Error(`Get ref failed: ${refRes.status}`)
  const ref = (await refRes.json()) as { object: { sha: string } }
  const parentCommitSha = ref.object.sha

  // 2. Current commit → tree
  const commitRes = await fetch(`${base}/git/commits/${parentCommitSha}`, { headers })
  if (!commitRes.ok) throw new Error(`Get commit failed: ${commitRes.status}`)
  const commit = (await commitRes.json()) as { tree: { sha: string } }
  const baseTreeSha = commit.tree.sha

  // 3. New tree
  const treeRes = await fetch(`${base}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: files.map((f) => ({
        path: f.path,
        mode: "100644",
        type: "blob",
        content: f.content,
      })),
    }),
  })
  if (!treeRes.ok) {
    const err = await treeRes.text()
    throw new Error(`Create tree failed: ${treeRes.status} ${err}`)
  }
  const tree = (await treeRes.json()) as { sha: string }

  // 4. New commit
  const newCommitRes = await fetch(`${base}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [parentCommitSha],
    }),
  })
  if (!newCommitRes.ok) {
    const err = await newCommitRes.text()
    throw new Error(`Create commit failed: ${newCommitRes.status} ${err}`)
  }
  const newCommit = (await newCommitRes.json()) as { sha: string }

  // 5. Update ref
  const updateRes = await fetch(`${base}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  })
  if (!updateRes.ok) {
    const err = await updateRes.text()
    throw new Error(`Update ref failed: ${updateRes.status} ${err}`)
  }

  return { commitSha: newCommit.sha }
}

/* ───── Auth preflight ────────────────────────────────────────────── */

function preflight(env: Env, headers: Headers): Response | null {
  const accessUser = headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return Response.json(
      { error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" },
      { status: 500 },
    )
  }
  return null
}

/* ───── GET — list all topics ─────────────────────────────────────── */

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const pre = preflight(context.env, context.request.headers)
  if (pre) return pre

  try {
    const entries = await ghListDir(context.env, DATA_DIR)
    const topicDirs = entries.filter((e) => e.type === "dir")

    const topics: TopicSummary[] = []
    for (const dir of topicDirs) {
      const slug = dir.name
      const raw = await ghReadFileRaw(context.env, `${DATA_DIR}/${slug}/meta.json`)
      if (!raw) continue // Subdirectory without meta.json — not yet a topic.
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        continue
      }
      if (!parsed || typeof parsed !== "object") continue
      const m = parsed as Record<string, unknown>
      topics.push({
        slug,
        title: typeof m.title === "string" ? m.title : slug,
        order: typeof m.order === "number" && Number.isFinite(m.order) ? m.order : 9999,
        summary: typeof m.summary === "string" ? m.summary : "",
        hidden: m.hidden === true,
      })
    }

    topics.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      return a.slug.localeCompare(b.slug)
    })

    return Response.json({ topics })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ───── POST — create a new topic ─────────────────────────────────── */

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const pre = preflight(context.env, context.request.headers)
  if (pre) return pre

  try {
    const body = (await context.request.json()) as {
      title?: string
      slug?: string
      order?: number
      summary?: string
    }

    const title = (body.title ?? "").trim()
    const slug = (body.slug ?? "").trim().toLowerCase()
    const summary = (body.summary ?? "").trim()
    const orderRaw = body.order
    const order =
      typeof orderRaw === "number" && Number.isFinite(orderRaw)
        ? Math.floor(orderRaw)
        : NaN

    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 })
    }
    if (!slug) {
      return Response.json({ error: "Slug is required" }, { status: 400 })
    }
    if (!isValidTopicSlug(slug)) {
      return Response.json(
        {
          error:
            "Slug must be lowercase kebab-case, start with a letter, and not be 'manage' or 'index'.",
        },
        { status: 400 },
      )
    }
    if (!Number.isFinite(order)) {
      return Response.json({ error: "Order must be a number" }, { status: 400 })
    }

    // Uniqueness check — refuse if meta.json already exists.
    const existing = await ghReadFileRaw(
      context.env,
      `${DATA_DIR}/${slug}/meta.json`,
    )
    if (existing !== null) {
      return Response.json(
        { error: `A topic with slug "${slug}" already exists` },
        { status: 409 },
      )
    }

    const created = isoNow()
    const metaPath = `${DATA_DIR}/${slug}/meta.json`
    const landingPath = `${CONTENT_DIR}/${slug}/index.md`
    const metaContent = buildMetaJson({ slug, title, order, summary })
    const landingContent = buildTopicLandingMarkdown({ title, summary, created })

    await ghCommitMultipleFiles(
      context.env,
      [
        { path: metaPath, content: metaContent },
        { path: landingPath, content: landingContent },
      ],
      `upskill: create topic ${slug} (${title})`,
    )

    return Response.json({
      success: true,
      slug,
      title,
      order,
      summary,
      url: `/upskill/${slug}`,
      message: `Topic created. The next Quartz build (~30s) will publish the page and update the sidebar.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export {
  isValidTopicSlug,
  buildMetaJson,
  buildTopicLandingMarkdown,
  ghReadFileRaw,
  ghListDir,
  ghCommitMultipleFiles,
  DATA_DIR,
  CONTENT_DIR,
  BRANCH,
}
