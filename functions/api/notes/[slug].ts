/**
 * /api/notes/:slug — read, update, delete a single note.
 *
 * Dynamic route — Pages Functions binds `slug` via the `[slug].ts`
 * filename. Same auth and env-var model as notes.ts.
 *
 * GET    → return {slug, title, tags, body, created, modified, sha}
 * PUT    → body {title, tags, body} → update note, preserving created
 * DELETE → remove the note from the repo
 *
 * The GitHub Contents API requires a `sha` for PUT (update) and DELETE
 * operations. We always fetch the current file first to get the sha
 * (and, for PUT, the original `created` timestamp) before issuing the
 * mutation. This is a read-modify-write, so two callers updating the
 * same note simultaneously will have a last-write-wins race — acceptable
 * for a personal notes tool with one writer.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

const BRANCH = "main"
const NOTES_DIR = "content/study/notes"

interface FileMeta {
  sha: string
  content: string // base64
  encoding: string
}

// Duplicated locally rather than imported from notes.ts. Pages Functions
// each ship their own bundle and can import siblings, but keeping these
// two files self-contained makes them easier to reason about and avoids
// a hidden coupling between an endpoint module and a shared helper. If
// these grow, lift them into a shared `functions/api/_notes/util.ts`.

function parseFrontmatter(raw: string): { fm: Record<string, any>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { fm: {}, body: raw }
  const block = match[1]
  const body = match[2] ?? ""
  const fm: Record<string, any> = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (!m) continue
    const [, key, rawValue] = m
    let value: any = rawValue.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
    }
    fm[key] = value
  }
  return { fm, body }
}

function escapeYamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`
}

function buildNoteMarkdown(
  title: string,
  tags: string[],
  body: string,
  created: string,
  modified: string,
): string {
  const tagList =
    tags.length > 0 ? `[${tags.map((t) => escapeYamlString(t)).join(", ")}]` : "[]"
  return [
    "---",
    `title: ${escapeYamlString(title)}`,
    `created: ${created}`,
    `modified: ${modified}`,
    `tags: ${tagList}`,
    "---",
    "",
    body.trim(),
    "",
  ].join("\n")
}

/** Slug must match the timestamp shape we generate. Cheap, deterministic
 *  defense against path traversal — no slashes can appear here. */
function isValidSlug(slug: string): boolean {
  return /^\d{8}-\d{6}$/.test(slug)
}

/** Decode base64 → UTF-8 string, the way GitHub returns file contents. */
function decodeBase64Utf8(b64: string): string {
  // GitHub wraps base64 at 60 chars per line. atob doesn't care, but
  // strip whitespace defensively.
  const clean = b64.replace(/\s/g, "")
  const bytes = atob(clean)
  return decodeURIComponent(escape(bytes))
}

/** Encode UTF-8 string → base64 for sending back to GitHub. */
function encodeBase64Utf8(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

/** Fetch a note file's contents + metadata. Returns null on 404. */
async function fetchNoteFile(
  env: Env,
  path: string,
): Promise<FileMeta | null> {
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "jacks-brain-notes",
      },
    },
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`GitHub fetch failed: ${res.status}`)
  }
  const data = (await res.json()) as FileMeta
  return data
}

/** Common auth + slug check used by every method. Returns either a
 *  response (caller should return it as-is) or null (caller proceeds). */
function preflight(context: { request: Request; params: any; env: Env }): Response | null {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json(
      { error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" },
      { status: 500 },
    )
  }
  const slug = (context.params.slug as string) ?? ""
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 })
  }
  return null
}

/* ──────────────────────────────────────────────────────────────────── */
/*  GET — read one note                                                 */
/* ──────────────────────────────────────────────────────────────────── */

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const pre = preflight(context)
  if (pre) return pre

  const slug = context.params.slug as string
  const path = `${NOTES_DIR}/${slug}.md`

  try {
    const file = await fetchNoteFile(context.env, path)
    if (!file) {
      return Response.json({ error: "Note not found" }, { status: 404 })
    }
    const raw = decodeBase64Utf8(file.content)
    const { fm, body } = parseFrontmatter(raw)
    return Response.json({
      slug,
      title: typeof fm.title === "string" ? fm.title : slug,
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      created: typeof fm.created === "string" ? fm.created : "",
      modified: typeof fm.modified === "string" ? fm.modified : "",
      body: body.trimStart(),
      sha: file.sha,
      path,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  PUT — update one note                                               */
/* ──────────────────────────────────────────────────────────────────── */

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const pre = preflight(context)
  if (pre) return pre

  const slug = context.params.slug as string
  const path = `${NOTES_DIR}/${slug}.md`

  try {
    const body = (await context.request.json()) as {
      title?: string
      tags?: string[] | string
      body?: string
    }
    const title = (body.title ?? "").trim()
    const noteBody = (body.body ?? "").trim()
    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 })
    }
    if (!noteBody) {
      return Response.json({ error: "Note body is required" }, { status: 400 })
    }
    let tags: string[] = []
    if (Array.isArray(body.tags)) {
      tags = body.tags
    } else if (typeof body.tags === "string") {
      tags = body.tags.split(",")
    }
    tags = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))

    // Read existing file to preserve `created` and to get the sha.
    const existing = await fetchNoteFile(context.env, path)
    if (!existing) {
      return Response.json({ error: "Note not found" }, { status: 404 })
    }
    const { fm } = parseFrontmatter(decodeBase64Utf8(existing.content))
    const created =
      typeof fm.created === "string" && fm.created ? fm.created : new Date().toISOString()
    const modified = new Date().toISOString()

    const markdown = buildNoteMarkdown(title, tags, noteBody, created, modified)
    const base64 = encodeBase64Utf8(markdown)

    const commitRes = await fetch(
      `https://api.github.com/repos/${context.env.GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${context.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-notes",
        },
        body: JSON.stringify({
          message: `note: update ${title}`,
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
      path,
      url: `/study/notes/${slug}`,
      title,
      tags,
      created,
      modified,
      message: `Note updated. Next Quartz build (≈30s) will republish.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  DELETE — remove one note                                            */
/* ──────────────────────────────────────────────────────────────────── */

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const pre = preflight(context)
  if (pre) return pre

  const slug = context.params.slug as string
  const path = `${NOTES_DIR}/${slug}.md`

  try {
    const existing = await fetchNoteFile(context.env, path)
    if (!existing) {
      // Idempotent: deleting something that's already gone is success.
      return Response.json({ success: true, slug, message: "Note was already absent." })
    }

    const commitRes = await fetch(
      `https://api.github.com/repos/${context.env.GITHUB_REPO}/contents/${path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${context.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-notes",
        },
        body: JSON.stringify({
          message: `note: delete ${slug}`,
          sha: existing.sha,
          branch: BRANCH,
        }),
      },
    )
    if (!commitRes.ok) {
      const err = await commitRes.text()
      return Response.json(
        { error: "GitHub delete failed", details: err },
        { status: 502 },
      )
    }

    return Response.json({
      success: true,
      slug,
      message: `Note deleted. Next Quartz build (≈30s) will republish the index without it.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
