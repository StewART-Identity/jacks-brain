/**
 * /api/journal — list and create journal entries.
 *
 * GET  /api/journal              → list all entries (newest first)
 * POST /api/journal              → create a new entry from {title, tags, body}
 *
 * Journal entries live at content/journal/entries/<slug>.md where slug
 * is an ISO timestamp YYYYMMDD-HHMMSS in USER_TIMEZONE.
 *
 * The 'entries' subfolder isolates journal content from the Journal
 * section landing page (Write, Browse) — exact parallel to the Notes
 * section's content/notes/entries/.
 *
 * Both endpoints are gated by cf-access-authenticated-user-email.
 *
 * Required env vars:
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
const JOURNAL_DIR = "content/journal/entries"

interface JournalSummary {
  slug: string
  title: string
  tags: string[]
  created: string
  modified: string
  path: string
}

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
    const iso = new Date().toISOString()
    return `${iso.slice(0, 10).replace(/-/g, "")}-${iso.slice(11, 19).replace(/:/g, "")}`
  }
}

function isoNowInUserTimezone(env: Env): string {
  return new Date().toISOString()
}

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
    out[key] = value
  }
  return out
}

function escapeYamlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`
}

function buildJournalMarkdown(env: Env, title: string, tags: string[], body: string, created?: string): string {
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

function isValidSlug(slug: string): boolean {
  return /^\d{8}-\d{6}$/.test(slug)
}

/* ──────────────────────────────────────────────────────────────────── */
/*  GET — list all journal entries                                      */
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
    const listRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${JOURNAL_DIR}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "jacks-brain-journal",
        },
      },
    )
    if (listRes.status === 404) {
      return Response.json({ entries: [] })
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

    const SECTION_PAGES = new Set(["index.md"])
    const journalEntries = entries.filter(
      (e) => e.type === "file" && e.name.endsWith(".md") && !SECTION_PAGES.has(e.name),
    )

    const results: JournalSummary[] = await Promise.all(
      journalEntries.map(async (entry) => {
        const slug = entry.name.replace(/\.md$/, "")
        try {
          const fileRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${entry.path}?ref=${BRANCH}`,
            {
              headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.raw",
                "User-Agent": "jacks-brain-journal",
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

    results.sort((a, b) => {
      const aTime = a.modified || a.created
      const bTime = b.modified || b.created
      if (aTime && bTime) return bTime.localeCompare(aTime)
      return b.slug.localeCompare(a.slug)
    })

    return Response.json({ entries: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  POST — create a new journal entry                                   */
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
    const entryBody = (body.body ?? "").trim()

    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 })
    }
    if (!entryBody) {
      return Response.json({ error: "Entry body is required" }, { status: 400 })
    }

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
    const path = `${JOURNAL_DIR}/${slug}.md`
    const markdown = buildJournalMarkdown(context.env, title, tags, entryBody)
    const base64 = btoa(unescape(encodeURIComponent(markdown)))

    const commitRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-journal",
        },
        body: JSON.stringify({
          message: `journal: ${title}`,
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
      url: `/journal/entries/${slug}`,
      title,
      tags,
      message: `Journal entry saved to ${path}. The next Quartz build (≈30s) will publish the page and update the graph.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export { parseFrontmatter, buildJournalMarkdown, isValidSlug, JOURNAL_DIR, BRANCH }
