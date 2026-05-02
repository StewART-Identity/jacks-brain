/**
 * POST /api/upload
 *
 * Accepts a file via multipart form data, commits the original to
 * static/queue/ in the GitHub repo. The catalog workflow's queue-trigger
 * path will then promote the file to static/in-flight/ in FIFO order
 * (immediately if no catalog is currently running, otherwise after the
 * currently-running catalog completes), where the catalog phase reads
 * it and writes wiki pages, finally moving it to static/originals/ as
 * the cataloged corpus.
 *
 * Why static/queue/ instead of static/originals/:
 * Every acquisition path (this endpoint, MCP acquire_for_catalog, and
 * direct git push) now uses the queue as the universal entry point. The
 * catalog workflow promotes one file at a time, which serializes all
 * catalog work without needing a cron schedule and bounds the worst-case
 * concurrent-catalog count to one regardless of how many files are
 * uploaded simultaneously. See .github/workflows/catalog.yml for the
 * orchestrating logic.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   GITHUB_TOKEN   — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO    — e.g. "StewART-Identity/jacks-brain"
 *   USER_TIMEZONE  — IANA timezone for date-prefixing uploads (e.g.
 *                    "America/New_York"). Optional; falls back to UTC.
 *                    See todayInUserTimezone() below for why this matters.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

/**
 * Today's date in YYYY-MM-DD form, computed in the configured user timezone
 * (USER_TIMEZONE env var). Falls back to UTC if not set.
 *
 * Why not `new Date().toISOString().slice(0,10)`: that gives UTC, which
 * differs from the user's local date for several hours every evening.
 * An upload at 9 PM EDT on April 25 would get a 2026-04-26 filename
 * prefix because UTC has already rolled over. This bug produced exactly
 * such a filename in production today (2026-04-26-Driver-Migration-Husk.docx
 * for an upload that happened on April 25 EDT). The bug also propagated
 * to the catalog pipeline because catalog.mjs uses the filename's date
 * prefix as the source page's permanent slug component.
 *
 * Same fix and pattern as catalog.mjs's todayInUserTimezone(). Pages
 * Functions run on the Workers runtime, where Intl.DateTimeFormat with
 * IANA timezones is supported.
 */
function todayInUserTimezone(env: Env): string {
  const tz = env.USER_TIMEZONE || "UTC"
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  } catch {
    // Invalid timezone string — fall back to UTC. We swallow the specific
    // error because there's no good way to surface it to the upload caller,
    // and an upload with a UTC-prefixed filename is much better than a
    // failed upload.
    return new Date().toISOString().slice(0, 10)
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Defense in depth — Cloudflare Access sets this header on every request
  // it lets through. If it's missing, the request didn't come via Access.
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }

  try {
    const formData = await context.request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content and base64 encode it
    const arrayBuffer = await file.arrayBuffer()
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    )

    // Build filename: use original name, or generate a date-prefixed one.
    // The date prefix uses the configured user timezone — see the
    // todayInUserTimezone() docstring for the bug history.
    const today = todayInUserTimezone(context.env)
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const filename = originalName.startsWith(today) ? originalName : `${today}-${originalName}`
    // Stage in static/queue/ — the catalog workflow's queue-trigger path
    // will promote it through static/in-flight/ to static/originals/.
    const path = `static/queue/${filename}`

    // Commit the file to the repo via GitHub Contents API
    const commitResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-upload",
        },
        body: JSON.stringify({
          message: `upload: ${filename}`,
          content: base64Content,
          branch: "main",
        }),
      }
    )

    if (!commitResponse.ok) {
      const err = await commitResponse.text()
      return Response.json({ error: "GitHub commit failed", details: err }, { status: 502 })
    }

    return Response.json({
      success: true,
      filename,
      message: `File queued at ${path}. Catalog workflow will pick it up in FIFO order.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
