#!/usr/bin/env node

/**
 * suggest-quiz.mjs
 *
 * Uses Claude Code CLI to draft 2-3 quiz questions for a wiki page
 * and merge them into the page's frontmatter. Mirror of catalog.mjs
 * in structure but much narrower in scope — no document conversion,
 * no MCP, no retention log. Just: read page, call claude -p, parse
 * JSON, write page.
 *
 * Auth is via CLAUDE_CODE_OAUTH_TOKEN (Max plan OAuth token, the same
 * one catalog.mjs uses). No Anthropic API key needed.
 *
 * Usage:
 *   node scripts/suggest-quiz.mjs <slug>
 *
 * Where <slug> is a wiki page slug without leading slash, e.g.
 *   reflect/concepts/sasl
 *   reflect/sources/2026-05-02-rfc4513-txt
 *   notes/entries/graph-theory-glossary
 *
 * The script resolves the slug to content/<slug>.md, errors clearly
 * if the file doesn't exist, and exits 0 on success. The workflow's
 * commit step picks up the modified file and pushes.
 *
 * Behavior with existing quiz array:
 *   New questions are APPENDED to any existing quiz array. The prompt
 *   includes the existing questions so claude knows not to duplicate
 *   them. This means clicking "Add more questions" on a page that
 *   already has 3 questions yields 5-6 total, not 3.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"
import yaml from "js-yaml"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const CONTENT_DIR = join(ROOT, "content")

// How many questions to ask claude for in a single invocation.
// Three is a sweet spot — enough to give variety, few enough that
// each one gets real consideration in the prompt.
const QUESTIONS_PER_CALL = 3

// ---------------------------------------------------------------------------
// Frontmatter parsing and writing
// ---------------------------------------------------------------------------

/**
 * Parse a markdown file's frontmatter and body. Returns
 *   { frontmatter: object, body: string, rawFm: string }
 *
 * `rawFm` is the original frontmatter text (without the --- fences),
 * preserved so callers that don't need to modify all fields can write
 * back a near-identical file. We use rawFm + a targeted insert for
 * the quiz field rather than re-emitting the whole frontmatter from
 * the parsed object — js-yaml's emitter reorders fields, changes
 * quote styles, and generally produces a file diff that's much
 * larger than the actual change. Targeted insertion preserves
 * everything else byte-for-byte.
 */
function parseFile(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) {
    throw new Error("Page has no frontmatter")
  }
  const rawFm = m[1]
  const body = m[2] ?? ""
  const frontmatter = yaml.load(rawFm) || {}
  return { frontmatter, body, rawFm }
}

/**
 * Format a quiz array as a YAML block for embedding in the file's
 * frontmatter. Produces the shape:
 *
 *   quiz:
 *     - q: "Question text"
 *       a: "Answer text"
 *       added: 2026-05-25
 *
 * Uses block style (not flow style) for readability. We hand-roll
 * this rather than calling yaml.dump on { quiz: [...] } because
 * yaml.dump tends to emit flow style for short arrays and the
 * formatting differs from the rest of the existing frontmatter.
 */
function formatQuizYaml(quizArray) {
  const lines = ["quiz:"]
  for (const entry of quizArray) {
    lines.push(`  - q: ${yamlString(entry.q)}`)
    lines.push(`    a: ${yamlString(entry.a)}`)
    if (entry.added) {
      lines.push(`    added: ${entry.added}`)
    }
  }
  return lines.join("\n")
}

/**
 * YAML-quote a string. We always double-quote and escape backslashes
 * and double quotes, which is correct for any string (even those
 * without special characters). Simpler than trying to detect when
 * quotes are unnecessary.
 */
function yamlString(s) {
  const escaped = String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")
  return `"${escaped}"`
}

/**
 * Today's date in YYYY-MM-DD form, in USER_TIMEZONE if set. Same
 * pattern catalog.mjs uses.
 */
