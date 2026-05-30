/**
 * POST /api/wikipedia
 *
 * Two actions, dispatched on the JSON body's `action` field:
 *
 *   { action: "search", query }  → search English Wikipedia and return the top
 *                                   matches (title + plaintext snippet) for the
 *                                   user to choose from. No commit, no GitHub.
 *
 *   { action: "import", title }  → fetch the chosen article as clean plaintext
 *                                   via the MediaWiki extracts API, prepend a
 *                                   provenance/license header, trim the trailing
 *                                   reference apparatus, and commit the markdown
 *                                   to static/queue/ — the same catalog entry
 *                                   point /api/upload and /api/url use.
 *
 * Why a dedicated endpoint instead of routing a wikipedia.org URL through
 * /api/url: the generic path runs regex readability-extraction over rendered
 * HTML, which drags in nav chrome, citation superscripts, infobox soup, and
 * edit links. The MediaWiki `prop=extracts&explaintext=1` API returns the
 * article body as clean prose with `== Section ==` markers and nothing else —
 * a far better input for the catalog pipeline. This mirrors the manual process
 * we used to import the Authoritarianism article by hand.
 *
 * Requires env vars (Cloudflare Pages dashboard):
 *   GITHUB_TOKEN   — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO    — e.g. "StewART-Identity/jacks-brain"
 *   USER_TIMEZONE  — IANA tz for date-prefixing (optional; falls back to UTC)
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  USER_TIMEZONE?: string
}

const WIKI_API = "https://en.wikipedia.org/w/api.php"

// MediaWiki asks API clients to send a descriptive User-Agent identifying the
// tool with a contact URL. Generic/blank UAs are rate-limited harder and can
// be blocked outright.
const WIKI_UA = "jacks-brain-catalog/1.0 (https://github.com/StewART-Identity/jacks-brain)"

// Reference-apparatus section headers to drop from the tail of an article. In
// an explaintext extract these render as "== See also ==" lines. We cut from
// the earliest such header to the end — everything below is citations, link
// lists, and bibliography that add noise rather than article content.
const TAIL_SECTIONS = [
  "See also",
  "Notes",
  "References",
  "Citations",
  "Sources",
  "Bibliography",
  "Further reading",
  "External links",
]

// Minimum post-trim body length. Below this, the "article" is almost certainly
// a stub or a redirect husk not worth cataloging.
const MIN_CONTENT_CHARS = 200

/**
 * Today's date (YYYY-MM-DD) in the configured user timezone. Same helper and
 * rationale as functions/api/upload.ts: a UTC date rolls over several hours
 * before local midnight, which would mis-prefix evening imports and poison the
 * catalog slug (the pipeline uses the filename date prefix as the source slug).
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

// Title → filename-safe slug. Same shape as url.ts so source-page slugs are
// consistent across acquisition paths.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

// Minimal HTML strip + entity decode for search snippets, which come back from
// the API wrapped in <span class="searchmatch">…</span> with HTML entities.
function stripHtml(s: string): string {
  const decoded = s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  return decoded.replace(/\s+/g, " ").trim()
}

async function wikiFetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": WIKI_UA, Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Wikipedia API ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ─── GitHub commit helper (mirrors functions/api/url.ts) ────────────────────

async function commitToQueue(
  env: Env,
  filename: string,
  markdown: string,
  commitMessage: string,
): Promise<{ ok: true; path: string } | { ok: false; status: number; error: string }> {
  const path = `static/queue/${filename}`

  // UTF-8 encode then base64, chunked to avoid blowing the argument-count cap
  // on String.fromCharCode for large articles. Same pattern as url.ts.
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
      body: JSON.stringify({ message: commitMessage, content: base64Content, branch: "main" }),
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

// ─── search ─────────────────────────────────────────────────────────────────

async function handleSearch(query: string): Promise<Response> {
  const url =
    `${WIKI_API}?action=query&list=search&format=json` +
    `&srlimit=8&srprop=snippet&srsearch=${encodeURIComponent(query)}`
  const data = await wikiFetchJson(url)
  const hits = data?.query?.search ?? []
  const results = hits.map((h: any) => ({
    title: h.title as string,
    snippet: stripHtml(h.snippet || ""),
  }))
  return Response.json({ success: true, results })
}

// ─── import ───────────────────────────────────────────────────────────────

// Drop the trailing reference apparatus and return the trimmed article body.
function trimTail(extract: string): string {
  let cut = extract.length
  for (const h of TAIL_SECTIONS) {
    // Match "== Header ==" at any heading depth, on its own line.
    const re = new RegExp(`\\n=+\\s*${h}\\s*=+`, "i")
    const m = re.exec(extract)
    if (m && m.index < cut) cut = m.index
  }
  return extract.slice(0, cut).trim()
}

function buildMarkdown(title: string, canonicalUrl: string, body: string, today: string): string {
  const fm =
    `---\n` +
    `source_type: wikipedia-article\n` +
    `title: "${title.replace(/"/g, '\\"')}"\n` +
    `url: "${canonicalUrl}"\n` +
    `date: ${today}\n` +
    `license: "CC BY-SA 4.0"\n` +
    `---\n\n`
  return (
    `${fm}# ${title}\n\n` +
    `Source: [Wikipedia](${canonicalUrl}) | Retrieved: ${today} | Text under CC BY-SA 4.0\n\n` +
    `${body}\n`
  )
}

async function handleImport(env: Env, title: string): Promise<Response> {
  const today = todayInUserTimezone(env)
  const url =
    `${WIKI_API}?action=query&format=json&redirects=1` +
    `&prop=extracts|pageprops&ppprop=disambiguation&explaintext=1` +
    `&titles=${encodeURIComponent(title)}`
  const data = await wikiFetchJson(url)
  const pages = data?.query?.pages ?? {}
  const page: any = Object.values(pages)[0]

  if (!page || page.missing !== undefined) {
    return Response.json({ error: `No Wikipedia article found for "${title}".` }, { status: 404 })
  }
  if (page.pageprops && page.pageprops.disambiguation !== undefined) {
    return Response.json(
      {
        error:
          `"${page.title}" is a disambiguation page, not an article. ` +
          `Search again and pick a more specific title.`,
      },
      { status: 422 },
    )
  }

  const canonicalTitle: string = page.title || title
  const body = trimTail(page.extract || "")

  if (body.length < MIN_CONTENT_CHARS) {
    return Response.json(
      { error: `Article "${canonicalTitle}" was too short to catalog.` },
      { status: 422 },
    )
  }

  const canonicalUrl =
    "https://en.wikipedia.org/wiki/" + encodeURIComponent(canonicalTitle.replace(/ /g, "_"))
  const markdown = buildMarkdown(canonicalTitle, canonicalUrl, body, today)
  const filename = `${today}-${slugify(canonicalTitle)}.md`

  const commit = await commitToQueue(env, filename, markdown, `upload: ${filename}`)
  if (!commit.ok) {
    return Response.json({ error: "GitHub commit failed", details: commit.error }, { status: 502 })
  }

  return Response.json({
    success: true,
    filename,
    title: canonicalTitle,
    url: canonicalUrl,
    source_type: "wikipedia-article",
    message: `Article queued at ${commit.path}. Catalog workflow triggered.`,
  })
}

// ─── request handler ────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Defense in depth — Cloudflare Access sets this header on every request it
  // lets through. If it's missing, the request didn't come via Access.
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { action?: string; query?: string; title?: string }
  try {
    body = (await context.request.json()) as typeof body
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const action = (body.action ?? "").trim()

  if (action === "search") {
    const query = (body.query ?? "").trim()
    if (!query) {
      return Response.json({ error: "No query provided" }, { status: 400 })
    }
    try {
      return await handleSearch(query)
    } catch (err) {
      const m = err instanceof Error ? err.message : "Unknown error"
      return Response.json({ error: `Search failed: ${m}` }, { status: 502 })
    }
  }

  if (action === "import") {
    const { GITHUB_TOKEN, GITHUB_REPO } = context.env
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return Response.json(
        { error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" },
        { status: 500 },
      )
    }
    const title = (body.title ?? "").trim()
    if (!title) {
      return Response.json({ error: "No title provided" }, { status: 400 })
    }
    try {
      return await handleImport(context.env, title)
    } catch (err) {
      const m = err instanceof Error ? err.message : "Unknown error"
      return Response.json({ error: `Import failed: ${m}` }, { status: 502 })
    }
  }

  return Response.json({ error: `Unknown action "${action}"` }, { status: 400 })
}
