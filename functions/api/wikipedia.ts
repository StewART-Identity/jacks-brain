/**
 * /api/wikipedia
 *
 * Two methods, one resource:
 *
 *   GET  /api/wikipedia?q=<subject>   — search Wikipedia, return the top
 *                                        matches (title + plain-text snippet)
 *                                        for the user to choose from.
 *   POST /api/wikipedia  { title }    — fetch the chosen article as clean
 *                                        plain text, wrap it with provenance
 *                                        frontmatter, and commit it to
 *                                        static/queue/. The catalog workflow
 *                                        picks it up from there — same pipeline
 *                                        /api/upload and /api/url use.
 *
 * Why a dedicated endpoint instead of pasting a wiki URL into /api/url:
 * /api/url runs raw page HTML through a generic readability scraper, which
 * on a Wikipedia article drags in citation superscripts, infobox table
 * soup, and "[edit]" cruft. Here we instead hit MediaWiki's TextExtracts
 * API (action=query&prop=extracts&explaintext=1), which returns the article
 * body as clean prose with section headers preserved — markedly better
 * input for the cataloger.
 *
 * Requires env vars (set in the Cloudflare Pages dashboard):
 *   GITHUB_TOKEN   — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO    — e.g. "StewART-Identity/jacks-brain"
 *   USER_TIMEZONE  — IANA timezone for date-prefixing the filename (e.g.
 *                    "America/New_York"). Optional; falls back to UTC.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

// MediaWiki asks API clients to send a descriptive User-Agent identifying
// the tool and a contact/source URL. Generic UAs can be throttled or
// blocked. Mirrors the UA convention used in functions/api/url.ts.
const WIKI_UA =
  "jacks-brain-catalog/1.0 (https://github.com/StewART-Identity/jacks-brain; wikipedia import)"

const WIKI_API = "https://en.wikipedia.org/w/api.php"

// How many search results to surface for selection. Enough to find the
// right article without turning the card into a wall of links.
const SEARCH_LIMIT = 8

// Reject extracts shorter than this. A handful of hundred characters is
// the signature of a disambiguation page or a one-line stub — not useful
// catalog input. The number is deliberately low so legitimate short
// articles still pass.
const MIN_EXTRACT_CHARS = 250

// ─── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Today's date as YYYY-MM-DD in the user's configured timezone.
 *
 * Same helper (and same rationale) as functions/api/upload.ts: a naive
 * `new Date().toISOString().slice(0,10)` yields UTC, which rolls over to
 * tomorrow several hours before midnight local time and stamps the wrong
 * date on evening acquisitions. catalog.mjs bakes the filename's date
 * prefix into the source page's permanent slug, so getting it right here
 * matters. (functions/api/url.ts still uses the naive UTC form; this
 * endpoint deliberately uses the corrected one.)
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
    return new Date().toISOString().slice(0, 10)
  }
}

/**
 * Title → filename-safe slug: lowercase, hyphen-separated, trimmed,
 * truncated to 60 chars. Mirrors slugify() in functions/api/url.ts so
 * Wikipedia imports name their queue files the same way other acquisitions
 * do, and so catalog.mjs's own slugify() re-derives a stable slug for
 * re-view detection.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

/**
 * Strip HTML tags and decode the handful of entities MediaWiki search
 * snippets actually contain. Snippets come back as HTML fragments with
 * <span class="searchmatch"> wrappers around the matched terms; we want
 * plain text for display in the results list.
 */
function stripSnippetHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Cut the reference apparatus off the tail of an article extract.
 *
 * TextExtracts with exsectionformat=wiki renders section headers as
 * "== Heading ==" lines. Everything from the first apparatus heading
 * onward (See also, References, etc.) is link lists and citations that
 * carry no prose value once the inline citations have already been
 * stripped — so we truncate at the earliest such heading. This reproduces
 * the manual trim used when the Authoritarianism article was imported by
 * hand.
 */
function trimReferenceApparatus(text: string): string {
  const apparatus = [
    "See also",
    "Notes",
    "References",
    "Citations",
    "Footnotes",
    "Works cited",
    "Bibliography",
    "Further reading",
    "External links",
    "Sources",
  ]
  const re = new RegExp(`^==+\\s*(?:${apparatus.join("|")})\\s*==+\\s*$`, "im")
  const m = text.match(re)
  if (m && m.index !== undefined) {
    text = text.slice(0, m.index)
  }
  return text.replace(/\n{3,}/g, "\n\n").trim()
}

/**
 * Write a markdown file to static/queue/<filename> on main, base64-encoded
 * over UTF-8 bytes. The catalog workflow watches static/queue/** and
 * promotes files through static/in-flight/ to static/originals/ as they're
 * cataloged. Same commit shape as functions/api/url.ts's commitToQueue.
 */
async function commitToQueue(
  env: Env,
  filename: string,
  markdown: string,
  commitMessage: string,
): Promise<{ ok: true; path: string } | { ok: false; status: number; error: string }> {
  const path = `static/queue/${filename}`

  const bytes = new TextEncoder().encode(markdown)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  const base64Content = btoa(binary)

  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "jacks-brain-upload",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        branch: "main",
      }),
    },
  )

  if (!res.ok) {
    let err = ""
    try {
      err = await res.text()
    } catch {}
    return { ok: false, status: res.status, error: err || res.statusText }
  }

  return { ok: true, path }
}

