/**
 * POST /api/url
 *
 * Accepts a URL, fetches its content, and commits a markdown file to
 * static/originals/. The catalog workflow triggers automatically on push.
 *
 * Two paths based on URL detection:
 *
 *  - YouTube URLs (youtube.com, youtu.be, m.youtube.com, including /watch,
 *    /shorts, /embed): routed through Supadata's transcript API. Supadata
 *    handles the YouTube anti-bot infrastructure on residential IPs, with
 *    Whisper fallback for videos without native captions.
 *
 *  - All other http(s) URLs: existing HTML-fetch + readability-extraction
 *    path. No external dependencies.
 *
 * Requires env vars:
 *   GITHUB_TOKEN     — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO      — e.g. "StewART-Identity/jacks-brain"
 *   SUPADATA_API_KEY — required only for the YouTube path; missing key
 *                       returns a 500 with a clear "feature disabled"
 *                       message when a YouTube URL is submitted.
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  SUPADATA_API_KEY?: string
}

// ─── HTML entity decoding (shared, used by the HTML extraction path) ────────

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

// Title → filename-safe slug. Lowercase, hyphen-separated, truncated to 60
// chars. Same shape the catalog pipeline expects for source-page slugs.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

// ─── YouTube URL detection ─────────────────────────────────────────────────

/**
 * Recognize URLs that point at a YouTube video (any host variant, any path
 * shape YouTube supports). Returns the 11-character video ID, or null if
 * the URL is not a YouTube video URL.
 *
 * We're explicit about the host check rather than using a single regex
 * because YouTube has accumulated URL shapes over the years and the rules
 * differ per host:
 *
 *   - youtube.com, www.youtube.com, m.youtube.com  → /watch?v=ID, /shorts/ID,
 *     /embed/ID, /v/ID (legacy)
 *   - youtu.be                                       → /ID (path is the ID)
 *   - music.youtube.com                              → same as youtube.com
 *
 * Anything else (a youtube.com/channel/... or /playlist?list=... URL) returns
 * null and falls through to the regular web-page path. We intentionally do
 * not support playlist or channel URLs in this iteration — they would need
 * different handling, and the user-facing behavior is "this isn't a video,
 * we'll try to fetch it as a web page" which is a reasonable degradation.
 */
function extractYouTubeVideoId(parsed: URL): string | null {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "")
  const path = parsed.pathname

  // youtu.be/<videoId> — path component is the entire video ID
  if (host === "youtu.be") {
    const m = path.match(/^\/([A-Za-z0-9_-]{11})(?:\/|$)/)
    return m ? m[1] : null
  }

  // youtube.com (incl. m.youtube.com, music.youtube.com) — multiple shapes
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    // /watch?v=<videoId>
    if (path === "/watch") {
      const v = parsed.searchParams.get("v")
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v
      return null
    }
    // /shorts/<videoId>, /embed/<videoId>, /v/<videoId>
    const m = path.match(/^\/(?:shorts|embed|v)\/([A-Za-z0-9_-]{11})(?:\/|$)/)
    if (m) return m[1]
  }

  return null
}

// ─── Supadata API client ───────────────────────────────────────────────────

/**
 * Shape of a single segment in Supadata's timestamped transcript response.
 * Other fields may exist; we only use what we read.
 */
interface SupadataSegment {
  text: string
  offset: number       // ms from video start
  duration?: number    // ms — present but unused
  lang?: string
}

/**
 * Synchronous transcript response (200). The other shape (202 with jobId)
 * is handled separately as a "not yet supported" branch.
 */
interface SupadataTranscriptResponse {
  content: SupadataSegment[] | string
  lang: string
  availableLangs?: string[]
}

interface SupadataJobResponse {
  jobId: string
}

/**
 * Supadata metadata response. We read title and channel only; other fields
 * (thumbnail, view counts, etc.) exist but aren't useful for cataloging.
 */
interface SupadataMetadata {
  title?: string
  channel?: {
    name?: string
    id?: string
  }
  // Older Supadata responses use a flat shape; tolerate both.
  channelName?: string
  duration?: number
}

const SUPADATA_BASE = "https://api.supadata.ai/v1"

