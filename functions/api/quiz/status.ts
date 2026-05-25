/**
 * GET /api/quiz/status?slug=<slug>
 *
 * Returns the current quiz-question count for a wiki page on main.
 * The QuizSuggest button polls this to detect when newly-generated
 * questions have landed.
 *
 * Response: { slug, count, generated: ISO string }
 *
 * Why we count and don't just return the questions themselves: the
 * count is sufficient signal for the polling UI ("count went up =
 * success"), and keeps the response small. If the UI later wants to
 * display the new questions inline, we can extend this response.
 *
 * Required env vars:
 *   GITHUB_TOKEN — fine-grained PAT with contents:read
 *   GITHUB_REPO  — e.g. "StewART-Identity/jacks-brain"
 */

interface Env {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

const BRANCH = "main"

// Same allowlist as suggest.ts. Repeated here defensively rather than
// imported so the two endpoints stay decoupled.
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
// and functions/api/quiz/suggest.ts's identical list).
const SHELL_EXCLUSIONS = new Set<string>([
  "upskill/manage",
  "upskill/topics",
])

function isAllowedSlug(slug: string): boolean {
  if (slug.includes("..") || slug.startsWith("/") || slug.includes("\\")) {
    return false
  }
  if (slug.endsWith("/index") || slug.endsWith("/")) return false
  if (SHELL_EXCLUSIONS.has(slug)) return false
  for (const prefix of ALLOWED_SLUG_PREFIXES) {
    if (slug.startsWith(prefix) && slug.length > prefix.length) {
      return true
    }
  }
  return false
}

/**
 * Count the number of entries in a frontmatter `quiz:` array.
 *
 * We don't fully parse YAML — only count `- q:` lines under the
 * `quiz:` heading. This works because the suggest script writes
 * quiz entries in a fixed, predictable format (one `- q:` line per
 * entry, indented two spaces) and we control the writer. A full
 * YAML parser would be more robust but is overkill for a count.
 */
function countQuizEntries(markdown: string): number {
  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return 0
  const fm = fmMatch[1]

  // Find the quiz: block.
  const quizMatch = fm.match(/^quiz:\s*\n((?:[ \t]+.*\n?)*)/m)
  if (!quizMatch) return 0
  const block = quizMatch[1]

  // Count lines that look like `  - q:` (the start of an entry).
  // The exact indentation matches what suggest-quiz.mjs writes.
  const matches = block.match(/^\s*-\s*q\s*:/gm)
  return matches ? matches.length : 0
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
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

  const url = new URL(context.request.url)
  const slug = (url.searchParams.get("slug") ?? "").trim()
  if (!slug) {
    return Response.json({ error: "slug query parameter is required" }, { status: 400 })
  }
  if (!isAllowedSlug(slug)) {
    return Response.json({ error: `Slug not allowed: ${slug}` }, { status: 400 })
  }

  const path = `content/${slug}.md`

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.raw",
          "User-Agent": "jacks-brain-quiz",
        },
      },
    )

    if (res.status === 404) {
      return Response.json(
        { error: "Page not found", slug },
        { status: 404 },
      )
    }
    if (!res.ok) {
      return Response.json(
        { error: "GitHub fetch failed", status: res.status },
        { status: 502 },
      )
    }

    const markdown = await res.text()
    const count = countQuizEntries(markdown)

    return Response.json({
      slug,
      count,
      generated: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
