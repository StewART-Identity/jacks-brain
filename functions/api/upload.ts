/**
 * POST /api/upload
 *
 * Accepts a file via multipart form data, commits the original to
 * static/originals/ in the GitHub repo. The catalog workflow triggers
 * automatically on push.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   GITHUB_TOKEN  — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Defense in depth — Cloudflare Access sets this header on every request
  // it lets through. If it's missing, the request didn't come via Access.
  const accessUser = context.request.headers.get("cf-access-authenticated-user-email")
  if (!accessUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }

  try {
    const formData = await context.request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content and base64 encode it
    const arrayBuffer = await file.arrayBuffer()
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    )

    // Build filename: use original name, or generate a date-prefixed one
    const today = new Date().toISOString().slice(0, 10)
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const filename = originalName.startsWith(today) ? originalName : `${today}-${originalName}`
    const path = `static/originals/${filename}`

    // Commit the file to the repo via GitHub Contents API
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
      }
    )

    if (!commitResponse.ok) {
      const err = await commitResponse.text()
      return Response.json({ error: "GitHub commit failed", details: err }, { status: 502 })
    }

    // The catalog workflow triggers automatically on push to static/originals/**

    return Response.json({
      success: true,
      filename,
      message: `File committed to ${path}. Catalog workflow triggered.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