/**
 * Fetch a transcript from Supadata. Returns one of:
 *
 *   { kind: "transcript", segments?, text, lang }       — usable transcript
 *   { kind: "job", jobId }                              — long video, async
 *   { kind: "error", status, message }                  — Supadata-side failure
 *
 * mode='auto' tells Supadata: try native captions first, fall back to AI
 * generation. Roughly equivalent to what the old yt-dlp + Whisper script
 * tried to do, except Supadata is doing it on infrastructure that actually
 * works against today's YouTube anti-bot.
 *
 * text=false: get timestamped segments. We could ask for plain text by
 * passing text=true, but timestamped segments let us produce a cleanly
 * formatted transcript with periodic [HH:MM:SS] anchors that make it
 * trivial to jump back to the video at a specific point. The downside is
 * a slightly larger response payload; for normal YouTube content it's a
 * few KB difference, well worth the navigability gain.
 */
async function fetchSupadataTranscript(
  apiKey: string,
  videoUrl: string,
): Promise<
  | { kind: "transcript"; segments: SupadataSegment[] | null; text: string; lang: string }
  | { kind: "job"; jobId: string }
  | { kind: "error"; status: number; message: string }
> {
  const url = new URL(`${SUPADATA_BASE}/transcript`)
  url.searchParams.set("url", videoUrl)
  url.searchParams.set("mode", "auto")
  url.searchParams.set("text", "false") // we want segments for timestamping
  url.searchParams.set("lang", "en")    // ask for English; Supadata falls back to first available

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    return { kind: "error", status: 0, message: `Supadata fetch failed: ${message}` }
  }

  // 200 = transcript ready; 202 = job dispatched; everything else = error.
  if (res.status === 202) {
    let body: SupadataJobResponse
    try {
      body = (await res.json()) as SupadataJobResponse
    } catch {
      return { kind: "error", status: 202, message: "Supadata returned 202 but body was not parseable" }
    }
    return { kind: "job", jobId: body.jobId }
  }

  if (!res.ok) {
    let detail = ""
    try {
      const errBody = await res.json() as { message?: string; error?: string }
      detail = errBody.message || errBody.error || ""
    } catch {
      try { detail = await res.text() } catch {}
    }
    return {
      kind: "error",
      status: res.status,
      message: `Supadata ${res.status}: ${detail || res.statusText || "unknown error"}`,
    }
  }

  let body: SupadataTranscriptResponse
  try {
    body = (await res.json()) as SupadataTranscriptResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : "JSON parse failed"
    return { kind: "error", status: 200, message: `Supadata response was not valid JSON: ${message}` }
  }

  // The content field is either an array (segments) or a string (flat text).
  // Defensive: we requested text=false, so we expect segments, but tolerate
  // either shape rather than crashing if Supadata behavior shifts.
  if (Array.isArray(body.content)) {
    const segments = body.content
    const text = segments.map(s => s.text).join(" ").replace(/\s+/g, " ").trim()
    return { kind: "transcript", segments, text, lang: body.lang || "en" }
  }
  if (typeof body.content === "string") {
    return { kind: "transcript", segments: null, text: body.content.trim(), lang: body.lang || "en" }
  }
  return {
    kind: "error",
    status: 200,
    message: "Supadata returned 200 but content was neither segments nor text",
  }
}

/**
 * Fetch YouTube video metadata (title, channel) from Supadata.
 *
 * Returns null on any failure; callers must tolerate that. We don't surface
 * metadata failure as a hard error because the transcript is the meat of
 * what we want — if metadata is unavailable, "YouTube Video (videoId)" is
 * a graceful fallback for the title and the catalog pipeline can still
 * generate a usable source page from the transcript content.
 */
async function fetchSupadataMetadata(apiKey: string, videoUrl: string): Promise<SupadataMetadata | null> {
  const url = new URL(`${SUPADATA_BASE}/metadata`)
  url.searchParams.set("url", videoUrl)
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "x-api-key": apiKey, Accept: "application/json" },
    })
    if (!res.ok) return null
    return (await res.json()) as SupadataMetadata
  } catch {
    return null
  }
}

