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
 * MCP integration: when the catalog runs in an environment with .mcp.json
 * configured (e.g. the catalog GitHub Action), the catalog Claude has
 * access to the wiki's MCP server tools. The prompt below instructs it
 * to use:
 *   - append_retention_entry to update data/retention-log.md (instead of
 *     filesystem write — gets schema validation and bypasses the git add
 *     data/ dependency)
 *   - read_repo_file to verify the retention row landed after committing
 * Wiki pages themselves (content/) still go through filesystem writes —
 * those land via `git add content/` and don't benefit from MCP.
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
 * Today's date in YYYY-MM-DD form, computed in the user's configured
 * timezone (USER_TIMEZONE env var). Falls back to UTC if not set.
 *
 * Why not `new Date().toISOString().slice(0,10)`: that gives UTC, which
 * differs from the user's local date for several hours every evening.
 * A catalog triggered at 9 PM EDT on April 25 would write date prefixes
 * for April 26 because UTC has already rolled over. The retention log
 * and source-page filenames would then disagree with the user's actual
 * day. This helper makes the date stable in the user's timezone.
 *
 * Implementation note: `Intl.DateTimeFormat` with `en-CA` locale produces
 * YYYY-MM-DD natively (Canadian English uses ISO date order), so we don't
 * have to reorder parts.
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
  } catch (err) {
    console.error(
      `Invalid USER_TIMEZONE '${tz}': ${err.message}. Falling back to UTC.`
    )
    return new Date().toISOString().slice(0, 10)
  }
}

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
  const today = todayInUserTimezone()
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
  const retentionAction = isReView ? "Re-viewed" : "Cataloged"

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

You have access to MCP tools from the "jacks-brain" MCP server. Use them where the prompt instructs you to. For wiki pages (anything under content/), keep using direct filesystem writes — those land via git commits and don't benefit from MCP. The MCP tools you should use here are:

  - append_retention_entry: write the audit row to data/retention-log.md (step 6 below)
  - read_repo_file: verify the retention row landed (verify step at the end)

Read the following files to understand the wiki structure and current state:
1. CLAUDE.md — the wiki schema and conventions
2. content/index.md — the welcome/landing page (do not modify)
3. data/retention-log.md — the current retention log (audit table, NOT a Quartz page)
4. Any existing pages in content/collection/ that may already cover this material — update in place if so.

${sourceInstruction}

${operationNote}

Follow the "Catalog" workflow from CLAUDE.md:

1. ${isReView ? "Update" : "Create"} the source summary page at the exact path above. Use a direct filesystem write.

2. Create or update entity pages in content/collection/entities/ for significant entities mentioned. Always prefer updating over duplicating. Direct filesystem writes.

3. Create or update concept pages in content/collection/concepts/ for significant concepts. Always prefer updating over duplicating. Direct filesystem writes.

4. If this source connects to or contrasts with existing wiki content, create or update a synthesis page in content/collection/synthesis/ that draws cross-cutting insights. Good synthesis pages compare sources, identify patterns, or surface tensions between documents. Direct filesystem write.

5. Do NOT modify content/index.md (the welcome page) or any of the per-category index.md files in collection/ (Sources, Entities, Concepts, Synthesis). The Collection page listings are rendered automatically by Quartz's FolderContent + PageList components from each page's frontmatter — title, summary, dates, tags. The index.md files contribute only the page title and intro paragraph above the auto-generated table; their bodies should stay empty. Putting a markdown table in an index.md would duplicate the auto-rendered listing and create drift.

6. Update the retention log by calling the **append_retention_entry** MCP tool with these arguments:
     - action: "${retentionAction}"
     - date: "${today}"
     - filename: "${originalName}"
   Do NOT edit data/retention-log.md directly with a filesystem write. The MCP tool validates the row format and handles UTF-8 encoding correctly. Each catalog operation appends exactly one retention row, regardless of how many wiki pages were created or updated.

7. **Verify the retention row landed.** Call the **read_repo_file** MCP tool with path="data/retention-log.md". Confirm the file contains a row matching what you appended in step 6 (action="${retentionAction}", date="${today}", filename="${originalName}"). If the row is missing — for any reason — call append_retention_entry again with the same arguments. The MCP tool is idempotent enough that a duplicate row is much less harmful than a missing one. If the row IS present, the catalog is complete; do nothing further.

The original document is available for download at: /api/originals/${originalName}
Include a link to the original document in the source summary page (e.g., [Download original](/api/originals/${originalName})).
The /api/originals/ prefix is required — it is the auth-controlled download proxy that streams the file from the GitHub repo. Do NOT use /originals/ or /static/originals/ — neither path is served.

IMPORTANT formatting rules:
- Every page (source, entity, concept, synthesis) MUST include a 'summary:' field in its frontmatter — a single-sentence (≤140 char) description that will appear in the Collection table listings. Make it informative on its own, not just a restated title.
- Do NOT include a duplicate H1 heading in any page. The frontmatter title is rendered automatically.
- Use wikilinks ([[path]]) aggressively to cross-reference between pages.
- All wiki page paths use the collection/ prefix: collection/sources/, collection/entities/, collection/concepts/, collection/synthesis/.
- Today's date is ${today}.
- The source page path is EXACTLY ${sourcePagePath}. Do not add or strip date prefixes from this path.

Write all files directly — do not ask for confirmation. Call MCP tools where instructed without asking for confirmation.`

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
