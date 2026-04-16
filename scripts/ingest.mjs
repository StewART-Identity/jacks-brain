#!/usr/bin/env node

/**
 * ingest.mjs
 *
 * Reads source documents from raw/, sends them to Claude API with CLAUDE.md
 * instructions, and writes the generated wiki pages to content/.
 *
 * Usage:
 *   node scripts/ingest.mjs [file-path]        # ingest a specific file
 *   node scripts/ingest.mjs                     # ingest all un-ingested files in raw/
 *   npm run ingest -- raw/2026-04-14-example.md
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs"
import { join, resolve, basename, relative } from "node:path"
import { fileURLToPath } from "node:url"
import Anthropic from "@anthropic-ai/sdk"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const RAW_DIR = join(ROOT, "raw")
const CONTENT_DIR = join(ROOT, "content")
const SCHEMA_PATH = join(ROOT, "CLAUDE.md")
const INDEX_PATH = join(CONTENT_DIR, "index.md")
const LOG_PATH = join(CONTENT_DIR, "learn", "memory.md")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists(path) {
  if (existsSync(path)) return readFileSync(path, "utf-8")
  return null
}

function listExistingPages() {
  const pages = []
  for (const subdir of ["sources", "entities", "concepts", "synthesis"]) {
    const dir = join(CONTENT_DIR, subdir)
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir)) {
      if (file === ".gitkeep") continue
      if (file.endsWith(".md")) {
        pages.push(`${subdir}/${file.replace(/\.md$/, "")}`)
      }
    }
  }
  return pages
}

function findUningestedFiles() {
  if (!existsSync(RAW_DIR)) return []
  const rawFiles = readdirSync(RAW_DIR).filter((f) => f !== ".gitkeep" && f.endsWith(".md"))

  // Check which raw files already have a corresponding source page
  const existingSources = new Set()
  const sourcesDir = join(CONTENT_DIR, "sources")
  if (existsSync(sourcesDir)) {
    for (const f of readdirSync(sourcesDir)) {
      if (f.endsWith(".md")) existingSources.add(f)
    }
  }

  // A raw file is "ingested" if a source page with a matching date-slug exists
  // This is a heuristic — the source page name mirrors the raw file name
  return rawFiles.filter((f) => !existingSources.has(f))
}

// ---------------------------------------------------------------------------
// Claude API call
// ---------------------------------------------------------------------------

async function ingestWithClaude(sourceContent, sourcePath, schema, indexContent, existingPages) {
  const client = new Anthropic()

  const today = new Date().toISOString().slice(0, 10)
  const sourceFilename = basename(sourcePath, ".md")

  const systemPrompt = `You are a knowledge wiki assistant. Your job is to ingest a source document and produce structured wiki pages following the schema below.

${schema}

IMPORTANT INSTRUCTIONS:
- Output ONLY a JSON array of objects, each with "path" and "content" fields.
- "path" is relative to the content/ directory (e.g., "sources/2026-04-14-example.md").
- "content" is the full markdown content of the page including frontmatter.
- Include the source summary page, any new or updated entity pages, any new or updated concept pages.
- Include an updated index.md with the new pages added to the appropriate tables.
- Include an updated learn/memory.md with the ingest operation appended at the top (below the frontmatter/heading).
- Use wikilinks ([[path]]) aggressively to cross-reference pages.
- Today's date is ${today}.
- The source filename is "${sourceFilename}".
- Do NOT wrap the JSON in markdown code fences. Output raw JSON only.`

  const existingPagesStr =
    existingPages.length > 0
      ? `Existing wiki pages:\n${existingPages.map((p) => `- [[${p}]]`).join("\n")}`
      : "The wiki has no existing pages yet."

  const userMessage = `Please ingest the following source document.

## Current index.md
${indexContent || "(empty)"}

## ${existingPagesStr}

## Source document (from raw/${basename(sourcePath)})
${sourceContent}`

  console.log(`Calling Claude API (claude-sonnet-4-20250514)...`)

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  // Parse JSON — handle cases where Claude wraps in code fences despite instructions
  let cleaned = text.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  let files
  try {
    files = JSON.parse(cleaned)
  } catch (err) {
    console.error("Failed to parse Claude response as JSON:")
    console.error(cleaned.slice(0, 500))
    throw new Error(`JSON parse error: ${err.message}`)
  }

  if (!Array.isArray(files)) {
    throw new Error("Expected JSON array from Claude, got: " + typeof files)
  }

  return files
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.")
    console.error("Set it with: export ANTHROPIC_API_KEY=sk-ant-...")
    process.exit(1)
  }

  // Read schema
  const schema = readIfExists(SCHEMA_PATH)
  if (!schema) {
    console.error("Error: SCHEMA.md not found at project root.")
    process.exit(1)
  }

  // Determine files to ingest
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

  // Read current wiki state
  const indexContent = readIfExists(INDEX_PATH)
  const existingPages = listExistingPages()

  // Process each file
  for (const filepath of filesToIngest) {
    const sourceContent = readFileSync(filepath, "utf-8")
    const relPath = relative(ROOT, filepath)
    console.log(`\nIngesting: ${relPath}`)

    const generatedFiles = await ingestWithClaude(
      sourceContent,
      filepath,
      schema,
      indexContent,
      existingPages,
    )

    // Write generated files
    const created = []
    const updated = []

    for (const { path: filePath, content } of generatedFiles) {
      const fullPath = join(CONTENT_DIR, filePath)
      const dir = resolve(fullPath, "..")
      mkdirSync(dir, { recursive: true })

      const existed = existsSync(fullPath)
      writeFileSync(fullPath, content, "utf-8")

      if (existed) {
        updated.push(filePath)
      } else {
        created.push(filePath)
      }
      console.log(`  ${existed ? "Updated" : "Created"}: content/${filePath}`)
    }

    console.log(`\nSummary for ${relPath}:`)
    if (created.length) console.log(`  Created: ${created.length} page(s)`)
    if (updated.length) console.log(`  Updated: ${updated.length} page(s)`)
  }

  console.log("\nIngest complete.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
