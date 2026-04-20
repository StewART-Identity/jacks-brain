/**
 * POST /api/research
 *
 * Curates the best websites for a research query. Uses Brave Search as the
 * primary source. Optionally re-ranks and summarizes the Brave results with
 * Claude (cheap model, no web_search tool) if ANTHROPIC_API_KEY is set and
 * the caller opts in.
 *
 * Falls back to Claude's web_search tool only if no Brave key is configured.
 *
 * Env vars (set in Cloudflare Pages dashboard):
 *   BRAVE_API_KEY       — Brave Search API subscription token (preferred)
 *   ANTHROPIC_API_KEY   — enables Claude re-ranking / web_search fallback
 *   ANTHROPIC_MODEL     — override for the ranking/fallback model
 *
 * Request body: { query: string; count?: number; rank?: boolean }
 */

interface Env {
  BRAVE_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_MODEL?: string
}

interface Site {
  url: string
  title: string
  summary: string
}

interface BraveResult {
  title?: string
  url?: string
  description?: string
  meta_url?: { hostname?: string }
}

interface BraveResponse {
  web?: { results?: BraveResult[] }
}

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[]
  error?: { type: string; message: string }
}

const DEFAULT_RANK_MODEL = "claude-haiku-4-5-20251001"
const DEFAULT_WEB_SEARCH_MODEL = "claude-opus-4-7"
const MIN_COUNT = 1
const MAX_COUNT = 25

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

async function braveSearch(apiKey: string, query: string, count: number): Promise<Site[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search")
  url.searchParams.set("q", query)
  url.searchParams.set("count", String(Math.min(20, Math.max(count, 10))))
  url.searchParams.set("safesearch", "moderate")
  url.searchParams.set("text_decorations", "false")

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brave search failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as BraveResponse
  const raw = data.web?.results ?? []
  return sanitizeSites(
    raw.map((r) => ({
      url: r.url ?? "",
      title: r.title ?? "",
      summary: r.description ?? "",
    })),
  )
}

function extractJson(text: string): { results: Site[] } | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenceMatch ? fenceMatch[1] : text
  const firstBrace = candidate.indexOf("{")
  const lastBrace = candidate.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null
  try {
    const parsed = JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
    if (!parsed || !Array.isArray(parsed.results)) return null
    return parsed as { results: Site[] }
  } catch {
    return null
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<AnthropicResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, ...body }),
  })
  const data = (await response.json()) as AnthropicResponse
  if (!response.ok) {
    throw new Error(data?.error?.message || `Anthropic API error: ${response.status}`)
  }
  return data
}

async function rerankWithClaude(
  apiKey: string,
  model: string,
  query: string,
  candidates: Site[],
  count: number,
): Promise<Site[]> {
  const prompt = `I am building a personal knowledge wiki. Below is a set of candidate search results for a research request. Pick the ${count} most useful ones, preferring authoritative primary sources and deep analysis over SEO/listicle content, and diversify across sources.

Research request:
${query}

Candidates (JSON):
${JSON.stringify(candidates, null, 2)}

Respond with ONLY a JSON object in this exact shape, wrapped in a single \`\`\`json code block:

{
  "results": [
    { "url": "...", "title": "...", "summary": "One to two sentence explanation of why this page is useful." }
  ]
}

Use URLs exactly as given. Rewrite titles and summaries for clarity if needed. Return at most ${count} results. No commentary outside the JSON block.`

  const data = await callAnthropic(apiKey, model, {
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim()

  const parsed = extractJson(text)
  if (!parsed) return candidates.slice(0, count)
  return sanitizeSites(parsed.results).slice(0, count)
}

async function claudeWebSearch(
  apiKey: string,
  model: string,
  query: string,
  count: number,
): Promise<Site[]> {
  const prompt = `I am building a personal knowledge wiki. Find the ${count} best websites to answer or inform the following research request. Prefer authoritative, primary, or deeply-researched sources over SEO/listicle content. Diversify across sources where reasonable.

Research request:
${query}

Use the web_search tool as many times as needed. When you are done, respond with ONLY a JSON object in this exact shape, wrapped in a single \`\`\`json code block:

{
  "results": [
    { "url": "...", "title": "...", "summary": "One to two sentence description of why this page is useful." }
  ]
}

Return exactly ${count} results. No commentary outside the JSON block.`

  const data = await callAnthropic(apiKey, model, {
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: Math.min(10, Math.max(3, Math.ceil(count / 2))),
      },
    ],
    messages: [{ role: "user", content: prompt }],
  })

  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim()

  const parsed = extractJson(text)
  if (!parsed) throw new Error("Could not parse results from Claude")
  return sanitizeSites(parsed.results).slice(0, count)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { BRAVE_API_KEY, ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = context.env

  if (!BRAVE_API_KEY && !ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server misconfigured: set BRAVE_API_KEY and/or ANTHROPIC_API_KEY" },
      { status: 500 },
    )
  }

  let query: string
  let count: number
  let rank: boolean
  try {
    const body = (await context.request.json()) as {
      query?: string
      count?: number
      rank?: boolean
    }
    query = (body.query ?? "").trim()
    const rawCount = Number(body.count)
    count = Number.isFinite(rawCount) ? Math.floor(rawCount) : 10
    rank = body.rank !== false
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

  try {
    if (BRAVE_API_KEY) {
      const candidates = await braveSearch(BRAVE_API_KEY, query, count * 2)
      if (candidates.length === 0) {
        return Response.json({ success: true, query, count, provider: "brave", results: [] })
      }

      if (rank && ANTHROPIC_API_KEY) {
        const model = ANTHROPIC_MODEL || DEFAULT_RANK_MODEL
        const ranked = await rerankWithClaude(ANTHROPIC_API_KEY, model, query, candidates, count)
        return Response.json({
          success: true,
          query,
          count,
          provider: "brave+claude",
          results: ranked,
        })
      }

      return Response.json({
        success: true,
        query,
        count,
        provider: "brave",
        results: candidates.slice(0, count),
      })
    }

    const model = ANTHROPIC_MODEL || DEFAULT_WEB_SEARCH_MODEL
    const results = await claudeWebSearch(ANTHROPIC_API_KEY as string, model, query, count)
    return Response.json({
      success: true,
      query,
      count,
      provider: "claude-web-search",
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 502 })
  }
}
