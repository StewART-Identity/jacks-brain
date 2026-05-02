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
 * static/in-flight/ that was added or modified by the triggering push,
 * deduplicated while preserving discovery order.
 *
 * Files named .gitkeep are excluded — they are directory markers, not
 * catalogable acquisitions.
 *
 * On malformed input, exits 1 with a message on stderr. On empty input
 * (no commits, or no relevant paths), exits 0 with empty stdout — that's
 * a normal no-op for a push that didn't touch any acquisitions.
 *
 * Note: the script's name is historical. The catalog pipeline previously
 * triggered on pushes to static/originals/ before the three-directory
 * model (queue / in-flight / originals) was introduced. The behavior
 * we want is the same — extract changed files from a known directory in
 * the push payload — but the directory has changed.
 */

const TARGET_PREFIX = "static/in-flight/"

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
  if (!path.startsWith(TARGET_PREFIX)) continue
  const base = path.split("/").pop()
  if (base === ".gitkeep") continue
  if (seen.has(path)) continue
  seen.add(path)
  console.log(path)
}
