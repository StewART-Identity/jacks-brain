#!/usr/bin/env node

/**
 * catalog.mjs
 *
 * Uses Claude Code CLI to view source documents in static/originals/ and
 * write structured wiki pages directly to content/. Uses your Max plan
 * via CLAUDE_CODE_OAUTH_TOKEN.
 *
 * Vocabulary:
 *   - An "acquisition" is a document that has landed in static/originals/.
 *     That's a human step — you put the file there; this script doesn't
 *     handle acquisition.
 *   - "Cataloging" is what this script does: produce wiki artifacts from
 *     an acquisition. A first catalog of a document creates its source
 *     page; a re-catalog (re-view) updates it in place.
 *   - A "view" is the act of examining a document's content during
 *     cataloging. The source page's `views:` frontmatter records each view.
 *
 * Binary files (.docx, .pdf) are converted to text first using pandoc/pdftotext.
 *
 * Usage:
 *   node scripts/catalog.mjs [file-path]    # catalog a specific file
 *   node scripts/catalog.mjs                # catalog all un-cataloged acquisitions
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { join, resolve, basename, relative, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync, execSync } from "node:child_process"
import { tmpdir } from "node:os"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const ORIGINALS_DIR = join(ROOT, "static", "originals")
const CONTENT_DIR = join(ROOT, "content")

const ALL_EXTENSIONS = new Set([
  ".md", ".txt", ".html", ".pdf", ".png", ".jpg", ".jpeg",
  ".gif", ".webp", ".doc", ".docx",
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Canonical slug derivation from any filename.
 *
 * A slug is the slug portion of a wiki source filename WITHOUT any leading
 * date prefix. The same raw filename and any of its previous wiki filenames
 * must produce the same slug so re-view detection works.
 *
 * Steps:
 *   1. Strip the file extension.
 *   2. Strip ALL leading YYYY-MM-DD- prefixes (previous bugs produced double
 *      prefixes like 2026-04-19-2026-04-18-foo.md; we must match those).
 *   3. Lowercase.
 *   4. Collapse any run of non-alphanumeric characters to a single hyphen.
 *      This handles the common input variations: underscores from exported
 *      Office filenames (Foo_Bar), spaces (Foo Bar), double hyphens from
 *      "(1)" suffixes like "Case_Study--1-" → "case-study-1".
 *   5. Trim leading/trailing hyphens.
 */
function slugify(filenameOrStem) {
  let s = filenameOrStem.replace(/\.[^.]+$/, "")           // drop extension
  s = s.replace(/^(\d{4}-\d{2}-\d{2}-)+/, "")              // drop date prefixes
  s = s.toLowerCase()
  s = s.replace(/[^a-z0-9]+/g, "-")                         // collapse separators
  s = s.replace(/^-+|-+$/g, "")                             // trim
  return s
}

/**
 * For a given acquisition filename (in originals/), find the existing wiki
 * source page whose slug matches — if any. Returns { path, firstCatalogDate }
 * or null. Used both for dedup (skip already-cataloged files from the
 * uncataloged scan) AND for re-view detection (so we know which existing
 * page to update in place).
 */
function findExistingSourcePage(acquisitionFilename) {
  const sourcesDir = join(CONTENT_DIR, "collection", "sources")
  if (!existsSync(sourcesDir)) return null
  const targetSlug = slugify(acquisitionFilename)

  for (const f of readdirSync(sourcesDir)) {
    if (!f.endsWith(".md")) continue
    if (slugify(f) !== targetSlug) continue
    // Extract the first date prefix as the "initial catalog date"
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-/)
    return {
      path: join(sourcesDir, f),
      filename: f,
      firstCatalogDate: m ? m[1] : null,
    }
  }
  return null
}

function findUncatalogedAcquisitions() {
  if (!existsSync(ORIGINALS_DIR)) return []
  const acquisitions = readdirSync(ORIGINALS_DIR).filter(
    (f) => f !== ".gitkeep" && ALL_EXTENSIONS.has(extname(f).toLowerCase()),
  )
  return acquisitions.filter((f) => findExistingSourcePage(f) === null)
}

