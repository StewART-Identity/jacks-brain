/**
 * /api/notes — list and create notes.
 *
 * GET  /api/notes              → list all notes (newest first)
 * POST /api/notes              → create a new note from {title, tags, body}
 *
 * Notes live at content/notes/journal/<slug>.md where slug is an ISO
 * timestamp YYYYMMDD-HHMMSS. The timestamp is computed in USER_TIMEZONE
 * (same fallback to UTC as upload.ts) — the second-level precision means
 * many-per-day capture never collides, which is the entire point of the
 * timestamp-slug convention Jack chose.
 *
 * The 'journal' subfolder isolates notes from the Notes section landing
 * page (Write, Browse) so the folder listing on /notes/ doesn't show
 * actual notes alongside the section pages.
 *
 * Both endpoints are gated by cf-access-authenticated-user-email — the
 * same auth model as every other write endpoint in this site. Cloudflare
 * Access in front of the whole site means the header is present iff the
 * request came through Access; missing → 403.
 *
 * Required env vars (already set for upload.ts):
 *   GITHUB_TOKEN   — fine-grained PAT with contents:read+write
 *   GITHUB_REPO    — e.g. "StewART-Identity/jacks-brain"
 *   USER_TIMEZONE  — IANA tz, optional, defaults to UTC
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

const BRANCH = "main"
const NOTES_DIR = "content/notes/journal"

interface NoteSummary {
  slug: string
  title: string
  tags: string[]
  created: string
  modified: string
  path: string
}

/**
 * ISO-timestamp slug in the configured user timezone — YYYYMMDD-HHMMSS.
 * Same rationale as upload.ts's todayInUserTimezone(): a note captured
 * at 9 PM EDT should land in today's bucket, not tomorrow's UTC bucket.
 */
function timestampSlugInUserTimezone(env: Env): string {
  const tz = env.USER_TIMEZONE || "UTC"
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
    return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`
  } catch {
    // Invalid tz → UTC fallback. Strip non-digits from the ISO string
    // and slice into the YYYYMMDD-HHMMSS shape.
    const iso = new Date().toISOString()
    return `${iso.slice(0, 10).replace(/-/g, "")}-${iso.slice(11, 19).replace(/:/g, "")}`
  }
}

/** ISO datetime string in user timezone — for the created/modified frontmatter fields. */
function isoNowInUserTimezone(env: Env): string {
  // We store as UTC ISO. The timezone matters for the *slug* (so notes
  // group into the user's local day) but the timestamp field itself
  // should be unambiguous. ISO UTC is the safe choice.
  return new Date().toISOString()
}

/**
 * Minimal YAML frontmatter parser — handles the shape we write:
 *   ---
 *   title: "..."
 *   created: 2026-05-20T16:42:00.000Z
 *   tags: [foo, bar]
 *   ---
 *
 * Not a full YAML parser. We control the writer, so we know the shape.
 * If the file has hand-edited frontmatter that doesn't fit this shape,
 * the unparsable fields fall back to sensible defaults.
 */
function parseFrontmatter(raw: string): Record<string, any> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const block = match[1]
  const out: Record<string, any> = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (!m) continue
    const [, key, rawValue] = m
    let value: any = rawValue.trim()
    // Strip surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // Inline array: [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
    }
    out[key] = value
  }
  return out
}

function escapeYamlString(s: string): string {
  // Double-quote and escape backslashes + quotes. Newlines collapse to
  // a single space — note titles are one-liners.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`
}

function buildNoteMarkdown(env: Env, title: string, tags: string[], body: string, created?: string): string {
  const now = isoNowInUserTimezone(env)
  const tagList = tags.length > 0 ? `[${tags.map((t) => escapeYamlString(t)).join(", ")}]` : "[]"
  const frontmatter = [
    "---",
    `title: ${escapeYamlString(title)}`,
    `created: ${created ?? now}`,
    `modified: ${now}`,
    `tags: ${tagList}`,
    "---",
    "",
    body.trim(),
    "",
  ].join("\n")
  return frontmatter
}

/** Slug validation — matches the timestamp shape we generate. */
function isValidSlug(slug: string): boolean {
  return /^\d{8}-\d{6}$/.test(slug)
}

