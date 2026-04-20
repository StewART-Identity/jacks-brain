/**
 * POST /api/url
 *
 * Accepts a URL, fetches the page, extracts readable content, and commits
 * a markdown file to static/originals/. The ingest workflow triggers
 * automatically on push.
 *
 * Requires env vars:
 *   GITHUB_TOKEN  — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#8216;": "\u2018",
  "&#8217;": "\u2019",
  "&#8220;": "\u201C",
  "&#8221;": "\u201D",
  "&#8211;": "\u2013",
  "&#8212;": "\u2014",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
}

function decodeEntities(s: string): string {
  let out = s
  for (const [k, v] of Object.entries(HTML_ENTITIES)) {
    out = out.split(k).join(v)
  }
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  return out
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

function extractReadable(html: string): { title: string; body: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "Untitled"

  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")

  const articleMatch =
    cleaned.match(/<article\b[\s\S]*?<\/article>/i) || cleaned.match(/<main\b[\s\S]*?<\/main>/i)
  if (articleMatch) cleaned = articleMatch[0]

  cleaned = cleaned
    .replace(/<h1[^>]*>/gi, "\n\n# ")
    .replace(/<h2[^>]*>/gi, "\n\n## ")
    .replace(/<h3[^>]*>/gi, "\n\n### ")
    .replace(/<h4[^>]*>/gi, "\n\n#### ")
    .replace(/<h5[^>]*>/gi, "\n\n##### ")
    .replace(/<h6[^>]*>/gi, "\n\n###### ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/(p|div|tr|section|blockquote)\s*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")

  cleaned = decodeEntities(cleaned)
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return { title, body: cleaned }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json(
      { error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" },
      { status: 500 },
    )
  }

  let url: string
  try {
    const body = (await context.request.json()) as { url?: string }
    url = (body.url ?? "").trim()
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!url) {
    return Response.json({ error: "No URL provided" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 })
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "Only http(s) URLs are supported" }, { status: 400 })
  }

  let html: string
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; jacks-brain-ingest/1.0; +https://github.com/StewART-Identity/jacks-brain)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })
    if (!pageRes.ok) {
      return Response.json(
        { error: `Fetch failed: ${pageRes.status} ${pageRes.statusText}` },
        { status: 502 },
      )
    }
    html = await pageRes.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: `Fetch failed: ${message}` }, { status: 502 })
  }

  const { title, body } = extractReadable(html)

  if (!body || body.length < 40) {
    return Response.json({ error: "Could not extract readable content from page" }, { status: 422 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const slug = slugify(title) || slugify(parsed.hostname + parsed.pathname) || "url"
  const filename = `${today}-${slug}.md`
  const path = `static/originals/${filename}`

  const frontmatter =
    `---\n` +
    `source_type: web-page\n` +
    `title: "${title.replace(/"/g, '\\"')}"\n` +
    `url: "${url}"\n` +
    `date: ${today}\n` +
    `---\n\n`
  const markdown = `${frontmatter}# ${title}\n\nSource: [${parsed.hostname}](${url}) | Fetched: ${today}\n\n${body}\n`

  const base64Content = btoa(
    new Uint8Array(new TextEncoder().encode(markdown)).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  )

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
    },
  )

  if (!commitResponse.ok) {
    const err = await commitResponse.text()
    return Response.json({ error: "GitHub commit failed", details: err }, { status: 502 })
  }

  return Response.json({
    success: true,
    filename,
    title,
    url,
    message: `Page committed to ${path}. Ingestion workflow triggered.`,
  })
}
