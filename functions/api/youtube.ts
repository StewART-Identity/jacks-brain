/**
 * POST /api/youtube
 *
 * Accepts a YouTube URL and triggers the youtube-catalog workflow via
 * GitHub Actions workflow_dispatch.
 *
 * Requires env vars (set in Cloudflare Pages dashboard):
 *   GITHUB_TOKEN  — fine-grained PAT with contents:write + actions:write
 *   GITHUB_REPO   — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[A-Za-z0-9_-]{11}/

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { GITHUB_TOKEN, GITHUB_REPO } = context.env

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return Response.json({ error: "Server misconfigured: missing GITHUB_TOKEN or GITHUB_REPO" }, { status: 500 })
  }

  try {
    const body = (await context.request.json()) as { url?: string }
    const url = body.url?.trim()

    if (!url) {
      return Response.json({ error: "No URL provided" }, { status: 400 })
    }

    if (!YOUTUBE_URL_PATTERN.test(url)) {
      return Response.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    // Trigger the youtube-catalog workflow
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/youtube-catalog.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-upload",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { youtube_url: url },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      return Response.json({ error: "GitHub workflow dispatch failed", details: err }, { status: 502 })
    }

    return Response.json({
      success: true,
      url,
      message: "YouTube catalog workflow triggered. A PR will be created with the results.",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