/* ──────────────────────────────────────────────────────────────────── */
/*  GET — list all notes                                                */
/* ──────────────────────────────────────────────────────────────────── */

export const onRequestGet: PagesFunction<Env> = async (context) => {
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

  try {
    // List the notes directory. Returns 404 if the dir doesn't exist yet —
    // treat that as an empty list, not an error, so the UI works on day 1.
    const listRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${NOTES_DIR}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "jacks-brain-notes",
        },
      },
    )
    if (listRes.status === 404) {
      return Response.json({ notes: [] })
    }
    if (!listRes.ok) {
      return Response.json(
        { error: "GitHub list failed", status: listRes.status },
        { status: 502 },
      )
    }
    const entries = (await listRes.json()) as Array<{
      name: string
      path: string
      type: string
    }>

    // Filter to .md files. We don't expect section pages (index/write/browse)
    // here since journal/ is one level below the section landing page, but
    // keep the index.md exclusion defensively — the journal subfolder may
    // grow its own index.md later as a folder rollup.
    const SECTION_PAGES = new Set(["index.md"])
    const noteEntries = entries.filter(
      (e) => e.type === "file" && e.name.endsWith(".md") && !SECTION_PAGES.has(e.name),
    )

    // For each, fetch the raw file to read frontmatter. Parallel to keep
    // latency low — typical note count is small, but this scales fine to
    // a few hundred before we'd want pagination.
    const notes: NoteSummary[] = await Promise.all(
      noteEntries.map(async (entry) => {
        const slug = entry.name.replace(/\.md$/, "")
        try {
          const fileRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${entry.path}?ref=${BRANCH}`,
            {
              headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.raw",
                "User-Agent": "jacks-brain-notes",
              },
            },
          )
          if (!fileRes.ok) {
            return {
              slug,
              title: slug,
              tags: [],
              created: "",
              modified: "",
              path: entry.path,
            }
          }
          const raw = await fileRes.text()
          const fm = parseFrontmatter(raw)
          return {
            slug,
            title: typeof fm.title === "string" ? fm.title : slug,
            tags: Array.isArray(fm.tags) ? fm.tags : [],
            created: typeof fm.created === "string" ? fm.created : "",
            modified: typeof fm.modified === "string" ? fm.modified : "",
            path: entry.path,
          }
        } catch {
          return {
            slug,
            title: slug,
            tags: [],
            created: "",
            modified: "",
            path: entry.path,
          }
        }
      }),
    )

    // Sort newest-first. Timestamp slugs sort lexicographically identical
    // to chronological — but legacy notes (like graph-theory-glossary)
    // don't have timestamp slugs, so fall back to created date for those.
    notes.sort((a, b) => {
      const aTime = a.modified || a.created
      const bTime = b.modified || b.created
      if (aTime && bTime) return bTime.localeCompare(aTime)
      // Either lacks a timestamp — defer to slug ordering as a stable fallback.
      return b.slug.localeCompare(a.slug)
    })

    return Response.json({ notes })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  POST — create a new note                                            */
/* ──────────────────────────────────────────────────────────────────── */

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

    // Tags can arrive as a comma-separated string (from the form) or an
    // array (from MCP callers). Normalize to a deduped, trimmed array.
    let tags: string[] = []
    if (Array.isArray(body.tags)) {
      tags = body.tags
    } else if (typeof body.tags === "string") {
      tags = body.tags.split(",")
    }
    tags = Array.from(
      new Set(tags.map((t) => t.trim()).filter(Boolean)),
    )

    const slug = timestampSlugInUserTimezone(context.env)
    const path = `${NOTES_DIR}/${slug}.md`
    const markdown = buildNoteMarkdown(context.env, title, tags, noteBody)
    const base64 = btoa(unescape(encodeURIComponent(markdown)))

    const commitRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-notes",
        },
        body: JSON.stringify({
          message: `note: ${title}`,
          content: base64,
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
      url: `/notes/journal/${slug}`,
      title,
      tags,
      message: `Note saved to ${path}. The next Quartz build (≈30s) will publish the page and update the graph.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Internals shared with [slug].ts                                     */
/* ──────────────────────────────────────────────────────────────────── */

export { parseFrontmatter, buildNoteMarkdown, isValidSlug, NOTES_DIR, BRANCH }
