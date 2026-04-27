/**
 * /api/graph-layouts
 *
 * Persistent storage for the Graph View's saved layout positions.
 * Backs Tier 2 of the graph view — pinned node positions that survive
 * across page navigations. The graph rebuilds on every nav (each page's
 * local graph might be different), so anything not durably persisted is
 * lost the moment a user clicks a node.
 *
 * GET  → returns the current layouts file (or empty state if missing).
 *        Includes the file's GitHub blob `sha` for optimistic concurrency.
 *
 * POST → upserts the entire layouts file. Accepts both
 *        application/json AND text/plain content types because the
 *        client uses navigator.sendBeacon() for context-loss writes
 *        (visibilitychange, beforeunload), which only allows constrained
 *        Content-Type values when given a Blob body.
 *
 * Auth: trusts Cloudflare Access. Defense-in-depth check on
 * Cf-Access-Authenticated-User-Email.
 *
 * Concurrency: client passes back the sha it received from GET; if the
 * remote sha has moved, GitHub's PUT returns 409 and we surface that.
 * For this single-user wiki the chance of a true conflict is near zero,
 * but the plumbing is here for cleanliness.
 *
 * Requires env vars:
 *   GITHUB_TOKEN  — fine-grained PAT with contents:write
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface ContentResponse {
  content: string
  sha: string
  encoding: string
}

interface LayoutPosition {
  x: number
  y: number
}

interface Layout {
  name: string
  createdAt: string
  updatedAt: string
  positions: Record<string, LayoutPosition>
}

interface LayoutsFile {
  layouts: Record<string, Layout>
  activeLayout: string | null
}

interface PostBody extends LayoutsFile {
  sha?: string | null
}

const BRANCH = "main"
const LAYOUTS_PATH = "data/graph-layouts.json"

const EMPTY_STATE: LayoutsFile = {
  layouts: {},
  activeLayout: null,
}

function decodeBase64Utf8(b64: string): string {
  const cleaned = b64.replace(/\n/g, "")
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function encodeBase64Utf8(s: string): string {
  // btoa needs Latin-1; route through TextEncoder for safe UTF-8 → base64.
  const bytes = new TextEncoder().encode(s)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// ─── Validation ────────────────────────────────────────────────────────────
//
// The layouts file is small (kilobytes for hundreds of nodes), single-user,
// and lives in our own repo — but this endpoint is reachable from the
// browser, so we validate shape before writing. Anything that fails is a
// 400, not a write attempt.

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

function isSafeId(s: unknown): s is string {
  // Layout IDs are slugified names — same character set as page slugs,
  // length-bounded.
  if (typeof s !== "string" || s.length === 0 || s.length > 200) return false
  return /^[a-z0-9._-]+$/i.test(s)
}

function isSafeSlugKey(s: unknown): s is string {
  // Position keys are page slugs; they appear in the JSON file as object
  // keys. Allow the slug character set plus '/' for nested slugs (e.g.
  // "tags/foo"). No leading dots, no '..'.
  //
  // Special case: '/' alone is the legitimate slug for the wiki root
  // (the home/index page). Quartz's path utility produces it. We allow
  // it explicitly while still rejecting any *other* leading-slash key
  // as a path-traversal guard ("/etc/passwd", "/../foo", etc).
  if (typeof s !== "string" || s.length === 0 || s.length > 300) return false
  if (s.includes("..")) return false
  if (s.startsWith(".")) return false
  if (s !== "/" && s.startsWith("/")) return false
  return /^[a-z0-9._/-]+$/i.test(s)
}

function isReasonableName(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0 && s.length <= 200
}

function isIsoTimestamp(s: unknown): s is string {
  if (typeof s !== "string" || s.length === 0 || s.length > 40) return false
  // Loose ISO 8601 check — we just need to know this is a sane string,
  // not parse it.
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(s)
}

function validateLayoutsFile(body: unknown): { ok: true; value: LayoutsFile } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" }
  const b = body as Record<string, unknown>

  if (!b.layouts || typeof b.layouts !== "object" || Array.isArray(b.layouts)) {
    return { ok: false, error: "layouts must be an object" }
  }
  if (b.activeLayout !== null && typeof b.activeLayout !== "string") {
    return { ok: false, error: "activeLayout must be a string or null" }
  }

  // Cap total layouts. Generous, but caps any pathological writer.
  const layoutEntries = Object.entries(b.layouts as Record<string, unknown>)
  if (layoutEntries.length > 100) {
    return { ok: false, error: "Too many layouts (max 100)" }
  }

  for (const [id, raw] of layoutEntries) {
    if (!isSafeId(id)) return { ok: false, error: `Invalid layout id: ${id}` }
    if (!raw || typeof raw !== "object") return { ok: false, error: `Layout ${id} must be an object` }
    const layout = raw as Record<string, unknown>

    if (!isReasonableName(layout.name)) return { ok: false, error: `Layout ${id} has invalid name` }
    if (!isIsoTimestamp(layout.createdAt)) return { ok: false, error: `Layout ${id} has invalid createdAt` }
    if (!isIsoTimestamp(layout.updatedAt)) return { ok: false, error: `Layout ${id} has invalid updatedAt` }

    if (!layout.positions || typeof layout.positions !== "object" || Array.isArray(layout.positions)) {
      return { ok: false, error: `Layout ${id} positions must be an object` }
    }

    const positionEntries = Object.entries(layout.positions as Record<string, unknown>)
    // Cap per-layout positions. A wiki with 10k pages would still fit.
    if (positionEntries.length > 10000) {
      return { ok: false, error: `Layout ${id} has too many positions` }
    }
    for (const [slug, pos] of positionEntries) {
      if (!isSafeSlugKey(slug)) return { ok: false, error: `Layout ${id} has invalid slug key: ${slug}` }
      if (!pos || typeof pos !== "object") return { ok: false, error: `Layout ${id} position for ${slug} must be an object` }
      const p = pos as Record<string, unknown>
      if (!isFiniteNumber(p.x) || !isFiniteNumber(p.y)) {
        return { ok: false, error: `Layout ${id} position for ${slug} must have finite x,y` }
      }
    }
  }

  // activeLayout, if set, must reference an existing layout (or be null)
  if (b.activeLayout !== null && !((b.activeLayout as string) in (b.layouts as object))) {
    return { ok: false, error: `activeLayout references unknown layout: ${b.activeLayout}` }
  }

  return {
    ok: true,
    value: {
      layouts: b.layouts as Record<string, Layout>,
      activeLayout: b.activeLayout as string | null,
    },
  }
}

// ─── Body parsing ──────────────────────────────────────────────────────────
//
// sendBeacon allows only a few Content-Types when posting a Blob. We
// accept both application/json and text/plain so beacon writes work
// without preflight surprises, and parse the body ourselves.

async function parseJsonLikeBody(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const ct = (req.headers.get("content-type") || "").toLowerCase()
  if (!ct.includes("application/json") && !ct.includes("text/plain")) {
    return { ok: false, error: "Content-Type must be application/json or text/plain" }
  }
  let text: string
  try {
    text = await req.text()
  } catch {
    return { ok: false, error: "Failed to read body" }
  }
  if (!text) return { ok: false, error: "Empty body" }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, error: "Invalid JSON" }
  }
}

// ─── Endpoints ─────────────────────────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}`
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jacks-brain-graph-layouts",
  }

  const res = await fetch(`${api}/contents/${LAYOUTS_PATH}?ref=${BRANCH}`, { headers })
  if (res.status === 404) {
    // First-run: file doesn't exist yet. Empty state, no sha.
    return Response.json({ ...EMPTY_STATE, sha: null })
  }
  if (!res.ok) {
    const text = await res.text()
    return Response.json(
      { error: `GitHub read failed: ${res.status} ${text}` },
      { status: 502 },
    )
  }

  const file = (await res.json()) as ContentResponse
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeBase64Utf8(file.content))
  } catch {
    return Response.json(
      { error: "Stored layouts file is not valid JSON" },
      { status: 502 },
    )
  }

  const validation = validateLayoutsFile(parsed)
  if (!validation.ok) {
    return Response.json(
      { error: `Stored layouts file is invalid: ${validation.error}` },
      { status: 502 },
    )
  }

  return Response.json({ ...validation.value, sha: file.sha })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const parsedBody = await parseJsonLikeBody(context.request)
  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: 400 })
  }

  const validation = validateLayoutsFile(parsedBody.value)
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  // sha may be present (update) or omitted (first-time create)
  const incomingSha = (parsedBody.value as PostBody).sha ?? null
  if (incomingSha !== null && (typeof incomingSha !== "string" || incomingSha.length === 0)) {
    return Response.json({ error: "sha must be a non-empty string or null" }, { status: 400 })
  }

  const api = `https://api.github.com/repos/${GITHUB_REPO}`
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jacks-brain-graph-layouts",
  }

  // Serialize with stable spacing — the file is human-readable in git
  // diffs, which matters because git is the storage layer.
  const newJson = JSON.stringify(validation.value, null, 2) + "\n"
  const newContentB64 = encodeBase64Utf8(newJson)

  // Build the PUT body. If the client gave us a sha, send it along; if
  // not (first-time create), omit. GitHub's Contents API requires sha
  // on update, rejects sha on create, and 409s on stale sha.
  const layoutCount = Object.keys(validation.value.layouts).length
  const putBody: Record<string, unknown> = {
    message: `update graph layouts (${layoutCount} layout${layoutCount === 1 ? "" : "s"})`,
    content: newContentB64,
    branch: BRANCH,
  }
  if (incomingSha) putBody.sha = incomingSha

  const putRes = await fetch(`${api}/contents/${LAYOUTS_PATH}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(putBody),
  })

  if (putRes.status === 409) {
    return Response.json(
      { error: "Layouts file changed since you last read it. Reload to merge." },
      { status: 409 },
    )
  }
  if (!putRes.ok) {
    const text = await putRes.text()
    return Response.json(
      { error: `GitHub write failed: ${putRes.status} ${text}` },
      { status: 502 },
    )
  }

  // Pull the new sha out of the PUT response so the client can use it
  // for its next write without an extra GET.
  let newSha: string | null = null
  try {
    const putJson = (await putRes.json()) as { content?: { sha?: string } }
    newSha = putJson.content?.sha ?? null
  } catch {
    // Not fatal — client can refetch.
  }

  return Response.json({ ok: true, sha: newSha })
}
