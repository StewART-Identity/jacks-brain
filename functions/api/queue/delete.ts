/**
 * POST /api/queue/delete
 *
 * Deletes one or more files from static/queue/. Used by the Acquisition
 * page to cancel PENDING acquisitions before they're promoted to
 * static/in-flight/ for cataloging.
 *
 * Request body (JSON):
 *   { "filenames": ["foo.docx", "2026-05-02-bar.pdf"] }
 *
 * The filenames are basenames within static/queue/. Path separators and
 * any attempt to escape the directory are rejected.
 *
 * Response:
 *   {
 *     "results": [
 *       { "filename": "foo.docx", "success": true },
 *       { "filename": "2026-05-02-bar.pdf", "success": false, "reason": "already_promoted" }
 *     ]
 *   }
 *
 * Each filename gets an independent result. A 404 from the GitHub Contents
 * API (file not found) is treated as "already_promoted" because the
 * promotion step in catalog.yml moves files out of static/queue/ as the
 * queue drains; the Acquisition page may show a row as PENDING that is
 * in the middle of being promoted by the time the deletion reaches GitHub.
 *
 * Auth: requires Cloudflare Access (cf-access-authenticated-user-email
 * header), same as /api/upload and /api/nuke.
 *
 * Required env vars:
 *   GITHUB_TOKEN — fine-grained PAT with contents:write
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface DeleteRequestBody {
  filenames: string[]
}

interface DeleteResult {
  filename: string
  success: boolean
  reason?: "already_promoted" | "invalid_filename" | "github_error"
  detail?: string
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "jacks-brain-queue-delete",
  }
}

/**
 * Validate that a filename is a plain basename safe to use under
 * static/queue/. Rejects: empty strings, anything with a path separator,
 * anything that starts with a dot (hidden files like .gitkeep we don't
 * want to delete), anything outside the allowed character set we use
 * for acquisitions.
 */
function isValidQueueFilename(name: string): boolean {
  if (typeof name !== "string" || name.length === 0) return false
  if (name.length > 255) return false
  if (name.includes("/") || name.includes("\\")) return false
  if (name.startsWith(".")) return false
  if (name === "." || name === "..") return false
  // Allow the same character set we use for upload-renamed files:
  // letters, digits, underscore, dot, hyphen.
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return false
  return true
}

/**
 * Delete a single file from static/queue/ via the GitHub Contents API.
 * The API requires the current SHA, so we have to GET first then DELETE.
 */
async function deleteOne(
  filename: string,
  token: string,
  repo: string,
): Promise<DeleteResult> {
  const path = `static/queue/${filename}`

  // First fetch the file metadata to get its SHA.
  const getRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    { headers: ghHeaders(token) },
  )

  if (getRes.status === 404) {
    // File isn't there. Most likely it was just promoted out of the queue
    // by the catalog workflow's promotion step.
    return { filename, success: false, reason: "already_promoted" }
  }

  if (!getRes.ok) {
    const detail = await getRes.text()
    return { filename, success: false, reason: "github_error", detail: detail.slice(0, 500) }
  }

  const meta = await getRes.json() as { sha?: string }
  if (!meta.sha) {
    return { filename, success: false, reason: "github_error", detail: "missing sha in metadata" }
  }

  // Now DELETE.
  const delRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    {
      method: "DELETE",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `cancel from queue: ${filename}`,
        sha: meta.sha,
        branch: "main",
      }),
    },
  )

  if (delRes.status === 404 || delRes.status === 422) {
    // 404: file disappeared between GET and DELETE (promotion race).
    // 422: usually means the SHA was stale (file was rewritten).
    // Both are functionally "the file isn't there for us to delete anymore."
    return { filename, success: false, reason: "already_promoted" }
  }

  if (!delRes.ok) {
    const detail = await delRes.text()
    return { filename, success: false, reason: "github_error", detail: detail.slice(0, 500) }
  }

  return { filename, success: true }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }

  let body: DeleteRequestBody
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body || !Array.isArray(body.filenames) || body.filenames.length === 0) {
    return Response.json({ error: "Body must include a non-empty filenames array" }, { status: 400 })
  }

  if (body.filenames.length > 50) {
    return Response.json({ error: "Cannot delete more than 50 files in a single request" }, { status: 400 })
  }

  // Process deletions sequentially. Parallel deletions would each create
  // their own commit and could race on the rebase loop in unpleasant ways.
  // 50 files × ~500ms per deletion = 25s, well under the Pages function
  // 30s timeout.
  const results: DeleteResult[] = []
  for (const raw of body.filenames) {
    if (!isValidQueueFilename(raw)) {
      results.push({ filename: String(raw), success: false, reason: "invalid_filename" })
      continue
    }
    const result = await deleteOne(raw, GITHUB_TOKEN, GITHUB_REPO)
    results.push(result)
  }

  return Response.json({ results })
}