// ─── Transcript formatting ─────────────────────────────────────────────────

/**
 * Format milliseconds-from-start as an HH:MM:SS or MM:SS string. Drops the
 * hour component when the video is under an hour; gives us [3:42] for a
 * short video and [1:03:42] for a long one without redundant zeroes.
 */
function formatTimestamp(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Insert a bold-bracketed timestamp marker into the transcript every ~2
 * minutes of video time. The output is one long flowing paragraph with
 * occasional "**[12:34]**" anchors a reader can scan for and a wiki reader
 * can click through to jump to the corresponding video moment via the
 * YouTube URL fragment ?t=NNN (which we do NOT auto-link in markdown —
 * that's a future enhancement; the catalog Claude can decide whether to
 * surface it).
 *
 * For very short videos (under 2 minutes), we get the leading [0:00] marker
 * only, which is fine.
 *
 * Threshold of 2 minutes is a balance: more frequent → choppier reading;
 * less frequent → harder to navigate. Matches what the old
 * scripts/youtube-transcript.mjs did, which was a reasonable default.
 */
const TIMESTAMP_INTERVAL_MS = 2 * 60 * 1000

function formatTimestampedTranscript(segments: SupadataSegment[]): string {
  if (segments.length === 0) return ""
  const parts: string[] = []
  let lastMarkerMs = -Infinity
  for (const seg of segments) {
    if (seg.offset - lastMarkerMs >= TIMESTAMP_INTERVAL_MS) {
      // Leading newline before each marker except the first marker (where
      // we want it to sit on its own line at the very top).
      const prefix = parts.length === 0 ? "" : "\n\n"
      parts.push(`${prefix}**[${formatTimestamp(seg.offset)}]**\n`)
      lastMarkerMs = seg.offset
    }
    parts.push(seg.text)
  }
  return parts.join(" ").replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").trim()
}

// ─── HTML readability extraction (existing non-YouTube path) ───────────────

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

// ─── GitHub commit helper ──────────────────────────────────────────────────

/**
 * Write a markdown file to static/originals/<filename> on main.
 *
 * Returns { ok: true, path } on success, or { ok: false, status, error }
 * on failure. Used by both the YouTube and HTML paths so they share one
 * commit code path — easier to keep consistent.
 */
async function commitOriginal(
  env: Env,
  filename: string,
  markdown: string,
  commitMessage: string,
): Promise<{ ok: true; path: string } | { ok: false; status: number; error: string }> {
  const path = `static/originals/${filename}`

  // UTF-8 encode then base64. Same pattern as functions/api/upload.ts —
  // a TextEncoder pass first to handle multibyte characters correctly,
  // then base64 over the raw bytes.
  const bytes = new TextEncoder().encode(markdown)
  let binary = ""
  // Chunked construction to avoid the "Maximum call stack size exceeded"
  // error from String.fromCharCode.apply on very large transcripts (a
  // long video can produce a few hundred KB of text — well within Worker
  // limits but enough to blow the implicit argument-count cap).
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
    try { err = await res.text() } catch {}
    return { ok: false, status: res.status, error: err || res.statusText }
  }

  return { ok: true, path }
}

