/**
 * POST /api/research
 *
 * Takes a natural-language research query and a target result count, then
 * asks Claude (with the web_search tool) to curate that many of the best
 * websites for the query. Returns a structured list of { url, title, summary }.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   ANTHROPIC_API_KEY — key with access to the Messages API + web_search tool
 *
 * Optional env vars:
 *   ANTHROPIC_MODEL   — override the default model id
 */

interface Env {
  ANTHROPIC_API_KEY: string
  ANTHROPIC_MODEL?: string
}

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
}

interface MessagesResponse {
  content?: ContentBlock[]
  stop_reason?: string
  error?: { type: string; message: string }
}

interface Site {
  url: string
  title: string
  summary: string
}

const DEFAULT_MODEL = "claude-opus-4-7"
const MAX_COUNT = 25
const MIN_COUNT = 1

function buildPrompt(query: string, count: number): string {
  return `I am building a personal knowledge wiki. Find the ${count} best websites to answer or inform the following research request. Prefer authoritative, primary, or deeply-researched sources over SEO/listicle content. Diversify across sources where reasonable.

Research request:
${query}

Use the web_search tool as many times as needed. When you are done, respond with ONLY a JSON object in this exact shape, wrapped in a single \`\`\`json code block:

{
  "results": [
    {
      "url": "https://example.com/article",
      "title": "Human-readable page title",
      "summary": "One to two sentence description of why this page is useful for the request."
    }
  ]
}

Return exactly ${count} results. Do not include commentary before or after the JSON block.`
}

function extractJson(text: string): { results: Site[] } | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenceMatch ? fenceMatch[1] : text
  const firstBrace = candidate.indexOf("{")
  const lastBrace = candidate.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null
  const sliced = candidate.slice(firstBrace, lastBrace + 1)
  try {
    const parsed = JSON.parse(sliced)
    if (!parsed || !Array.isArray(parsed.results)) return null
    return parsed as { results: Site[] }
  } catch {
    return null
  }
}

function sanitizeSites(sites: unknown): Site[] {
  if (!Array.isArray(sites)) return []
  const seen = new Set<string>()
  const out: Site[] = []
  for (const raw of sites) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    const url = typeof r.url === "string" ? r.url.trim() : ""
    const title = typeof r.title === "string" ? r.title.trim() : ""
    const summary = typeof r.summary === "string" ? r.summary.trim() : ""
    if (!url || !title) continue
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue
    } catch {
      continue
    }
    if (seen.has(url)) continue
    seen.add(url)
    out.push({ url, title, summary })
  }
  return out
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = context.env

  if (!ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server misconfigured: missing ANTHROPIC_API_KEY" },
      { status: 500 },
    )
  }

  let query: string
  let count: number
  try {
    const body = (await context.request.json()) as { query?: string; count?: number }
    query = (body.query ?? "").trim()
    const rawCount = Number(body.count)
    count = Number.isFinite(rawCount) ? Math.floor(rawCount) : 10
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!query) {
    return Response.json({ error: "No query provided" }, { status: 400 })
  }
  if (count < MIN_COUNT || count > MAX_COUNT) {
    return Response.json(
      { error: `Count must be between ${MIN_COUNT} and ${MAX_COUNT}` },
      { status: 400 },
    )
  }

  const model = ANTHROPIC_MODEL || DEFAULT_MODEL

  const payload = {
    model,
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: Math.min(10, Math.max(3, Math.ceil(count / 2))),
      },
    ],
    messages: [
      {
        role: "user",
        content: buildPrompt(query, count),
      },
    ],
  }

  let response: Response
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: `Anthropic request failed: ${message}` }, { status: 502 })
  }

  const data = (await response.json()) as MessagesResponse

  if (!response.ok) {
    const message = data?.error?.message || `Anthropic API error: ${response.status}`
    return Response.json({ error: message }, { status: 502 })
  }

  const textBlocks = (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
  const finalText = textBlocks.join("\n").trim()

  if (!finalText) {
    return Response.json({ error: "Claude returned no text response" }, { status: 502 })
  }

  const parsed = extractJson(finalText)
  if (!parsed) {
    return Response.json(
      { error: "Could not parse results from Claude", raw: finalText },
      { status: 502 },
    )
  }

  const results = sanitizeSites(parsed.results).slice(0, count)

  return Response.json({ success: true, query, count, results })
}