/**
 * Convert binary files to plain text so Claude Code doesn't waste turns
 * trying to read them. Returns the path to a readable text file.
 */
function convertToText(sourcePath) {
  const ext = extname(sourcePath).toLowerCase()

  if ([".md", ".txt", ".html"].includes(ext)) {
    return sourcePath // already text
  }

  const tmpPath = join(tmpdir(), basename(sourcePath) + ".md")

  if ([".docx", ".doc"].includes(ext)) {
    console.log(`  Converting ${ext} to markdown with pandoc...`)
    try {
      execSync(`pandoc -f docx -t markdown -o "${tmpPath}" "${sourcePath}"`, {
        encoding: "utf-8",
        timeout: 60_000,
      })
      return tmpPath
    } catch (err) {
      console.error(`  pandoc failed, trying raw text extraction...`)
      // Fallback: extract raw text with strings
      try {
        const raw = execSync(`strings "${sourcePath}"`, { encoding: "utf-8", timeout: 30_000 })
        writeFileSync(tmpPath, raw)
        return tmpPath
      } catch {
        console.error(`  Could not extract text from ${ext} file`)
        return sourcePath
      }
    }
  }

  if (ext === ".pdf") {
    console.log(`  Converting PDF to text with pdftotext...`)
    try {
      execSync(`pdftotext "${sourcePath}" "${tmpPath}"`, {
        encoding: "utf-8",
        timeout: 60_000,
      })
      return tmpPath
    } catch {
      console.error(`  pdftotext failed, passing raw path to Claude Code`)
      return sourcePath
    }
  }

  // Images — pass directly, Claude Code can view them
  return sourcePath
}

// ---------------------------------------------------------------------------
// Claude Code CLI — let it read and write files directly
// ---------------------------------------------------------------------------

