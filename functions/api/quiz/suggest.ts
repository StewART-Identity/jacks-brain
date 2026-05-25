/**
 * POST /api/quiz/suggest
 *
 * Dispatches the quiz-suggest GitHub Actions workflow against a given
 * page slug. The workflow runs claude -p to draft quiz questions and
 * commits them into the page's frontmatter.
 *
 * Request body: { slug: "reflect/concepts/sasl" }
 *
 * Response (success): { success: true, slug, message }
 * Response (failure): { error, ... }, 4xx or 5xx
 *
 * This endpoint only fires off the workflow — it doesn't wait for it
 * to complete. The browser polls /api/quiz/status to detect when the
 * new quiz entries have landed in the page's frontmatter on main.
 *
 * Required env vars:
 *   GITHUB_TOKEN — fine-grained PAT with actions:write
 *                  (Note: this is the same secret used for repo content
 *                  operations elsewhere; if you're using a separate
 *                  WORKFLOW_DISPATCH_TOKEN, swap accordingly.)
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const BRANCH = "main"
const WORKFLOW_FILE = "quiz-suggest.yml"

// Slug prefixes we'll allow to be dispatched. Any page outside these
// directories is rejected — quiz questions only make sense on actual
// content pages, not on UI shells like /notes/write or /quiz/take.
const ALLOWED_SLUG_PREFIXES = [
  "reflect/concepts/",
  "reflect/entities/",
  "reflect/sources/",
  "reflect/synthesis/",
  "notes/entries/",
  "journal/entries/",
  "upskill/",
]

// UI-shell pages that match a quizzable prefix but aren't actual
// content (kept in sync with quartz.layout.ts's QUIZ_SHELL_EXCLUSIONS
// and functions/api/quiz/status.ts's identical list).
const SHELL_EXCLUSIONS = new Set<string>([
  "upskill/manage",
  "upskill/topics",
])

function isAllowedSlug(slug: string): boolean {
  // Reject any traversal attempts.
  if (slug.includes("..") || slug.startsWith("/") || slug.includes("\\")) {
    return false
  }
  // Reject index pages — we don't want to add quiz questions to
  // section landing pages.
  if (slug.endsWith("/index") || slug.endsWith("/")) return false
  // Reject known UI shells inside otherwise-allowed prefixes.
  if (SHELL_EXCLUSIONS.has(slug)) return false

  for (const prefix of ALLOWED_SLUG_PREFIXES) {
    if (slug.startsWith(prefix) && slug.length > prefix.length) {
      return true
    }
  }
  return false
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

  let body: { slug?: string }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const slug = (body.slug ?? "").trim()
  if (!slug) {
    return Response.json({ error: "slug is required" }, { status: 400 })
  }

  if (!isAllowedSlug(slug)) {
    return Response.json(
      { error: `Slug not allowed for quiz suggestion: ${slug}` },
      { status: 400 },
    )
  }

  try {
    // POST /repos/:owner/:repo/actions/workflows/:workflow_id/dispatches
    // Returns 204 on success, no body.
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "jacks-brain-quiz",
        },
        body: JSON.stringify({
          ref: BRANCH,
          inputs: {
            slug,
          },
        }),
      },
    )

    if (dispatchRes.status === 204) {
      return Response.json({
        success: true,
        slug,
        message: "Quiz suggestion workflow dispatched. The browser should poll /api/quiz/status to detect completion.",
      })
    }

    const errText = await dispatchRes.text()
    return Response.json(
      {
        error: "GitHub dispatch failed",
        status: dispatchRes.status,
        details: errText,
      },
      { status: 502 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
