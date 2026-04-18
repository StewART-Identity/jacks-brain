#!/usr/bin/env node

/**
 * ingest.mjs
 *
 * Uses Claude Code CLI to read source documents from raw/ and write structured
 * wiki pages directly to content/. Uses your Max plan via CLAUDE_CODE_OAUTH_TOKEN.
 *
 * Binary files (.docx, .pdf) are converted to text first using pandoc/pdftotext.
 *
 * Usage:
 *   node scripts/ingest.mjs [file-path]        # ingest a specific file
 *   node scripts/ingest.mjs                     # ingest all un-ingested files in raw/
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

function findUningestedFiles() {
  if (!existsSync(ORIGINALS_DIR)) return []
  const rawFiles = readdirSync(ORIGINALS_DIR).filter(
    (f) => f !== ".gitkeep" && ALL_EXTENSIONS.has(extname(f).toLowerCase()),
  )

  const existingSources = new Set()
  const sourcesDir = join(CONTENT_DIR, "recall", "sources")
  if (existsSync(sourcesDir)) {
    for (const f of readdirSync(sourcesDir)) {
      if (f.endsWith(".md")) existingSources.add(f.replace(/\.md$/, ""))
    }
  }

  return rawFiles.filter((f) => {
    const stem = f.replace(/\.[^.]+$/, "")
    return !existingSources.has(stem)
  })
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

function ingestWithClaude(sourcePath) {
  const today = new Date().toISOString().slice(0, 10)
  const originalName = basename(sourcePath)

  // Convert binary formats to text
  const readablePath = convertToText(sourcePath)
  const relReadable = relative(ROOT, readablePath)
  const isConverted = readablePath !== sourcePath

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
Please read this file to extract its content. The original filename is: ${originalName}`
  }

  const prompt = `You are ingesting a source document into a knowledge wiki.

Read the following files to understand the wiki structure and current state:
1. CLAUDE.md — the wiki schema and conventions
2. content/index.md — the current wiki index
3. content/learn/memory.md — the current memory/log

${sourceInstruction}

Follow the "Ingest" workflow from CLAUDE.md:
1. Create a source summary page in content/recall/sources/ named ${today}-${originalName.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md
2. Create or update entity pages in content/recall/entities/ for significant entities mentioned
3. Create or update concept pages in content/recall/concepts/ for significant concepts
4. If this source connects to or contrasts with existing wiki content, create or update a synthesis page in content/recall/synthesis/ that draws cross-cutting insights. Good synthesis pages compare sources, identify patterns, or surface tensions between documents.
5. Update content/index.md with the new pages added to the appropriate tables
6. Update content/learn/memory.md — add a row to the table (after the header row): | ${today} | Ingested | ${originalName} |

The original document is available for download at: /originals/${originalName}
Include a link to the original document in the source summary page (e.g., [Download original](/originals/${originalName})).

IMPORTANT formatting rules:
- Do NOT include a duplicate H1 heading in any page. The frontmatter title is rendered automatically.
- Use wikilinks ([[path]]) aggressively to cross-reference between pages.
- All wiki page paths use the recall/ prefix: recall/sources/, recall/entities/, recall/concepts/, recall/synthesis/.
- Today's date is ${today}.

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
  let filesToIngest = []
  const explicitPath = process.argv[2]

  if (explicitPath) {
    const fullPath = resolve(explicitPath)
    if (!existsSync(fullPath)) {
      console.error(`File not found: ${explicitPath}`)
      process.exit(1)
    }
    filesToIngest = [fullPath]
  } else {
    const uningestedNames = findUningestedFiles()
    if (uningestedNames.length === 0) {
      console.log("No new files to ingest in static/originals/.")
      process.exit(0)
    }
    filesToIngest = uningestedNames.map((f) => join(ORIGINALS_DIR, f))
    console.log(`Found ${filesToIngest.length} file(s) to ingest:`)
    filesToIngest.forEach((f) => console.log(`  - ${relative(ROOT, f)}`))
  }

  for (const filepath of filesToIngest) {
    console.log(`\nIngesting: ${relative(ROOT, filepath)}`)
    ingestWithClaude(filepath)
  }

  console.log("\nIngest complete.")
}

main()
