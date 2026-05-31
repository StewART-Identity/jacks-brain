/**
 * /api/links-publish — bake the public landing page into the R2 bucket.
 *
 * POST-only, Access-gated. Reads the canonical links-data.json from
 * GitHub, filters to the APPROVED + PUBLIC set, renders a self-contained
 * static HTML page (the neuron-hero "middle path" design, data
 * pre-rendered server-side so the public page ships zero JavaScript),
 * and writes it as index.html to the public R2 bucket. Served from the
 * bucket's custom domain at https://files.stewart-identity.com/.
 *
 * Triggered on approval of a public item by the Preview page. Best-effort
 * from the caller's perspective: the approval itself is already persisted
 * to GitHub by /api/links before this is called, so a failure here never
 * loses an approval — it just means the public page is briefly stale and
 * the next approval (or a manual re-publish) will catch it up.
 *
 * The neuron mark is inlined as a base64 data URI (read from GitHub at
 * publish time) so index.html is fully self-contained — the bucket needs
 * no other objects. The wiki's /static/neuron-hero.png can't be used
 * because that origin sits behind Cloudflare Access; a public visitor's
 * browser couldn't load it.
 *
 * Requires:
 *   GITHUB_TOKEN  — PAT with contents:read (same as links.ts)
 *   GITHUB_REPO   — "StewART-Identity/jacks-brain"
 *   PUBLIC_BUCKET — R2 binding to jacks-brain-public (set in the Pages
 *                   dashboard: Settings -> Functions -> R2 bucket
 *                   bindings -> variable name PUBLIC_BUCKET).
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  PUBLIC_BUCKET: {
    put: (key: string, value: string | ArrayBuffer, opts?: any) => Promise<any>
  }
}

const DATA_PATH = "content/application/links-data.json"
const NEURON_PATH = "quartz/static/neuron-hero.png"

function ghHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "jacks-brain-links-publish",
  }
}

function fromBase64(b64: string): string {
  const clean = b64.replace(/\n/g, "")
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Read a repo file via the Contents API. Returns { contentB64 } (the raw
// base64 the API hands back) or null on 404.
async function readFileB64(env: Env, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`
  const res = await fetch(url, { headers: ghHeaders(env) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub read failed for ${path}: ${res.status}`)
  const json: any = await res.json()
  return String(json.content || "")
}

// HTML-escape for safe interpolation into the generated page.
function esc(s: any): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Only http(s) and same-origin absolute paths are allowed as link targets.
function safeUrl(u: any): string | null {
  const s = String(u == null ? "" : u).trim()
  if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("/")) return s
  return null
}

interface PubLink { label: string; url: string; description: string }
interface PubSection { title: string; links: PubLink[] }

function collectPublic(parsed: any): PubSection[] {
  const out: PubSection[] = []
  const sections = Array.isArray(parsed?.sections) ? parsed.sections : []
  for (const s of sections) {
    const links = Array.isArray(s?.links) ? s.links : []
    const pub: PubLink[] = []
    for (const l of links) {
      if (l && l.status === "approved" && l.destination === "public") {
        const u = safeUrl(l.url)
        if (!u) continue // skip unusable URLs rather than emit a dead link
        pub.push({ label: String(l.label || u), url: u, description: String(l.description || "") })
      }
    }
    if (pub.length > 0) out.push({ title: String(s.title || ""), links: pub })
  }
  return out
}

function renderSectionsHtml(sections: PubSection[]): string {
  if (sections.length === 0) {
    return '<p class="state">Nothing here yet — check back soon.</p>'
  }
  return sections
    .map(function (sec) {
      const cards = sec.links
        .map(function (l) {
          const target = l.url.indexOf("http") === 0 ? ' target="_blank"' : ""
          const desc = l.description
            ? '<div class="link-desc">' + esc(l.description) + "</div>"
            : ""
          return (
            '<a class="link-card" href="' + esc(l.url) + '" rel="noopener noreferrer"' + target + ">" +
            '<div class="link-label">' + esc(l.label) + "</div>" +
            desc +
            "</a>"
          )
        })
        .join("\n")
      const title = sec.title ? "<h2>" + esc(sec.title) + "</h2>" : ""
      return '<section class="section">' + title + '<div class="links">' + cards + "</div></section>"
    })
    .join("\n")
}

function buildHtml(sections: PubSection[], neuronB64: string | null): string {
  const year = new Date().getFullYear()
  const neuronImg = neuronB64
    ? '<img src="data:image/png;base64,' + neuronB64.replace(/\n/g, "") + '" alt="Jack Stewart" />'
    : ""
  const body = renderSectionsHtml(sections)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Jack Stewart — Links</title>
<meta name="description" content="Curated links and documents from Jack Stewart, Identity & Access Management Engineer." />
<meta property="og:title" content="Jack Stewart — Links" />
<meta property="og:description" content="Curated links and documents." />
<meta property="og:type" content="website" />
<style>
  :root {
    --gold: #E8B62C;
    --ink: #1c1b18;
    --ink-soft: #5b5750;
    --paper: #faf8f3;
    --card: #ffffff;
    --line: #ece7db;
    --accent-tint: #fbf3da;
    --maxw: 680px;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--paper); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.55; -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: var(--maxw); margin: 0 auto; padding: 3.5rem 1.25rem 4rem; }
  .hero { text-align: center; margin-bottom: 2.75rem; }
  .hero img { width: 120px; height: 120px; object-fit: contain; filter: drop-shadow(0 4px 14px rgba(232,182,44,0.28)); }
  .hero h1 { font-size: 1.9rem; line-height: 1.15; margin: 1rem 0 0.25rem; letter-spacing: -0.01em; }
  .hero .tagline { color: var(--ink-soft); font-size: 1.02rem; margin: 0; }
  .hero .rule { width: 64px; height: 3px; background: var(--gold); border: 0; border-radius: 2px; margin: 1.5rem auto 0; }
  .section { margin-bottom: 2.5rem; }
  .section h2 { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--ink-soft); margin: 0 0 0.85rem; font-weight: 700; }
  .links { display: flex; flex-direction: column; gap: 0.7rem; }
  a.link-card {
    display: block; text-decoration: none; color: inherit;
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 0.95rem 1.1rem;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }
  a.link-card:hover { border-color: var(--gold); background: var(--accent-tint); box-shadow: 0 3px 14px rgba(232,182,44,0.14); }
  .link-label { font-weight: 650; font-size: 1.05rem; display: flex; align-items: center; gap: 0.4rem; }
  .link-label::after { content: "↗"; color: var(--gold); font-size: 0.95rem; opacity: 0.7; }
  .link-desc { color: var(--ink-soft); font-size: 0.92rem; margin-top: 0.25rem; }
  .state { text-align: center; color: var(--ink-soft); font-style: italic; padding: 2rem 0; }
  footer { text-align: center; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); color: var(--ink-soft); font-size: 0.82rem; }
  @media (max-width: 480px) { .wrap { padding-top: 2.5rem; } .hero img { width: 96px; height: 96px; } .hero h1 { font-size: 1.6rem; } }
</style>
</head>
<body>
  <main class="wrap">
    <header class="hero">
      ${neuronImg}
      <h1>Jack Stewart</h1>
      <p class="tagline">Identity &amp; Access Management Engineer</p>
      <hr class="rule" />
    </header>
    ${body}
    <footer>© ${year} Jack Stewart</footer>
  </main>
</body>
</html>
`
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) return Response.json({ error: "Forbidden" }, { status: 403 })

  const { GITHUB_TOKEN, GITHUB_REPO, PUBLIC_BUCKET } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }
  if (!PUBLIC_BUCKET || typeof PUBLIC_BUCKET.put !== "function") {
    return Response.json(
      { error: "Public bucket not bound. In the Pages project: Settings → Functions → R2 bucket bindings → bind jacks-brain-public to the variable PUBLIC_BUCKET." },
      { status: 503 },
    )
  }

  try {
    const dataB64 = await readFileB64(context.env, DATA_PATH)
    let parsed: any = { sections: [] }
    if (dataB64) {
      try { parsed = JSON.parse(fromBase64(dataB64)) } catch { parsed = { sections: [] } }
    }
    const sections = collectPublic(parsed)

    // neuron is optional — if the read fails, publish without the hero
    // rather than failing the whole publish.
    let neuronB64: string | null = null
    try { neuronB64 = await readFileB64(context.env, NEURON_PATH) } catch { neuronB64 = null }

    const html = buildHtml(sections, neuronB64)

    await context.env.PUBLIC_BUCKET.put("index.html", html, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    })

    const count = sections.reduce(function (n, s) { return n + s.links.length }, 0)
    return Response.json({ success: true, sections: sections.length, links: count })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
