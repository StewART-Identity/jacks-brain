/**
 * /api/links — read/write backing store for the Links Manager.
 *
 *   GET  → returns the current links structure plus the file's blob SHA.
 *          The SHA is required to commit an update (GitHub Contents API
 *          rejects an update that doesn't cite the prior blob SHA), so
 *          the manager fetches it on load and echoes it back on save.
 *
 *   POST → commits an edited structure back to content/application/
 *          links-data.json. Body: { sha, data } where `data` is the
 *          full { sections: [...] } object and `sha` is the blob SHA
 *          from the GET (or from a prior POST's response).
 *
 * Unlike /api/upload (append-only: every call writes a NEW file to the
 * queue), this endpoint read-modify-writes ONE evolving file. That's why
 * it needs the SHA dance: GitHub uses it for optimistic concurrency, so
 * a stale SHA (someone/another tab saved in between) fails loudly with a
 * 409 rather than silently clobbering. The manager surfaces that as a
 * "reload and retry" message.
 *
 * Requires env vars (Cloudflare Pages dashboard), same as upload.ts:
 *   GITHUB_TOKEN — fine-grained PAT with contents:write
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const FILE_PATH = "content/application/links-data.json"

interface LinkItem {
  id: string
  label: string
  url: string
  description: string
  public: boolean
}
interface LinkSection {
  id: string
  title: string
  links: LinkItem[]
}
interface LinksData {
  sections: LinkSection[]
}

// GitHub's contents API caps inline base64 reads at ~1MB; a links file is
// far smaller, so the simple contents endpoint is fine for both read and
// write.
function contentsUrl(env: Env): string {
  return `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${FILE_PATH}`
}

function ghHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "jacks-brain-links",
  }
}

// UTF-8 safe base64 encode (handles any characters in labels/descriptions —
// em-dashes, accents, etc. — that a naive btoa(string) would mangle).
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

// UTF-8 safe base64 decode (the contents API returns base64 with newlines).
function fromBase64(b64: string): string {
  const clean = b64.replace(/\n/g, "")
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Coerce arbitrary parsed JSON into a well-formed LinksData, dropping
// anything malformed. Defense against a hand-edited or partially-written
// file: the manager should always receive a usable shape rather than
// throwing on a missing field.
function sanitize(raw: any): LinksData {
  const sections: LinkSection[] = Array.isArray(raw?.sections)
    ? raw.sections.map((s: any) => ({
        id: String(s?.id ?? ""),
        title: String(s?.title ?? ""),
        links: Array.isArray(s?.links)
          ? s.links.map((l: any) => ({
              id: String(l?.id ?? ""),
              label: String(l?.label ?? ""),
              url: String(l?.url ?? ""),
              description: String(l?.description ?? ""),
              public: l?.public === true,
            }))
          : [],
      }))
    : []
  return { sections }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) return Response.json({ error: "Forbidden" }, { status: 403 })

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }

  try {
    const res = await fetch(contentsUrl(context.env), { headers: ghHeaders(context.env) })

    // File doesn't exist yet → return an empty structure with a null SHA.
    // A subsequent POST with sha:null creates it.
    if (res.status === 404) {
      return Response.json({ success: true, sha: null, data: { sections: [] } })
    }
    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: "GitHub read failed", details: err }, { status: 502 })
    }

    const json: any = await res.json()
    const decoded = fromBase64(json.content || "")
    let parsed: any = {}
    try {
      parsed = JSON.parse(decoded)
    } catch {
      // Corrupt file — hand back an empty structure but keep the real SHA
      // so a save can overwrite the bad content.
      return Response.json({ success: true, sha: json.sha, data: { sections: [] }, warning: "stored file was not valid JSON" })
    }

    return Response.json({ success: true, sha: json.sha, data: sanitize(parsed) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) return Response.json({ error: "Forbidden" }, { status: 403 })

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }

  let body: { sha?: string | null; data?: any }
  try {
    body = (await context.request.json()) as typeof body
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const data = sanitize(body.data)
  const serialized = JSON.stringify(data, null, 2) + "\n"

  const payload: Record<string, unknown> = {
    message: "links: update links-data.json",
    content: toBase64(serialized),
    branch: "main",
  }
  // Include sha for an update; omit it to create. GitHub requires the prior
  // sha on update and forbids it on create, so only set it when non-null.
  if (body.sha) payload.sha = body.sha

  try {
    const res = await fetch(contentsUrl(context.env), {
      method: "PUT",
      headers: ghHeaders(context.env),
      body: JSON.stringify(payload),
    })

    if (res.status === 409) {
      return Response.json(
        { error: "Conflict: the links file changed since you loaded it. Reload the page and reapply your edits." },
        { status: 409 },
      )
    }
    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: "GitHub commit failed", details: err }, { status: 502 })
    }

    const json: any = await res.json()
    // Hand back the new blob SHA so the manager can keep saving without a
    // reload (each save updates its in-memory SHA from this response).
    return Response.json({ success: true, sha: json.content?.sha ?? null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