function todayInUserTimezone() {
  const tz = process.env.USER_TIMEZONE || "UTC"
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

// ---------------------------------------------------------------------------
// Claude Code CLI invocation
// ---------------------------------------------------------------------------

/**
 * Ask claude for quiz questions on a page. Returns an array of
 * { q, a } objects. Throws if claude can't produce valid JSON.
 *
 * Why structured JSON output: free-text answers from an LLM would
 * need brittle regex parsing. JSON is unambiguous and validates in
 * one step.
 */
function generateQuestions({ title, summary, body, existingQuiz }) {
  const existingBlock = existingQuiz.length > 0
    ? "Existing quiz questions on this page (do NOT duplicate these):\n" +
      existingQuiz.map((q, i) => `${i + 1}. Q: ${q.q}\n   A: ${q.a}`).join("\n\n") +
      "\n\n"
    : ""

  const prompt = `You are drafting quiz questions for a personal knowledge wiki. The user uses these questions for free-recall study — they read the question, think of the answer in their head, then reveal the canonical answer and self-grade whether they got it.

The wiki page below is the source material. Read it, identify the LOAD-BEARING ideas (not trivia, not "what does paragraph N say"), and draft exactly ${QUESTIONS_PER_CALL} questions.

Title: ${title}
${summary ? `Summary: ${summary}\n` : ""}
${existingBlock}Page body:
${body}

---

Your task: draft ${QUESTIONS_PER_CALL} quiz questions that test the most important ideas on this page.

Rules:
- Each question should test a CONCEPTUAL understanding, not a memorized phrase or trivia detail.
- Answers must be 1-3 sentences, short enough to read in 5-10 seconds.
- Do NOT ask questions about formatting, page structure, or "what section is X discussed in".
- Do NOT duplicate the existing questions listed above.
- Prefer "why" and "how" questions over "what" questions where the page supports them.
- If the page mentions specific names, dates, or numbers, those are usually NOT good quiz material unless they're load-bearing.

Output format: a single JSON array of objects with "q" and "a" string fields. Output ONLY the JSON — no surrounding prose, no markdown code fences, no commentary. Example shape:

[
  {"q": "Question text here", "a": "Answer text here"},
  {"q": "Second question", "a": "Second answer"},
  {"q": "Third question", "a": "Third answer"}
]`

  console.log(`Calling claude -p for ${title}...`)

  let raw
  try {
    raw = execFileSync("claude", [
      "-p",
      "--output-format", "text",
      "--max-turns", "1",
    ], {
      input: prompt,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      cwd: ROOT,
      timeout: 180_000,
    })
  } catch (err) {
    if (err.stdout) console.log("claude stdout:", err.stdout.slice(0, 2000))
    if (err.stderr) console.error("claude stderr:", err.stderr.slice(0, 2000))
    throw new Error(`claude -p failed: ${err.message}`)
  }

  // Strip whitespace and any accidental markdown fences. claude is
  // instructed not to emit fences but LLMs sometimes do anyway.
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "")
  cleaned = cleaned.replace(/\s*```\s*$/, "")
  cleaned = cleaned.trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    console.error("Raw claude output (first 2000 chars):")
    console.error(cleaned.slice(0, 2000))
    throw new Error(`claude returned invalid JSON: ${err.message}`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error("claude returned non-array JSON")
  }

  const validated = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue
    const q = typeof item.q === "string" ? item.q.trim() : ""
    const a = typeof item.a === "string" ? item.a.trim() : ""
    if (!q || !a) continue
    validated.push({ q, a })
  }

  if (validated.length === 0) {
    throw new Error("claude returned no valid {q, a} entries")
  }

  return validated
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const slug = process.argv[2]
  if (!slug) {
    console.error("Usage: node scripts/suggest-quiz.mjs <slug>")
    console.error("Example: node scripts/suggest-quiz.mjs reflect/concepts/sasl")
    process.exit(1)
  }

  // Defense against path-traversal arguments. Slugs should never
  // contain "..", absolute paths, or backslashes.
  if (slug.includes("..") || slug.startsWith("/") || slug.includes("\\")) {
    console.error(`Refusing suspicious slug: ${slug}`)
    process.exit(1)
  }

  const filePath = join(CONTENT_DIR, slug + ".md")
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Reading: ${filePath}`)
  const text = readFileSync(filePath, "utf-8")
  const { frontmatter, body, rawFm } = parseFile(text)

  const title = typeof frontmatter.title === "string" ? frontmatter.title : slug
  const summary = typeof frontmatter.summary === "string" ? frontmatter.summary : ""
  const existingQuiz = Array.isArray(frontmatter.quiz) ? frontmatter.quiz : []

  const newQuestions = generateQuestions({
    title,
    summary,
    body,
    existingQuiz,
  })

  const today = todayInUserTimezone()
  const newEntries = newQuestions.map((q) => ({
    q: q.q,
    a: q.a,
    added: today,
  }))

  const combinedQuiz = [...existingQuiz, ...newEntries]

  // Targeted merge into rawFm. If a quiz: block exists, replace it
  // entirely. If not, append at the end.
  //
  // Regex matches a quiz: line and everything indented under it,
  // stopping at the next top-level key or end-of-block.
  const quizBlock = formatQuizYaml(combinedQuiz)
  let newRawFm
  const quizRegex = /^quiz:\s*\n(?:[ \t]+.*\n?)*/m
  if (quizRegex.test(rawFm)) {
    newRawFm = rawFm.replace(quizRegex, quizBlock + "\n")
  } else {
    // Append. Trim trailing whitespace from existing frontmatter so
    // the inserted block sits cleanly.
    newRawFm = rawFm.replace(/\s*$/, "") + "\n" + quizBlock
  }

  const newText = `---\n${newRawFm}\n---\n${body.startsWith("\n") ? "" : "\n"}${body}`

  writeFileSync(filePath, newText, "utf-8")
  console.log(`Wrote ${newEntries.length} new question(s) to ${filePath}`)
  console.log(`Total quiz entries on page: ${combinedQuiz.length}`)
}

main()
