/**
 * /api/upskill/topics/:slug — read, update, delete a single topic.
 *
 * GET    → return the topic's meta.json contents
 * PUT    → body {title, order, summary, hidden} → update meta.json
 *          (slug is immutable — that's the URL)
 * DELETE → remove the topic's meta.json AND its content/upskill/<slug>/
 *          landing page. Study pages under content/upskill/<slug>/
 *          OTHER than index.md are preserved — soft deletion of the
 *          topic, not destruction of the content.
 *
 * Same multi-file commit pattern as the POST in topics.ts. Same auth
 * and env-var contract.
 *
 * Note on PUT: an update only touches data/upskill/<slug>/meta.json.
 * The landing page at content/upskill/<slug>/index.md is NOT
 * automatically rewritten on rename, because we don't know whether the
 * user has manually edited the landing-page body since creation. If
 * the title changes here, the wiki page title (in the index.md
 * frontmatter) drifts from the sidebar title — that's a tradeoff in
 * favor of preserving user edits.
 *
 * For sidebar visibility toggling, set hidden: true via PUT.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

const BRANCH = "main"
const DATA_DIR = "data/upskill"
const CONTENT_DIR = "content/upskill"

function isValidTopicSlug(slug: string): boolean {
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) return false
  if (slug.includes("--")) return false
  if (slug.endsWith("-")) return false
  if (slug === "manage" || slug === "index") return false
  return true
}

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

interface GhFile {
  sha: string
  content: string
  encoding: string
}

async function ghReadFileMeta(env: Env, path: string): Promise<GhFile | null> {
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
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`GitHub read failed: ${res.status}`)
  }
  return (await res.json()) as GhFile
}

function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s/g, "")
  const bytes = atob(clean)
  return decodeURIComponent(escape(bytes))
}

function encodeBase64Utf8(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

function preflight(env: Env, headers: Headers, slug: string): Response | null {
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
  if (!isValidTopicSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 })
  }
  return null
}

/* ───── GET ───────────────────────────────────────────────────────── */

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = (context.params.slug as string) ?? ""
  const pre = preflight(context.env, context.request.headers, slug)
  if (pre) return pre

  try {
    const meta = await ghReadFileMeta(
      context.env,
      `${DATA_DIR}/${slug}/meta.json`,
    )
    if (!meta) {
      return Response.json({ error: "Topic not found" }, { status: 404 })
    }
    const raw = decodeBase64Utf8(meta.content)
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return Response.json(
        { error: "meta.json is not valid JSON on disk" },
        { status: 500 },
      )
    }
    if (!parsed || typeof parsed !== "object") {
      return Response.json(
        { error: "meta.json did not parse to an object" },
        { status: 500 },
      )
    }
    const m = parsed as Record<string, unknown>
    return Response.json({
      slug,
      title: typeof m.title === "string" ? m.title : slug,
      order: typeof m.order === "number" && Number.isFinite(m.order) ? m.order : 9999,
      summary: typeof m.summary === "string" ? m.summary : "",
      hidden: m.hidden === true,
      sha: meta.sha,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ───── PUT — update meta.json ────────────────────────────────────── */

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const slug = (context.params.slug as string) ?? ""
  const pre = preflight(context.env, context.request.headers, slug)
  if (pre) return pre

  try {
    const body = (await context.request.json()) as {
      title?: string
      order?: number
      summary?: string
      hidden?: boolean
    }
    const title = (body.title ?? "").trim()
    const summary = (body.summary ?? "").trim()
    const orderRaw = body.order
    const order =
      typeof orderRaw === "number" && Number.isFinite(orderRaw)
        ? Math.floor(orderRaw)
        : NaN
    const hidden = body.hidden === true

    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 })
    }
    if (!Number.isFinite(order)) {
      return Response.json({ error: "Order must be a number" }, { status: 400 })
    }

    const existing = await ghReadFileMeta(
      context.env,
      `${DATA_DIR}/${slug}/meta.json`,
    )
    if (!existing) {
      return Response.json({ error: "Topic not found" }, { status: 404 })
    }

    const newContent = buildMetaJson({ slug, title, order, summary, hidden })
    const base64 = encodeBase64Utf8(newContent)

    const path = `${DATA_DIR}/${slug}/meta.json`
    const commitRes = await fetch(
      `https://api.github.com/repos/${context.env.GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${context.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-upskill",
        },
        body: JSON.stringify({
          message: `upskill: update topic ${slug}${hidden ? " (hidden)" : ""}`,
          content: base64,
          sha: existing.sha,
          branch: BRANCH,
        }),
      },
    )
    if (!commitRes.ok) {
      const err = await commitRes.text()
      return Response.json(
        { error: "GitHub commit failed", details: err },
        { status: 502 },
      )
    }

    return Response.json({
      success: true,
      slug,
      title,
      order,
      summary,
      hidden,
      message: `Topic updated. Next Quartz build (~30s) will republish.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ───── DELETE — remove meta.json AND content landing page ────────── */

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const slug = (context.params.slug as string) ?? ""
  const pre = preflight(context.env, context.request.headers, slug)
  if (pre) return pre

  try {
    const metaPath = `${DATA_DIR}/${slug}/meta.json`
    const landingPath = `${CONTENT_DIR}/${slug}/index.md`

    const metaFile = await ghReadFileMeta(context.env, metaPath)
    const landingFile = await ghReadFileMeta(context.env, landingPath)

    if (!metaFile && !landingFile) {
      return Response.json({
        success: true,
        slug,
        message: "Topic was already absent.",
      })
    }

    // Delete each independently via the Contents API. Two-file atomicity
    // matters less here than on create: the worst case is one file
    // deleted and the other still present, which is recoverable by
    // retrying. We delete meta.json first so the sidebar entry
    // disappears on the next build even if the landing-page deletion
    // fails — better UX than the reverse.
    const headers = {
      Authorization: `Bearer ${context.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "jacks-brain-upskill",
    }

    if (metaFile) {
      const res = await fetch(
        `https://api.github.com/repos/${context.env.GITHUB_REPO}/contents/${metaPath}`,
        {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            message: `upskill: delete topic ${slug}`,
            sha: metaFile.sha,
            branch: BRANCH,
          }),
        },
      )
      if (!res.ok) {
        const err = await res.text()
        return Response.json(
          { error: "GitHub delete of meta.json failed", details: err },
          { status: 502 },
        )
      }
    }

    if (landingFile) {
      const res = await fetch(
        `https://api.github.com/repos/${context.env.GITHUB_REPO}/contents/${landingPath}`,
        {
          method: "DELETE",
          headers,
          body: JSON.stringify({
            message: `upskill: delete landing page for ${slug}`,
            sha: landingFile.sha,
            branch: BRANCH,
          }),
        },
      )
      if (!res.ok) {
        const err = await res.text()
        return Response.json(
          {
            error: "GitHub delete of landing page failed",
            details: err,
            partial: "meta.json was deleted; the landing page remains.",
          },
          { status: 502 },
        )
      }
    }

    return Response.json({
      success: true,
      slug,
      message: `Topic deleted. Next Quartz build (~30s) will republish without it. Any study pages under content/upskill/${slug}/ other than index.md are preserved.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