// ─── Wikipedia API shapes (only the fields we read) ──────────────────────────

interface SearchHit {
  title: string
  pageid: number
  snippet: string
}

interface SearchResponse {
  query?: { search?: SearchHit[] }
}

interface ExtractPage {
  pageid?: number
  title?: string
  extract?: string
  fullurl?: string
  missing?: string
}

interface ExtractResponse {
  query?: { pages?: Record<string, ExtractPage> }
}

// ─── GET: search ─────────────────────────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const q = (new URL(context.request.url).searchParams.get("q") || "").trim()
  if (!q) {
    return Response.json({ error: "No search term provided" }, { status: 400 })
  }

  const api = new URL(WIKI_API)
  api.searchParams.set("action", "query")
  api.searchParams.set("list", "search")
  api.searchParams.set("srsearch", q)
  api.searchParams.set("srlimit", String(SEARCH_LIMIT))
  api.searchParams.set("srprop", "snippet")
  api.searchParams.set("format", "json")
  api.searchParams.set("origin", "*")

  let body: SearchResponse
  try {
    const res = await fetch(api.toString(), {
      headers: { "User-Agent": WIKI_UA, Accept: "application/json" },
    })
    if (!res.ok) {
      return Response.json(
        { error: `Wikipedia search failed: ${res.status} ${res.statusText}` },
        { status: 502 },
      )
    }
    body = (await res.json()) as SearchResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: `Wikipedia search failed: ${message}` }, { status: 502 })
  }

  const results = (body.query?.search ?? []).map((hit) => ({
    title: hit.title,
    pageid: hit.pageid,
    snippet: stripSnippetHtml(hit.snippet || ""),
  }))

  return Response.json({ results })
}

// ─── POST: import ────────────────────────────────────────────────────────────

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

  let title: string
  try {
    const reqBody = (await context.request.json()) as { title?: string }
    title = (reqBody.title ?? "").trim()
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (!title) {
    return Response.json({ error: "No article title provided" }, { status: 400 })
  }

  // Fetch the article as clean plain text. redirects=1 follows redirects
  // (e.g. "OAuth 2" → "OAuth"); inprop=url gives us the canonical page URL
  // so we don't have to reconstruct it from the title by hand.
  const api = new URL(WIKI_API)
  api.searchParams.set("action", "query")
  api.searchParams.set("prop", "extracts|info")
  api.searchParams.set("inprop", "url")
  api.searchParams.set("explaintext", "1")
  api.searchParams.set("exsectionformat", "wiki")
  api.searchParams.set("redirects", "1")
  api.searchParams.set("titles", title)
  api.searchParams.set("format", "json")
  api.searchParams.set("origin", "*")

  let body: ExtractResponse
  try {
    const res = await fetch(api.toString(), {
      headers: { "User-Agent": WIKI_UA, Accept: "application/json" },
    })
    if (!res.ok) {
      return Response.json(
        { error: `Wikipedia fetch failed: ${res.status} ${res.statusText}` },
        { status: 502 },
      )
    }
    body = (await res.json()) as ExtractResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: `Wikipedia fetch failed: ${message}` }, { status: 502 })
  }

  const pages = body.query?.pages ?? {}
  const page = Object.values(pages)[0]
  if (!page || page.missing !== undefined) {
    return Response.json(
      { error: `No Wikipedia article found for "${title}"` },
      { status: 404 },
    )
  }

  const canonicalTitle = page.title || title
  const articleUrl =
    page.fullurl ||
    `https://en.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replace(/ /g, "_"))}`

  const trimmed = trimReferenceApparatus(page.extract || "")
  if (trimmed.length < MIN_EXTRACT_CHARS) {
    return Response.json(
      {
        error:
          `"${canonicalTitle}" returned too little text to catalog — it's likely a ` +
          `disambiguation or stub page. Try a more specific article title.`,
      },
      { status: 422 },
    )
  }

  const today = todayInUserTimezone(context.env)
  const safeTitle = canonicalTitle.replace(/"/g, '\\"')

  const frontmatter =
    `---\n` +
    `source_type: wikipedia-article\n` +
    `title: "${safeTitle}"\n` +
    `url: "${articleUrl}"\n` +
    `date: ${today}\n` +
    `license: "CC BY-SA 4.0"\n` +
    `---\n\n`

  const markdown =
    `${frontmatter}` +
    `# ${canonicalTitle}\n\n` +
    `Source: [Wikipedia](${articleUrl}) — retrieved ${today}; text under CC BY-SA 4.0.\n\n` +
    `${trimmed}\n`

  const filename = `${today}-${slugify(canonicalTitle) || "wikipedia-article"}.md`

  const commitResult = await commitToQueue(
    context.env,
    filename,
    markdown,
    `upload: ${filename}`,
  )

  if (!commitResult.ok) {
    return Response.json(
      { error: "GitHub commit failed", details: commitResult.error },
      { status: 502 },
    )
  }

  return Response.json({
    success: true,
    filename,
    title: canonicalTitle,
    url: articleUrl,
    source_type: "wikipedia-article",
    message: `Article queued at ${commitResult.path}. Catalog workflow triggered.`,
  })
}
