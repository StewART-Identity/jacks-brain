/**
 * /api/links — read/write backing store for the Links pipeline.
 *
 *   GET  → returns the current links structure plus the file's blob SHA.
 *   POST → commits an edited structure back to content/application/
 *          links-data.json. Body: { sha, data }.
 *
 * This endpoint is the single source of truth for link metadata. Both
 * the Manage editor and the Preview approval queue read and write through
 * it. It does NOT touch R2 — publishing the approved+public set to the
 * public bucket is a separate concern handled by /api/links-publish, so
 * that the GitHub write (the source of truth) can never be held hostage
 * to an R2 failure or a missing bucket binding.
 *
 * Data model (the publishing pipeline):
 *   Each link carries a lifecycle:
 *     status:      "pending" | "approved"
 *     destination: "public"  | "private"
 *   New links start pending/private (the safe default — nothing reaches a
 *   landing page until it's both approved AND has a destination). The
 *   Manage page sets the destination; the Preview page flips pending ->
 *   approved (or sends an item back to pending for revision).
 *
 *   Landing-page membership:
 *     Preview         = every PENDING item (the staging queue)
 *     Public Content  = APPROVED + destination "public"
 *     Private Content = APPROVED + destination "private"
 *
 * Migration: the prior model had a single `public: boolean`. sanitize()
 * maps any legacy item forward — public:true -> destination "public",
 * else "private" — and defaults status to "pending" so every legacy item
 * passes through the approval gate once (there is no production public
 * data to preserve; the only seeded item is the private example link).
 *
 * Requires env vars (Cloudflare Pages dashboard):
 *   GITHUB_TOKEN — fine-grained PAT with contents:write
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const FILE_PATH = "content/application/links-data.json"

type LinkStatus = "pending" | "approved"
type LinkDestination = "public" | "private"

interface LinkItem {
  id: string
  label: string
  url: string
  description: string
  status: LinkStatus
  destination: LinkDestination
}
interface LinkSection {
  id: string
  title: string
  links: LinkItem[]
}
interface LinksData {
  sections: LinkSection[]
}

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

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

function fromBase64(b64: string): string {
  const clean = b64.replace(/\n/g, "")
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Coerce arbitrary parsed JSON into a well-formed LinksData, applying the
// lifecycle defaults and migrating any legacy `public` boolean forward.
function coerceStatus(raw: any): LinkStatus {
  return raw === "approved" ? "approved" : "pending"
}
function coerceDestination(item: any): LinkDestination {
  if (item?.destination === "public") return "public"
  if (item?.destination === "private") return "private"
  // legacy migration: old single boolean
  if (item?.public === true) return "public"
  return "private"
}

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
              status: coerceStatus(l?.status),
              destination: coerceDestination(l),
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
    return Response.json({ success: true, sha: json.content?.sha ?? null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