// ─── Request handler ───────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Defense in depth — Cloudflare Access sets this header on every request
  // it lets through. If it's missing, the request didn't come via Access.
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

  const today = new Date().toISOString().slice(0, 10)

  // ─── YouTube branch ─────────────────────────────────────────────────────

  const videoId = extractYouTubeVideoId(parsed)
  if (videoId) {
    const { SUPADATA_API_KEY } = context.env
    if (!SUPADATA_API_KEY) {
      return Response.json(
        {
          error: "YouTube uploads disabled: SUPADATA_API_KEY is not configured. " +
            "Set it in the Cloudflare Pages dashboard under Settings → Variables and Secrets.",
        },
        { status: 500 },
      )
    }

    // Canonical URL for both Supadata calls and the markdown frontmatter.
    // Strips tracking params, query parameters like ?si=..., and any other
    // noise — Supadata only needs the bare video URL.
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Fetch metadata and transcript in parallel. Metadata is best-effort;
    // the transcript is essential. We let Promise.all run both so we don't
    // sequentially block on the metadata call.
    const [metadata, transcriptResult] = await Promise.all([
      fetchSupadataMetadata(SUPADATA_API_KEY, canonicalUrl),
      fetchSupadataTranscript(SUPADATA_API_KEY, canonicalUrl),
    ])

    // Async-job path: not built yet. Surface clearly so we know if a video
    // long enough to trigger it ever comes through. When we hit this for
    // real, the fix is to add a polling loop against /transcript/:jobId
    // with a reasonable timeout (Supadata typically completes in <60s).
    if (transcriptResult.kind === "job") {
      return Response.json(
        {
          error:
            "Video is long enough to require async transcription. The " +
            "current /api/url implementation only handles synchronous " +
            "responses. Job ID: " + transcriptResult.jobId + ". " +
            "Polling support is the next iteration of this feature.",
        },
        { status: 503 },
      )
    }

    if (transcriptResult.kind === "error") {
      // Supadata-side failures: forward the status and message so the
      // upload UI can show something useful. 404 from Supadata typically
      // means "no transcript available and AI generation also failed",
      // which is genuinely a 422 (unprocessable entity) on our side.
      const status = transcriptResult.status === 404 ? 422 : 502
      return Response.json(
        { error: transcriptResult.message },
        { status },
      )
    }

    // Build the markdown. Title and channel come from metadata when
    // available, with reasonable fallbacks. Transcription method is
    // surfaced in frontmatter so the catalog Claude can mention it.
    const title = metadata?.title || `YouTube Video (${videoId})`
    const channel = metadata?.channel?.name || metadata?.channelName || "Unknown Channel"
    const transcriptBody = transcriptResult.segments
      ? formatTimestampedTranscript(transcriptResult.segments)
      : transcriptResult.text

    // Minimum content guard: if Supadata returned an empty transcript,
    // refuse rather than committing an empty source page. This shouldn't
    // happen on the 200 path but defense-in-depth — bug in transcript
    // service shouldn't poison the wiki.
    if (!transcriptBody || transcriptBody.length < 40) {
      return Response.json(
        { error: "Transcript came back empty or too short to catalog" },
        { status: 422 },
      )
    }

    const slug = slugify(title) || slugify(videoId)
    const filename = `${today}-${slug}.md`

    const frontmatter =
      `---\n` +
      `source_type: youtube-video\n` +
      `title: "${title.replace(/"/g, '\\"')}"\n` +
      `channel: "${channel.replace(/"/g, '\\"')}"\n` +
      `url: "${canonicalUrl}"\n` +
      `video_id: ${videoId}\n` +
      `date: ${today}\n` +
      `transcript_language: ${transcriptResult.lang}\n` +
      `---\n\n`

    const markdown =
      `${frontmatter}` +
      `# ${title}\n\n` +
      `Source: ${channel} | [Watch on YouTube](${canonicalUrl}) | Transcribed: ${today}\n\n` +
      `## Transcript\n\n` +
      `${transcriptBody}\n`

    const commitResult = await commitOriginal(
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
      title,
      url: canonicalUrl,
      source_type: "youtube-video",
      message: `YouTube video committed to ${commitResult.path}. Catalog workflow triggered.`,
    })
  }

  // ─── Generic web-page branch (existing path, unchanged behavior) ────────

  let html: string
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; jacks-brain-catalog/1.0; +https://github.com/StewART-Identity/jacks-brain)",
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

  const slug = slugify(title) || slugify(parsed.hostname + parsed.pathname) || "url"
  const filename = `${today}-${slug}.md`

  const frontmatter =
    `---\n` +
    `source_type: web-page\n` +
    `title: "${title.replace(/"/g, '\\"')}"\n` +
    `url: "${url}"\n` +
    `date: ${today}\n` +
    `---\n\n`
  const markdown = `${frontmatter}# ${title}\n\nSource: [${parsed.hostname}](${url}) | Fetched: ${today}\n\n${body}\n`

  const commitResult = await commitOriginal(
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
    title,
    url,
    source_type: "web-page",
    message: `Page committed to ${commitResult.path}. Catalog workflow triggered.`,
  })
}
