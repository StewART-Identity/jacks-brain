#!/usr/bin/env node

/**
 * discover-changed-originals.mjs
 *
 * Reads two env vars set by the catalog.yml workflow:
 *   ADDED_FILES_JSON     — JSON-encoded list-of-lists from
 *                          github.event.commits.*.added
 *   MODIFIED_FILES_JSON  — JSON-encoded list-of-lists from
 *                          github.event.commits.*.modified
 *
 * Emits, on stdout, one path per line for every file under
 * static/originals/ that was added or modified by the triggering push,
 * deduplicated while preserving discovery order.
 *
 * Files named .gitkeep or .catalog-trigger are excluded — they are
 * directory markers, not catalogable acquisitions.
 *
 * On malformed input, exits 1 with a message on stderr. On empty input
 * (no commits, or no relevant paths), exits 0 with empty stdout — that's
 * a normal no-op for a push that didn't touch any acquisitions.
 *
 * This script exists because the previous version of catalog.yml inlined
 * the same logic as a python heredoc inside a YAML run: block, where the
 * heredoc terminator was indented along with the rest of the block and
 * the heredoc never closed. Pulling the logic into a real file makes the
 * indentation irrelevant.
 */

function parseListOfLists(envName) {
  const raw = process.env[envName] || "[]"
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.error(`Invalid JSON in ${envName}: ${err.message}`)
    process.exit(1)
  }
  if (!Array.isArray(parsed)) {
    console.error(`${envName} did not parse to an array (got ${typeof parsed})`)
    process.exit(1)
  }
  return parsed
}

function flatten(listOfLists) {
  const out = []
  for (const inner of listOfLists) {
    if (!Array.isArray(inner)) continue
    for (const path of inner) {
      if (typeof path === "string" && path.length > 0) {
        out.push(path)
      }
    }
  }
  return out
}

const added = parseListOfLists("ADDED_FILES_JSON")
const modified = parseListOfLists("MODIFIED_FILES_JSON")

const all = [...flatten(added), ...flatten(modified)]
const seen = new Set()
for (const path of all) {
  if (!path.startsWith("static/originals/")) continue
  const base = path.split("/").pop()
  if (base === ".gitkeep" || base === ".catalog-trigger") continue
  if (seen.has(path)) continue
  seen.add(path)
  console.log(path)
}