function catalogWithClaude(sourcePath) {
  const today = new Date().toISOString().slice(0, 10)
  const originalName = basename(sourcePath)

  // Convert binary formats to text
  const readablePath = convertToText(sourcePath)
  const relReadable = relative(ROOT, readablePath)
  const isConverted = readablePath !== sourcePath

  // Compute canonical slug and decide whether this is a re-view.
  // If an existing page matches this slug, we use ITS filename verbatim —
  // never guessing a new path. If there's no match, this is the initial
  // cataloging and we build a fresh filename: YYYY-MM-DD-<slug>.md where
  // the date is today (baked in permanently as the initial-catalog date).
  const slug = slugify(originalName)
  const existing = findExistingSourcePage(originalName)
  const isReView = existing !== null
  const sourceFilename = isReView ? existing.filename : `${today}-${slug}.md`
  const sourcePagePath = `content/collection/sources/${sourceFilename}`

  // If we converted the file, read it inline to avoid path issues
  let sourceInstruction
  if (isConverted || [".md", ".txt", ".html"].includes(extname(sourcePath).toLowerCase())) {
    const content = readFileSync(readablePath, "utf-8")
    sourceInstruction = `The source document content (originally "${originalName}") is below:

<source-document>
${content}
</source-document>`
  } else {
    // Images — tell Claude Code to read the file
    sourceInstruction = `The source document is an image file at: ${relative(ROOT, sourcePath)}
Please view this file to extract its content. The original filename is: ${originalName}`
  }

  const operationNote = isReView
    ? `This is a **re-view** of a source already in the wiki.

The canonical page is: ${sourcePagePath}
(Initial cataloging date: ${existing.firstCatalogDate || "unknown"}. This is a re-view dated ${today}.)

CRITICAL rules for a re-view, per CLAUDE.md:

1. UPDATE the existing page at the exact path above. Do NOT create a new
   file with a different date prefix. The filename is stable across re-views.

2. REPLACE the body prose entirely with the new viewing's interpretation.
   The old prose is intentionally superseded. If you want to preserve a
   specific phrasing or framing from a previous viewing, add a
   "## Previous viewings" section to the new body and quote/summarize it
   there.

3. Update the frontmatter:
   - Keep 'created' at its original value (never change).
   - Set 'updated' to ${today}.
   - If this viewing reframes the document's rhetorical role, update 'role'
     to match the current interpretation.
   - Append a new entry to 'views:' with date ${today} and a one-line
     note describing what this viewing contributed (e.g., "Reframed from
     argument to evidence base; added three concept links").

4. Entity and concept pages: update in place, as always. Do NOT create
   siblings.`
    : `This is the **initial cataloging** of a new source. Create the source page at:
${sourcePagePath}

Frontmatter must include (in addition to the standard fields):
- 'role': one of argument, evidence, reference, primary-data, narrative, analysis
- 'views': a list with a single initial entry:
    - date: ${today}
      note: "Initial cataloging."`

  const prompt = `You are cataloging a source document into a knowledge wiki.

Read the following files to understand the wiki structure and current state:
1. CLAUDE.md — the wiki schema and conventions
2. content/index.md — the current wiki index
3. content/learn/retention.md — the current retention log

${sourceInstruction}

${operationNote}

Follow the "Catalog" workflow from CLAUDE.md:
1. ${isReView ? "Update" : "Create"} the source summary page at the exact path above.
2. Create or update entity pages in content/collection/entities/ for significant entities mentioned. Always prefer updating over duplicating.
3. Create or update concept pages in content/collection/concepts/ for significant concepts. Always prefer updating over duplicating.
4. If this source connects to or contrasts with existing wiki content, create or update a synthesis page in content/collection/synthesis/ that draws cross-cutting insights. Good synthesis pages compare sources, identify patterns, or surface tensions between documents.
5. Update content/index.md with the new or changed pages.
6. Update content/learn/retention.md — add a row to the table (after the header row): | ${today} | ${isReView ? "Re-viewed" : "Cataloged"} | ${originalName} |

The original document is available for download at: /originals/${originalName}
Include a link to the original document in the source summary page (e.g., [Download original](/originals/${originalName})).

IMPORTANT formatting rules:
- Do NOT include a duplicate H1 heading in any page. The frontmatter title is rendered automatically.
- Use wikilinks ([[path]]) aggressively to cross-reference between pages.
- All wiki page paths use the collection/ prefix: collection/sources/, collection/entities/, collection/concepts/, collection/synthesis/.
- Today's date is ${today}.
- The source page path is EXACTLY ${sourcePagePath}. Do not add or strip date prefixes from this path.

Write all files directly — do not ask for confirmation.`

  console.log(`Calling Claude Code CLI for: ${relative(ROOT, sourcePath)}`)

  try {
    const output = execFileSync("claude", [
      "-p",
      "--output-format", "text",
      "--max-turns", "25",
    ], {
      input: prompt,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      cwd: ROOT,
      timeout: 600_000,
    })

    console.log(output)
  } catch (err) {
    if (err.stdout) {
      console.log(err.stdout)
      console.error("Claude Code stderr:", err.stderr?.slice(0, 2000))
    }
    throw new Error(`Claude Code CLI failed: ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  let filesToCatalog = []
  const explicitPath = process.argv[2]

  if (explicitPath) {
    const fullPath = resolve(explicitPath)
    if (!existsSync(fullPath)) {
      console.error(`File not found: ${explicitPath}`)
      process.exit(1)
    }
    filesToCatalog = [fullPath]
  } else {
    const uncatalogedNames = findUncatalogedAcquisitions()
    if (uncatalogedNames.length === 0) {
      console.log("No new acquisitions to catalog in static/originals/.")
      process.exit(0)
    }
    filesToCatalog = uncatalogedNames.map((f) => join(ORIGINALS_DIR, f))
    console.log(`Found ${filesToCatalog.length} acquisition(s) to catalog:`)
    filesToCatalog.forEach((f) => console.log(`  - ${relative(ROOT, f)}`))
  }

  for (const filepath of filesToCatalog) {
    console.log(`\nCataloging: ${relative(ROOT, filepath)}`)
    catalogWithClaude(filepath)
  }

  console.log("\nCataloging complete.")
}

main()
