#!/usr/bin/env node

/**
 * ingest.mjs
 *
 * Uses Claude Code CLI to read source documents from raw/ and write structured
 * wiki pages directly to content/. Uses your Max plan via CLAUDE_CODE_OAUTH_TOKEN.
 *
 * Usage:
 *   node scripts/ingest.mjs [file-path]        # ingest a specific file
 *   node scripts/ingest.mjs                     # ingest all un-ingested files in raw/
 */

import { readdirSync, existsSync, readFileSync } from "node:fs"
import { join, resolve, basename, relative, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const RAW_DIR = join(ROOT, "raw")
const CONTENT_DIR = join(ROOT, "content")

const ALL_EXTENSIONS = new Set([
  ".md", ".txt", ".html", ".pdf", ".png", ".jpg", ".jpeg",
  ".gif", ".webp", ".doc", ".docx",
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findUningestedFiles() {
  if (!existsSync(RAW_DIR)) return []
  const rawFiles = readdirSync(RAW_DIR).filter(
    (f) => f !== ".gitkeep" && ALL_EXTENSIONS.has(extname(f).toLowerCase()),
  )

  const existingSources = new Set()
  const sourcesDir = join(CONTENT_DIR, "sources")
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

// ---------------------------------------------------------------------------
// Claude Code CLI — let it read and write files directly
// ---------------------------------------------------------------------------

function ingestWithClaude(sourcePath) {
  const today = new Date().toISOString().slice(0, 10)
  const relSource = relative(ROOT, sourcePath)

  const prompt = `You are ingesting a source document into a knowledge wiki.

Read the following files to understand the wiki structure and current state:
1. CLAUDE.md — the wiki schema and conventions
2. content/index.md — the current wiki index
3. ${relSource} — the source document to ingest

Then follow the "Ingest" workflow from CLAUDE.md:
1. Create a source summary page in content/sources/ named ${today}-${basename(sourcePath).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md
2. Create or update entity pages in content/entities/ for significant entities mentioned
3. Create or update concept pages in content/concepts/ for significant concepts
4. Update content/index.md with the new pages added to the appropriate tables
5. Update content/learn/memory.md with a log entry for this ingest operation (append at the top, below the frontmatter)

Use wikilinks ([[path]]) aggressively. Today's date is ${today}.
Write all files directly — do not ask for confirmation.`

  console.log(`Calling Claude Code CLI for: ${relSource}`)

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
      console.log("No new files to ingest in raw/.")
      process.exit(0)
    }
    filesToIngest = uningestedNames.map((f) => join(RAW_DIR, f))
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
