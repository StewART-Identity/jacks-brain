/**
 * GitHub API client for the Worker runtime.
 *
 * Similar in spirit to bridge/src/github.js but adapted for server-side use:
 *  - The PAT is read from env, not from user input
 *  - All writes target a single configured repo (the allowlist check is done
 *    by the caller before this module is reached)
 *  - Errors carry structured context so the MCP tool response can explain
 *    what went wrong
 */

import { unzipSync, zipSync } from 'fflate'

const GH_BASE = 'https://api.github.com'

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_PAT}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': env.GITHUB_USER_AGENT,
  }
}

async function ghFetch(env, path, opts = {}) {
  const res = await fetch(`${GH_BASE}${path}`, {
    ...opts,
    headers: { ...ghHeaders(env), ...(opts.headers || {}) },
  })
  let body = null
  try { body = await res.json() } catch {}
  return { ok: res.ok, status: res.status, body }
}

// Variant of ghFetch that doesn't try to parse the body as JSON. Some
// endpoints (workflow log archives, workflow dispatch) return non-JSON
// responses or no body at all; calling .json() on those produces
// confusing parse failures. Callers of this variant either don't need
// the body or read it themselves.
async function ghFetchRaw(env, path, opts = {}) {
  const res = await fetch(`${GH_BASE}${path}`, {
    ...opts,
    headers: { ...ghHeaders(env), ...(opts.headers || {}) },
  })
  return res
}

// Throws on failure with a structured error the MCP layer can surface.
function ghError(status, body, context) {
  const msg = body?.message || 'Unknown GitHub error'
  const err = new Error(`GitHub ${status}: ${msg} (${context})`)
  err.githubStatus = status
  err.githubMessage = msg
  err.context = context
  return err
}

// ─── Repo tree ──────────────────────────────────────────────────────────────

/**
 * List all files in the repo at a given branch.
 * Returns: [{ path, size, sha }, ...]
 */
export async function listRepoTree(env, repo, branch) {
  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  )
  if (!ok) throw ghError(status, body, `list tree ${repo}@${branch}`)
  return body.tree
    .filter(item => item.type === 'blob')
    .map(item => ({ path: item.path, size: item.size, sha: item.sha }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

// ─── List directory contents ────────────────────────────────────────────────

/**
 * List the immediate contents of a directory in the repo.
 *
 * Two modes, selected by `recursive`:
 *
 * Non-recursive (default): one call to GitHub's Contents API, returns the
 * immediate children of the directory — files AND subdirectories. Each
 * entry carries its name, full repo-relative path, type (file or dir),
 * size in bytes (0 for directories), and blob/tree sha.
 *
 * Recursive: one call to GitHub's Git Trees API with ?recursive=1,
 * returns every blob (file) anywhere under the prefix. Directory
 * entries are filtered out of recursive results because the recursive
 * use case is "show me every file under here," not "show me the tree
 * structure." A blob is always a leaf, so this keeps the response
 * shape uniform and predictable.
 *
 * Behaviors at the edges:
 *   - Empty directory → returns { entries: [] }
 *   - Path doesn't exist → returns { notFound: true, path }
 *   - Path is a file, not a directory → returns { isFile: true, ... }
 *     so the caller can give a useful error
 *   - Repo with no commits on this branch → throws (different from
 *     directory-not-found; this is an infrastructure problem)
 *
 * Empty-string path or "/" lists the repo root. The Contents API
 * accepts an empty path component (the trailing slash on the URL is
 * what triggers the root listing); we normalize either form.
 *
 * Returns one of:
 *   { entries: [{ name, path, type, size, sha }] }      — directory listing
 *   { notFound: true, path }                              — path doesn't exist
 *   { isFile: true, path, size, sha }                     — path is a file
 */
export async function listDirectory(env, repo, branch, path, options = {}) {
  const { recursive = false } = options
  // Normalize: strip leading/trailing slashes. "/" or "" both mean root.
  const cleanPath = (path || '').replace(/^\/+|\/+$/g, '')

  // Recursive mode reuses listRepoTree (which fetches the full tree once)
  // and filters by prefix. This is cheaper than walking GitHub's Contents
  // API recursively (which would be N round-trips for N directories) and
  // uses the same one-request endpoint GitHub itself documents for
  // recursive operations.
  if (recursive) {
    const tree = await listRepoTree(env, repo, branch)
    const prefix = cleanPath ? `${cleanPath}/` : ''
    // An exact match means the caller asked us to recursively list a
    // file — surface that as isFile rather than silently returning an
    // empty listing. listRepoTree returns blobs only, so any exact
    // match is a file.
    const exactFile = tree.find(e => e.path === cleanPath)
    if (exactFile) {
      return { isFile: true, path: cleanPath, size: exactFile.size, sha: exactFile.sha }
    }
    const matches = tree.filter(e => prefix === '' || e.path.startsWith(prefix))
    // If we filtered to nothing AND the prefix is non-empty, that could
    // mean either "directory exists but is empty" or "directory doesn't
    // exist at all." Disambiguate via a Contents API probe — cheap.
    if (matches.length === 0 && prefix !== '') {
      const probe = await probeDirectoryExists(env, repo, branch, cleanPath)
      if (!probe.exists) {
        return { notFound: true, path: cleanPath }
      }
      // Exists but empty. Fall through and return [].
    }
    return {
      entries: matches.map(e => ({
        name: e.path.slice(prefix.length),
        path: e.path,
        type: 'file', // listRepoTree returns blobs only
        size: e.size,
        sha: e.sha,
      })),
    }
  }

  // Non-recursive: one Contents API call. The path goes directly in the
  // URL; encoding handles segments with spaces or other awkward chars
  // (rare but possible).
  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}?ref=${encodeURIComponent(branch)}`
  )
  if (status === 404) {
    return { notFound: true, path: cleanPath }
  }
  if (!ok) {
    throw ghError(status, body, `list directory ${repo}/${cleanPath}@${branch}`)
  }

  // The Contents API returns an array for directories and an object for
  // files. Treat the object case as "the path is a file" so the caller
  // can produce a clear error.
  if (!Array.isArray(body)) {
    if (body && typeof body === 'object' && body.type === 'file') {
      return {
        isFile: true,
        path: cleanPath,
        size: body.size || 0,
        sha: body.sha || null,
      }
    }
    // Unexpected shape — surface as an error rather than guessing.
    throw ghError(status, body, `list directory ${repo}/${cleanPath}: unexpected response shape`)
  }

  // Map the response entries to our shape. The Contents API's `type`
  // field is 'file' | 'dir' | 'submodule' | 'symlink'. We pass
  // submodules and symlinks through as their reported type so the
  // caller can decide what to do with them (most callers will ignore
  // anything that isn't 'file' or 'dir'). Directories have size 0 in
  // GitHub's response; we keep that as the canonical value.
  const entries = body.map(e => ({
    name: e.name,
    path: e.path,
    type: e.type,
    size: e.size || 0,
    sha: e.sha || null,
  }))

  // Sort deterministically: directories first, then files, each group
  // alphabetical by name. This matches `ls --group-directories-first`
  // behavior and makes scanning easier when there are many entries.
  entries.sort((a, b) => {
    if (a.type !== b.type) {
      if (a.type === 'dir') return -1
      if (b.type === 'dir') return 1
    }
    return a.name.localeCompare(b.name)
  })

  return { entries }
}

/**
 * Cheap probe: does the given directory path exist?
 *
 * Used by listDirectory's recursive mode to disambiguate "empty
 * directory" from "directory doesn't exist" — a distinction the Trees
 * API can't make on its own (a missing directory and a directory
 * containing no blobs look identical when you're filtering blob paths).
 *
 * Implementation: a single Contents API call against the path. The
 * recursive caller has already done a Trees fetch, so this adds at
 * most one round-trip and only when the filter came back empty.
 */
async function probeDirectoryExists(env, repo, branch, path) {
  const cleanPath = path.replace(/^\/+|\/+$/g, '')
  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}?ref=${encodeURIComponent(branch)}`
  )
  if (status === 404) return { exists: false }
  if (!ok) throw ghError(status, body, `probe directory ${repo}/${cleanPath}`)
  // Existence proven if we got a 2xx, regardless of whether it's an
  // array (directory) or object (file). The caller will determine type
  // from a different code path.
  return { exists: true }
}

// ─── Read a single file ─────────────────────────────────────────────────────

const MAX_INLINE_BYTES = 1024 * 1024 // 1 MB — matches GitHub's inline limit

/**
 * Fetch the raw GitHub Contents API response for a file.
 *
 * Internal helper — both branches of `readFile` share this fetch and the
 * base64 → bytes recovery. Returns one of:
 *   { found: false }                                — 404 from GitHub
 *   { found: true, tooLarge: true, size, sha, ... } — file > 1 MB
 *   { found: true, b64, bytes, size, sha, htmlUrl } — file fetched and decoded
 *
 * About the byte recovery: `atob` returns a "binary string" where each
 * char's code unit holds one raw byte. We need that as a Uint8Array so the
 * caller can do byte-level inspection (NUL detection) and UTF-8 decoding.
 * The naive `atob(b64)` shortcut would mojibake every multibyte character
 * (em-dashes, ellipses, accented letters) because JavaScript would treat
 * the bytes as Latin-1 code points; subsequent writes would round-trip the
 * corruption further. This was the bug that mangled em-dashes in the
 * retention log on every catalog cycle.
 */
async function fetchFileContents(env, repo, branch, path) {
  const cleanPath = path.replace(/^\/+/, '')
  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}?ref=${encodeURIComponent(branch)}`
  )
  if (status === 404) return { found: false }
  if (!ok) throw ghError(status, body, `read ${repo}/${cleanPath}@${branch}`)

  const size = body.size || 0
  const sha = body.sha || null
  const htmlUrl = body.html_url || `https://github.com/${repo}/blob/${branch}/${cleanPath}`

  // GitHub's Contents API serves files up to 1 MB inline; larger files come
  // back with a different shape (download_url instead of content). Bail
  // early so callers can decide how to handle them.
  if (size > MAX_INLINE_BYTES) {
    return { found: true, tooLarge: true, size, sha, htmlUrl }
  }

  if (typeof body.content !== 'string') {
    // Defensive: shouldn't happen for files under the size limit, but if
    // GitHub ever switches encodings on us, surface it rather than guessing.
    throw ghError(status, body, `read ${repo}/${cleanPath}: missing content`)
  }

  // GitHub returns base64 with embedded newlines; strip whitespace before decoding.
  const b64 = body.content.replace(/\s/g, '')

  // Recover raw bytes from the binary string atob produces.
  const binaryString = atob(b64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return { found: true, b64, bytes, size, sha, htmlUrl }
}

/**
 * Fetch the contents of a file from the repo.
 *
 * Two return modes, controlled by the `structured` option:
 *
 * Default (structured: false) — for callers that just want the text:
 *   Returns a UTF-8 string, or null if the file doesn't exist.
 *   Throws if the file is too large to inline (>1 MB).
 *
 * Structured (structured: true) — for callers that need to know about
 * binary content, file metadata, or large-file refusal:
 *   Returns one of:
 *     { kind: 'text', text, size, sha, htmlUrl }
 *     { kind: 'binary', base64, size, sha, htmlUrl }
 *     { kind: 'too_large', size, sha, htmlUrl }
 *     null
 *
 *   Binary detection: a NUL byte anywhere in the file means binary.
 *   Otherwise we attempt strict UTF-8 decoding; if that throws, the file
 *   isn't valid UTF-8 and we treat it as binary.
 *
 *   Caller can force base64 mode via `forceBase64: true` if they know the
 *   file is binary and want to skip the detection.
 */
export async function readFile(env, repo, branch, path, options = {}) {
  const { structured = false, forceBase64 = false } = options
  const result = await fetchFileContents(env, repo, branch, path)

  if (!result.found) return null

  // Structured mode handles every case explicitly.
  if (structured) {
    if (result.tooLarge) {
      const { size, sha, htmlUrl } = result
      return { kind: 'too_large', size, sha, htmlUrl }
    }
    const { b64, bytes, size, sha, htmlUrl } = result
    if (forceBase64) {
      return { kind: 'binary', base64: b64, size, sha, htmlUrl }
    }
    // NUL byte → binary. Catches PNG/JPG/PDF/docx/etc. early.
    if (bytes.includes(0)) {
      return { kind: 'binary', base64: b64, size, sha, htmlUrl }
    }
    // Attempt strict UTF-8 decode. Fatal flag throws on invalid sequences,
    // which catches files that have no NULs but still aren't valid text.
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      return { kind: 'text', text, size, sha, htmlUrl }
    } catch {
      return { kind: 'binary', base64: b64, size, sha, htmlUrl }
    }
  }

  // Default mode: return text or throw on edge cases. Simple callers never
  // have to think about binary content or size limits — if they call
  // readFile() unadorned, they're saying "give me the text or fail loudly."
  if (result.tooLarge) {
    throw new Error(
      `${repo}/${path} is ${result.size} bytes, exceeds 1 MB inline limit. ` +
      `Use readFile(..., { structured: true }) to handle this case.`
    )
  }
  return new TextDecoder('utf-8').decode(result.bytes)
}

// ─── Bytes ↔ base64 helper ─────────────────────────────────────────────────

/**
 * Base64-encode a Uint8Array without blowing the call stack on large inputs.
 *
 * The naive `btoa(String.fromCharCode(...bytes))` spreads every byte as a
 * function argument, which V8 caps at ~125K arguments. For anything bigger
 * — log archives, repo zipballs, file uploads — we have to chunk. 32 KB is
 * comfortably below the cap with headroom; bigger would still work but the
 * marginal speedup is invisible.
 *
 * Caller's responsibility: pass a Uint8Array. We don't accept ArrayBuffer
 * directly because the wrap is a one-liner at every call site and forcing
 * it makes the boundary explicit.
 */
export function bytesToBase64(bytes) {
  const CHUNK = 0x8000 // 32 KB
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

// ─── Get file SHA (needed for updates) ──────────────────────────────────────

async function getFileSha(env, repo, branch, path) {
  const cleanPath = path.replace(/^\/+/, '')
  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}?ref=${encodeURIComponent(branch)}`
  )
  if (status === 404) return null
  if (!ok) throw ghError(status, body, `sha lookup ${repo}/${cleanPath}`)
  return body.sha || null
}

// ─── Write a single file ────────────────────────────────────────────────────

/**
 * Create or update a single file. Returns { url, created: boolean }.
 * If the file already exists with identical content, skips the write and
 * returns { url, skipped: true }.
 */
export async function pushFile(env, repo, branch, path, content, message) {
  const cleanPath = path.replace(/^\/+/, '')
  // GitHub's contents API computes the blob SHA server-side; we can skip the
  // client-side SHA compare from the Bridge because at the server level
  // the extra roundtrip matters less than the correctness guarantee.
  const existingSha = await getFileSha(env, repo, branch, cleanPath)

  // Encode content as base64
  const b64 = btoa(unescape(encodeURIComponent(content)))

  const payload = {
    message: message || `${existingSha ? 'Update' : 'Add'} ${cleanPath}`,
    content: b64,
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  }

  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  // 200 = updated, 201 = created, 422 = no change (content identical)
  if (status === 422 && body?.message?.includes('sha')) {
    // Shouldn't normally happen because we just fetched the sha, but if it
    // does, treat it as "no change required".
    return {
      url: `https://github.com/${repo}/blob/${branch}/${cleanPath}`,
      skipped: true,
    }
  }
  if (!ok) throw ghError(status, body, `push ${repo}/${cleanPath}`)

  return {
    url: body.content?.html_url || `https://github.com/${repo}/blob/${branch}/${cleanPath}`,
    commitUrl: body.commit?.html_url,
    sha: body.commit?.sha,
    created: status === 201,
  }
}

// ─── Write a single binary file (already base64-encoded) ────────────────────

/**
 * Same as pushFile but accepts content that's already base64-encoded.
 *
 * Use this for binary uploads (PDF, docx, images, etc.) where the caller
 * has already produced the base64 representation. pushFile assumes text
 * input and runs UTF-8 → base64; calling it on binary bytes would corrupt
 * them.
 *
 * Caller's responsibility: ensure `base64Content` is valid base64 of the
 * file's raw bytes (not of a text decoding of those bytes).
 */
export async function pushBinaryFile(env, repo, branch, path, base64Content, message) {
  const cleanPath = path.replace(/^\/+/, '')
  const existingSha = await getFileSha(env, repo, branch, cleanPath)

  const payload = {
    message: message || `${existingSha ? 'Update' : 'Add'} ${cleanPath}`,
    content: base64Content,
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  }

  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  if (status === 422 && body?.message?.includes('sha')) {
    return {
      url: `https://github.com/${repo}/blob/${branch}/${cleanPath}`,
      skipped: true,
    }
  }
  if (!ok) throw ghError(status, body, `push binary ${repo}/${cleanPath}`)

  return {
    url: body.content?.html_url || `https://github.com/${repo}/blob/${branch}/${cleanPath}`,
    commitUrl: body.commit?.html_url,
    sha: body.commit?.sha,
    created: status === 201,
  }
}

// ─── Delete a single file ───────────────────────────────────────────────────

/**
 * Delete a file from the repo. Returns { commitUrl, sha } on success, or
 * { notFound: true } if the file didn't exist (treated as a no-op rather
 * than an error so callers can be idempotent).
 *
 * Path-prefix safety is enforced at the MCP tool layer in mcp.js — by the
 * time this function runs, the path has already been validated as one we're
 * allowed to delete.
 */
export async function deleteFile(env, repo, branch, path, message) {
  const cleanPath = path.replace(/^\/+/, '')
  const existingSha = await getFileSha(env, repo, branch, cleanPath)
  if (existingSha === null) {
    return { notFound: true, path: cleanPath }
  }

  const payload = {
    message: message || `Delete ${cleanPath}`,
    sha: existingSha,
    branch,
  }

  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/contents/${encodeURI(cleanPath)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  if (!ok) throw ghError(status, body, `delete ${repo}/${cleanPath}`)

  return {
    commitUrl: body.commit?.html_url,
    sha: body.commit?.sha,
    path: cleanPath,
  }
}

// ─── Append a row to the retention log ──────────────────────────────────────

/**
 * Read data/retention-log.md, append a new table row, and write it back.
 * The retention log is the chronological audit log of cataloging operations,
 * read by /api/retention and rendered on /learn/retention.
 *
 * Why a dedicated helper rather than wiki_push_page on the file:
 *  - The retention log is not a wiki page (it's machine-managed structured
 *    data outside content/), so the wiki-page validators don't apply.
 *  - The schema is fixed (Date, Action, Details columns; three valid action
 *    values). Encoding it here means the caller can't write a malformed row.
 *  - We must read-modify-write to preserve existing entries; pushFile would
 *    require the caller to handle that round-trip themselves.
 *
 * Returns { commitUrl, sha, action, filename } on success.
 */
export async function appendRetentionEntry(env, repo, branch, date, action, filename, message) {
  const path = 'data/retention-log.md'
  const existing = await readFile(env, repo, branch, path)
  if (existing === null) {
    throw new Error(`retention log not found at ${path}`)
  }

  // The log has a header section above the table and the table itself.
  // We append at the end of the file. The parser in /api/retention skips
  // any text before the | Date | Action | Details | header, so trailing
  // newline handling matters only for visual cleanliness.
  const trimmed = existing.replace(/\s+$/, '')
  const newRow = `| ${date} | ${action} | ${filename} |`
  const updated = `${trimmed}\n${newRow}\n`

  const result = await pushFile(
    env, repo, branch, path, updated,
    message || `Log retention: ${action} ${filename}`,
  )

  return {
    commitUrl: result.commitUrl,
    sha: result.sha,
    action,
    filename,
  }
}

// ─── Write multiple files in a single commit ────────────────────────────────

/**
 * Atomic multi-file commit using the Git Data API (trees + commits).
 * This is what "catalog a source" uses: 5-15 pages committed together
 * so the wiki is never in a half-cataloged state.
 *
 * Files: array of entries, each one of:
 *   { path, content }         — create or update path with the given content
 *   { path, delete: true }    — remove path from the tree
 *
 * Mixing creates/updates and deletes in one commit is supported and is the
 * intended pattern for renames (delete the old path, write the new one) so
 * the wiki is never in a half-renamed state.
 *
 * Returns: { commitUrl, sha, updated: [{path, op, url}, ...] }
 * where op is 'write' or 'delete'.
 */
export async function pushFiles(env, repo, branch, files, message) {
  if (!files || !files.length) {
    throw new Error('pushFiles called with no files')
  }

  // Partition entries up front so we can validate shapes and only mint
  // blobs for the writes. A bad entry (neither content nor delete) fails
  // here, not somewhere deeper in the GitHub API.
  const writes = []
  const deletes = []
  for (const [i, f] of files.entries()) {
    if (!f || typeof f.path !== 'string' || !f.path) {
      throw new Error(`pushFiles: files[${i}] has no path`)
    }
    if (f.delete === true) {
      deletes.push({ path: f.path.replace(/^\/+/, '') })
      continue
    }
    if (typeof f.content !== 'string') {
      throw new Error(`pushFiles: files[${i}] (${f.path}) needs either 'content' or 'delete: true'`)
    }
    writes.push({ path: f.path.replace(/^\/+/, ''), content: f.content })
  }

  // 1. Get the current branch head SHA and its tree
  const refRes = await ghFetch(env, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`)
  if (!refRes.ok) throw ghError(refRes.status, refRes.body, `get ref ${branch}`)
  const parentSha = refRes.body.object.sha

  const commitRes = await ghFetch(env, `/repos/${repo}/git/commits/${parentSha}`)
  if (!commitRes.ok) throw ghError(commitRes.status, commitRes.body, `get parent commit`)
  const baseTreeSha = commitRes.body.tree.sha

  // 2. Create a blob for each write. Deletes don't need blobs — they're
  //    expressed as tree entries with sha: null in step 3.
  const blobs = []
  for (const f of writes) {
    const b64 = btoa(unescape(encodeURIComponent(f.content)))
    const blobRes = await ghFetch(env, `/repos/${repo}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: b64, encoding: 'base64' }),
    })
    if (!blobRes.ok) throw ghError(blobRes.status, blobRes.body, `create blob ${f.path}`)
    blobs.push({ path: f.path, sha: blobRes.body.sha })
  }

  // 3. Create a new tree referencing the blobs, based on the current tree.
  //    Per the Git Data API: a tree entry with `sha: null` (and the path
  //    of an existing file) tells the server "remove this file from the
  //    base tree." Mixing additions and deletions in one PATCH is the
  //    intended pattern.
  const treeEntries = [
    ...blobs.map(b => ({
      path: b.path,
      mode: '100644',
      type: 'blob',
      sha: b.sha,
    })),
    ...deletes.map(d => ({
      path: d.path,
      mode: '100644',
      type: 'blob',
      sha: null,
    })),
  ]
  const treeRes = await ghFetch(env, `/repos/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  })
  if (!treeRes.ok) throw ghError(treeRes.status, treeRes.body, `create tree`)

  // 4. Create the commit. Default message describes the mix of ops.
  const defaultMessage = (() => {
    if (writes.length && deletes.length) {
      return `Update ${writes.length} file${writes.length === 1 ? '' : 's'}, ` +
             `delete ${deletes.length} file${deletes.length === 1 ? '' : 's'}`
    }
    if (writes.length) return `Update ${writes.length} file${writes.length === 1 ? '' : 's'}`
    return `Delete ${deletes.length} file${deletes.length === 1 ? '' : 's'}`
  })()
  const newCommitRes = await ghFetch(env, `/repos/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message || defaultMessage,
      tree: treeRes.body.sha,
      parents: [parentSha],
    }),
  })
  if (!newCommitRes.ok) throw ghError(newCommitRes.status, newCommitRes.body, `create commit`)

  // 5. Move the branch ref to the new commit
  const updateRefRes = await ghFetch(env, `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommitRes.body.sha, force: false }),
  })
  if (!updateRefRes.ok) throw ghError(updateRefRes.status, updateRefRes.body, `update ref`)

  return {
    commitUrl: newCommitRes.body.html_url,
    sha: newCommitRes.body.sha,
    updated: [
      ...writes.map(w => ({
        path: w.path,
        op: 'write',
        url: `https://github.com/${repo}/blob/${branch}/${w.path}`,
      })),
      ...deletes.map(d => ({
        path: d.path,
        op: 'delete',
        url: `https://github.com/${repo}/commits/${branch}`,
      })),
    ],
  }
}

// ─── Repo archive (full zipball, with optional path filter) ────────────────

/**
 * Fetch the repo at a given ref as a zip archive, optionally narrowed to
 * a set of path prefixes.
 *
 * Maps to GET /repos/{owner}/{repo}/zipball/{ref}, which returns a 302
 * redirect to a short-lived signed download URL on codeload.github.com.
 * The fetch() default redirect handling follows the redirect transparently,
 * so the caller sees a single response with the zip bytes.
 *
 * About GitHub's zipball wrapper: every entry is prefixed with a directory
 * named `{owner}-{repo}-{short-sha}/`. That's GitHub's convention, not
 * ours, and it makes path matching from a caller's perspective awkward
 * (the caller thinks in repo-relative paths). This function:
 *   - matches `paths` filters against the repo-relative path (wrapper stripped)
 *   - re-packs the output zip with paths repo-relative (no wrapper)
 *
 * So the caller's mental model is: "I'm working with the repo's files,
 * laid out exactly as they are in the repo."
 *
 * Options:
 *   paths: optional string[] of path prefixes. When supplied, only entries
 *          whose repo-relative path starts with one of the prefixes are
 *          included in the output zip. Prefix match is byte-literal — no
 *          glob expansion, no normalization. A prefix of "src/" matches
 *          "src/index.js" and "src/lib/foo.js" but not "src" (no trailing
 *          slash) or "tests/src/..." (doesn't start with).
 *          When omitted (or empty), the full zipball is returned unchanged.
 *
 * This is the right tool for bulk operations across many files: renames
 * spanning a directory, search-replace across the corpus, audits that
 * need to read every file. One HTTP request and ~few-MB transfer beats
 * N individual Contents-API requests for any N above a handful. It's
 * also the *only* way to reach files inside a multi-MB repo zip held in
 * git LFS or as a committed binary asset, because the Contents API caps
 * inline reads at 1 MB.
 *
 * Returns: {
 *   bytes:        Uint8Array,   // the (possibly filtered) zip bytes
 *   size:         number,        // bytes.length
 *   filename:     string,        // synthetic, e.g. "owner-repo-main.zip"
 *   contentType:  string,        // always 'application/zip'
 *   filtered:     boolean,       // true if a paths filter was applied
 *   includedPaths: string[] | null, // when filtered, the list of repo-relative
 *                                    // paths that matched and are in the output
 * }
 *
 * The MCP tool layer is responsible for staging via workspace-fetch so
 * the agent can curl the bytes into a sandbox without inlining them in
 * the tool response.
 */
export async function fetchRepoArchive(env, repo, ref, options = {}) {
  const { paths } = options
  const hasFilter = Array.isArray(paths) && paths.length > 0

  const res = await ghFetchRaw(env, `/repos/${repo}/zipball/${encodeURIComponent(ref)}`)
  if (!res.ok) {
    let body = null
    try { body = await res.json() } catch {}
    throw ghError(res.status, body, `fetch archive ${repo}@${ref}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const fullBytes = new Uint8Array(arrayBuffer)

  // Synthetic filename: predictable, no sha suffix. GitHub's
  // Content-Disposition uses an owner-repo-sha.zip name; ours uses
  // owner-repo-ref.zip so callers writing curl commands get something
  // they can anticipate.
  const simpleName = repo.replace('/', '-') + '-' + ref + '.zip'

  if (!hasFilter) {
    return {
      bytes: fullBytes,
      size: fullBytes.length,
      filename: simpleName,
      contentType: 'application/zip',
      filtered: false,
      includedPaths: null,
    }
  }

  // Filter mode: unzip, drop the wrapper prefix from each path, keep only
  // entries matching one of the prefixes, repack.
  const unzipped = unzipSync(fullBytes)

  // GitHub's wrapper is the single top-level directory in the archive.
  // Detect it from the first entry rather than hard-coding the sha
  // pattern — that way we're robust to future format changes.
  // Every entry begins with the wrapper followed by '/'.
  let wrapper = null
  for (const entryPath of Object.keys(unzipped)) {
    const slashIdx = entryPath.indexOf('/')
    if (slashIdx > 0) {
      wrapper = entryPath.slice(0, slashIdx + 1) // includes trailing slash
      break
    }
  }
  if (!wrapper) {
    // No detectable wrapper — pass through unfiltered, with a warning shape
    // (the filtered flag stays true but the caller can spot the empty
    // includedPaths and figure it out). Shouldn't happen in practice.
    return {
      bytes: fullBytes,
      size: fullBytes.length,
      filename: simpleName,
      contentType: 'application/zip',
      filtered: true,
      includedPaths: [],
    }
  }

  // Build the filtered output. fflate's zipSync wants { path: Uint8Array }.
  // Skip the wrapper-only directory entry itself (path === wrapper),
  // it adds nothing once we re-pack.
  const output = {}
  const includedPaths = []
  for (const [entryPath, entryBytes] of Object.entries(unzipped)) {
    if (entryPath === wrapper) continue
    if (!entryPath.startsWith(wrapper)) continue // defensive; shouldn't happen
    const repoRelative = entryPath.slice(wrapper.length)
    if (!repoRelative) continue // directory entry for the wrapper itself
    // Skip directory entries (path ends with /) — fflate represents
    // directories as zero-byte entries with trailing slash. We don't
    // need to preserve them in the output zip; unzip recreates dirs
    // as needed from file paths.
    if (repoRelative.endsWith('/')) continue

    const matches = paths.some(p => repoRelative.startsWith(p))
    if (!matches) continue

    output[repoRelative] = entryBytes
    includedPaths.push(repoRelative)
  }

  // Sort includedPaths so the manifest is deterministic regardless of
  // zip entry order. Easier to scan for the caller.
  includedPaths.sort()

  const repackedBytes = zipSync(output, { level: 6 })

  return {
    bytes: repackedBytes,
    size: repackedBytes.length,
    filename: simpleName,
    contentType: 'application/zip',
    filtered: true,
    includedPaths,
  }
}

// ─── Quota inspection ──────────────────────────────────────────────────────

/**
 * Fetch repo-level metadata relevant to quota inspection.
 *
 * GitHub's /repos/{owner}/{repo} endpoint returns ~80 fields; we project
 * down to just the ones the server_check_quotas tool actually surfaces. The
 * size field is reported in KB (not bytes) — a long-standing API quirk
 * documented at https://docs.github.com/en/rest/repos/repos. The caller
 * is responsible for converting to human-readable units.
 *
 * Returns: {
 *   size_kb: number,         // total repo size in kilobytes
 *   default_branch: string,  // typically 'main'
 *   private: boolean,        // visibility
 *   html_url: string,        // browser URL
 *   pushed_at: string,       // ISO 8601, last push timestamp
 * }
 */
export async function getRepoMetadata(env, repo) {
  const { ok, status, body } = await ghFetch(env, `/repos/${repo}`)
  if (!ok) throw ghError(status, body, `metadata ${repo}`)
  return {
    size_kb: body.size ?? 0,
    default_branch: body.default_branch || 'main',
    private: body.private === true,
    html_url: body.html_url || `https://github.com/${repo}`,
    pushed_at: body.pushed_at || null,
  }
}

/**
 * Fetch the PAT's current rate-limit budget across the three GitHub API
 * surfaces we might touch.
 *
 * GitHub's /rate_limit endpoint returns a `resources` object with one
 * entry per API surface — we extract core (REST writes/reads), search
 * (search API, separate budget), and graphql (also separate). The
 * write-heavy path the rest of this server takes hits `core`, so that's
 * the budget operators most need to watch.
 *
 * `reset` is a Unix epoch timestamp in seconds (when the bucket
 * replenishes). Converting to a human-readable time-until-reset is the
 * MCP tool handler's job.
 *
 * Returns: {
 *   core:    { limit, used, remaining, reset },
 *   search:  { limit, used, remaining, reset },
 *   graphql: { limit, used, remaining, reset },
 * }
 *
 * Each bucket may be null if GitHub doesn't return it for this PAT
 * (the search and graphql buckets are sometimes omitted on niche tokens).
 */
export async function getRateLimitStatus(env) {
  const { ok, status, body } = await ghFetch(env, `/rate_limit`)
  if (!ok) throw ghError(status, body, `rate_limit`)
  const r = body.resources || {}
  return {
    core: r.core || null,
    search: r.search || null,
    graphql: r.graphql || null,
  }
}

// ─── GitHub Actions: workflow runs ─────────────────────────────────────────

/**
 * Project a GitHub workflow-run response object to the fields we surface.
 *
 * GitHub returns ~30 fields per run; we keep the dozen that answer
 * operational questions ("did it run, did it pass, when, why, where do I
 * look"). Untouched fields are dropped to keep MCP tool output readable
 * and to avoid leaking incidental data (run-attempt metadata, internal
 * IDs) into model context where it could shape responses.
 */
function projectWorkflowRun(run) {
  return {
    id: run.id,
    run_number: run.run_number,
    name: run.name,
    display_title: run.display_title,
    status: run.status,            // queued | in_progress | completed | etc.
    conclusion: run.conclusion,    // success | failure | cancelled | etc. (null while running)
    event: run.event,              // push | workflow_dispatch | pull_request | etc.
    head_branch: run.head_branch,
    head_sha: run.head_sha,
    created_at: run.created_at,
    updated_at: run.updated_at,
    html_url: run.html_url,
    workflow_id: run.workflow_id,
    path: run.path,                // .github/workflows/<name>.yml
  }
}

/**
 * List workflow runs for a repo, with optional filtering.
 *
 * Maps to GET /repos/{owner}/{repo}/actions/runs. The workflow argument
 * is optional: when supplied, it's combined into the URL path to filter
 * to a single workflow (its filename or numeric id both work for that
 * endpoint). Status filter is GitHub's `status` query param, which
 * accepts a small enum (queued, in_progress, completed, success,
 * failure, etc.) plus the convenience values like `waiting`.
 *
 * Returns { total_count, runs: [{projected fields}, ...] }. total_count
 * is GitHub's reported total across all pages; we only return one page
 * (per_page caps at 100, default 30).
 */
export async function listWorkflowRuns(env, repo, options = {}) {
  const { workflow, status, perPage } = options
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (typeof perPage === 'number') params.set('per_page', String(perPage))
  const qs = params.toString() ? `?${params}` : ''

  // GitHub supports two URL shapes here:
  //   /repos/{repo}/actions/runs            — all runs across all workflows
  //   /repos/{repo}/actions/workflows/{id}/runs — runs for one workflow
  // The second form accepts either the workflow's filename or numeric id.
  const url = workflow
    ? `/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs${qs}`
    : `/repos/${repo}/actions/runs${qs}`

  const { ok, status: httpStatus, body } = await ghFetch(env, url)
  if (!ok) throw ghError(httpStatus, body, `list runs ${repo}${workflow ? `:${workflow}` : ''}`)
  return {
    total_count: body.total_count ?? 0,
    runs: (body.workflow_runs || []).map(projectWorkflowRun),
  }
}

/**
 * Read a single workflow run plus its per-job step summary.
 *
 * Maps to two GitHub endpoints:
 *   GET /repos/{repo}/actions/runs/{run_id}        — run details
 *   GET /repos/{repo}/actions/runs/{run_id}/jobs   — per-job steps
 *
 * We fetch both in parallel because debugging "why did this run fail"
 * almost always wants both: the run-level conclusion *and* the specific
 * step that produced it. Returning them in separate tool calls would
 * force the agent to round-trip twice for every failure investigation.
 *
 * Step projection: each job's steps array gets reduced to { name,
 * status, conclusion, started_at, completed_at, number }. We drop the
 * step's internal id and the GitHub-internal "outputs" field, neither
 * of which is useful for surface-level diagnosis.
 */
export async function readWorkflowRun(env, repo, runId) {
  const [runRes, jobsRes] = await Promise.all([
    ghFetch(env, `/repos/${repo}/actions/runs/${encodeURIComponent(runId)}`),
    ghFetch(env, `/repos/${repo}/actions/runs/${encodeURIComponent(runId)}/jobs`),
  ])
  if (!runRes.ok) throw ghError(runRes.status, runRes.body, `read run ${repo}#${runId}`)
  if (!jobsRes.ok) throw ghError(jobsRes.status, jobsRes.body, `read jobs ${repo}#${runId}`)

  const run = projectWorkflowRun(runRes.body)
  const jobs = (jobsRes.body.jobs || []).map(j => ({
    id: j.id,
    name: j.name,
    status: j.status,
    conclusion: j.conclusion,
    started_at: j.started_at,
    completed_at: j.completed_at,
    html_url: j.html_url,
    steps: (j.steps || []).map(s => ({
      number: s.number,
      name: s.name,
      status: s.status,
      conclusion: s.conclusion,
      started_at: s.started_at,
      completed_at: s.completed_at,
    })),
  }))

  return { run, jobs }
}

/**
 * Fetch a workflow run's log archive (a zip of plain-text log files).
 *
 * Maps to GET /repos/{repo}/actions/runs/{run_id}/logs, which returns a
 * 302 redirect to a short-lived signed URL. GitHub recommends following
 * the redirect; fetch() does that by default. The body is binary
 * (application/zip), often several MB for long runs.
 *
 * Returns raw bytes plus the archive size and a synthetic filename. The
 * MCP tool layer is responsible for staging these into the
 * workspace-fetch DO and returning a single-use download URL — same
 * pattern as repo_fetch_file_to_workspace. This function intentionally
 * does NOT inline the bytes as base64 in a tool response; log archives
 * are too big to fit comfortably in context.
 *
 * 404 is reported as { found: false } rather than throwing — runs older
 * than ~90 days have their logs garbage-collected and the tool layer
 * should report that distinctly from "no such run".
 */
export async function readWorkflowRunLogs(env, repo, runId) {
  const res = await ghFetchRaw(env, `/repos/${repo}/actions/runs/${encodeURIComponent(runId)}/logs`)
  if (res.status === 404) return { found: false }
  if (res.status === 410) return { found: false, expired: true }
  if (!res.ok) {
    // For non-2xx statuses other than 404/410, try to parse a JSON
    // error body for a useful message before failing.
    let body = null
    try { body = await res.json() } catch {}
    throw ghError(res.status, body, `read run logs ${repo}#${runId}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  return {
    found: true,
    bytes,
    size: bytes.length,
    filename: `run-${runId}-logs.zip`,
    contentType: 'application/zip',
  }
}

/**
 * Cancel an in-progress workflow run.
 *
 * Maps to POST /repos/{repo}/actions/runs/{run_id}/cancel. Returns 202
 * Accepted on success (cancellation is asynchronous; the run transitions
 * to "cancelled" state shortly after). The endpoint returns an empty
 * body on success; we synthesize a return shape for the caller.
 *
 * 409 means the run isn't in a cancellable state (already completed,
 * already cancelling, etc.) — surface that as a structured failure
 * rather than a generic error so the tool layer can produce a useful
 * message.
 */
export async function cancelWorkflowRun(env, repo, runId) {
  const res = await ghFetchRaw(
    env,
    `/repos/${repo}/actions/runs/${encodeURIComponent(runId)}/cancel`,
    { method: 'POST' },
  )
  if (res.status === 202) {
    return { ok: true, cancelled: true, runId }
  }
  if (res.status === 409) {
    let body = null
    try { body = await res.json() } catch {}
    return {
      ok: false,
      conflict: true,
      runId,
      message: body?.message || 'Run is not in a cancellable state',
    }
  }
  let body = null
  try { body = await res.json() } catch {}
  throw ghError(res.status, body, `cancel run ${repo}#${runId}`)
}

/**
 * Dispatch a workflow_dispatch-eligible workflow.
 *
 * Maps to POST /repos/{repo}/actions/workflows/{file_or_id}/dispatches.
 * Returns 204 No Content on success — the API tells us the dispatch was
 * accepted but does not return the resulting run's id. To find the run
 * the dispatch produced, the caller has to poll repo_list_workflow_runs and
 * filter by event=workflow_dispatch and a recent created_at.
 *
 * inputs is an optional object mapped to the workflow's declared inputs.
 * ref is the git ref the workflow runs against; defaults to the default
 * branch when omitted.
 *
 * This function intentionally does NOT poll for the resulting run — that
 * decision belongs to the tool layer or the caller, who can make
 * trade-offs about how long to wait before giving up.
 */
export async function dispatchWorkflow(env, repo, workflowFile, options = {}) {
  const { ref = 'main', inputs = {} } = options
  const payload = { ref, ...(Object.keys(inputs).length > 0 ? { inputs } : {}) }
  const res = await ghFetchRaw(
    env,
    `/repos/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (res.status === 204) {
    return {
      ok: true,
      dispatched: true,
      workflow: workflowFile,
      ref,
      inputs,
    }
  }
  let body = null
  try { body = await res.json() } catch {}
  throw ghError(res.status, body, `dispatch workflow ${repo}:${workflowFile}`)
}

// ─── GitHub Pull Requests ──────────────────────────────────────────────────

/**
 * Project a pull-request object to the fields the MCP layer surfaces.
 *
 * Like workflow runs, GitHub's PR objects are large (~40 fields with
 * nested user objects). We keep the ones useful for "what PRs are open,
 * what's in them, can I merge them" workflows and drop the rest.
 */
function projectPullRequest(pr) {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,             // open | closed
    draft: pr.draft === true,
    merged: pr.merged === true,  // only present on the single-PR endpoint
    mergeable: pr.mergeable,     // true | false | null (unknown, still computing)
    mergeable_state: pr.mergeable_state, // clean | dirty | blocked | behind | unstable | unknown
    head_ref: pr.head?.ref,
    head_sha: pr.head?.sha,
    base_ref: pr.base?.ref,
    user_login: pr.user?.login,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    html_url: pr.html_url,
    body: pr.body || null,
  }
}

/**
 * List pull requests for a repo.
 *
 * Maps to GET /repos/{owner}/{repo}/pulls. The state argument controls
 * whether closed PRs are included (default open, since that's the
 * common case). head is a filter for the source branch — useful for
 * finding the catalog/youtube-* branches the YouTube workflow produces.
 *
 * The list endpoint returns PRs without the `mergeable`/`mergeable_state`
 * fields populated; those require a single-PR fetch. So this returns
 * mostly the metadata-level view; readPullRequest below fills in the
 * mergeability detail when needed.
 */
export async function listPullRequests(env, repo, options = {}) {
  const { state = 'open', head, perPage } = options
  const params = new URLSearchParams()
  params.set('state', state)
  if (head) params.set('head', head)
  if (typeof perPage === 'number') params.set('per_page', String(perPage))
  const url = `/repos/${repo}/pulls?${params}`

  const { ok, status, body } = await ghFetch(env, url)
  if (!ok) throw ghError(status, body, `list PRs ${repo} state=${state}`)
  return (body || []).map(projectPullRequest)
}

/**
 * Read a single pull request, including mergeability detail.
 *
 * Maps to GET /repos/{owner}/{repo}/pulls/{number}. Unlike the list
 * endpoint, this one populates `mergeable` and `mergeable_state`. The
 * `mergeable` field is asynchronously computed by GitHub; if you call
 * this right after a push, it may be `null` for a few seconds until
 * GitHub finishes the check. Callers wanting a definitive answer should
 * retry after a short delay if they see null.
 *
 * Used internally by mergePullRequest as a sanity check, and exposed
 * separately so the MCP layer can surface PR detail if the user asks.
 */
async function readPullRequest(env, repo, number) {
  const { ok, status, body } = await ghFetch(env, `/repos/${repo}/pulls/${encodeURIComponent(number)}`)
  if (status === 404) return null
  if (!ok) throw ghError(status, body, `read PR ${repo}#${number}`)
  return projectPullRequest(body)
}

/**
 * Merge a pull request.
 *
 * Maps to PUT /repos/{owner}/{repo}/pulls/{number}/merge. Returns 200
 * with a payload containing the merge commit SHA on success, 405 if the
 * PR isn't mergeable (closed, conflicts, required checks pending), or
 * 409 if the merge attempt hit a race (the head SHA changed between
 * mergeability check and merge attempt).
 *
 * mergeMethod accepts "merge" (true merge commit), "squash" (single
 * commit on the base), or "rebase" (rebase + fast-forward). We default
 * to "squash" because the wiki's history is much cleaner with squashed
 * catalog commits than with the noisy multi-commit branches the catalog
 * workflows tend to produce.
 *
 * commitTitle and commitMessage are optional overrides; when omitted,
 * GitHub uses the PR's title and the auto-generated commit list.
 *
 * Returns { merged: true, sha } on success, or { merged: false, reason }
 * for known non-merge outcomes (already merged, not mergeable). Other
 * failures throw.
 */
export async function mergePullRequest(env, repo, number, options = {}) {
  const { mergeMethod = 'squash', commitTitle, commitMessage } = options
  const payload = { merge_method: mergeMethod }
  if (commitTitle) payload.commit_title = commitTitle
  if (commitMessage) payload.commit_message = commitMessage

  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/pulls/${encodeURIComponent(number)}/merge`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  if (status === 200 && body?.merged === true) {
    return { merged: true, sha: body.sha, message: body.message || 'Pull Request successfully merged' }
  }
  if (status === 405) {
    // 405 Method Not Allowed = PR isn't in a mergeable state. The body
    // typically has a useful message ("Pull Request is not mergeable",
    // "At least 1 approving review is required", etc.).
    return { merged: false, reason: body?.message || 'Pull request is not mergeable' }
  }
  if (status === 409) {
    return { merged: false, reason: body?.message || 'Head ref changed since merge attempt; refetch and retry' }
  }
  if (!ok) throw ghError(status, body, `merge PR ${repo}#${number}`)
  // 200 but merged !== true would be unexpected; surface defensively.
  return { merged: false, reason: 'GitHub returned 200 but merged=false; check the PR directly' }
}

/**
 * Close a pull request without merging.
 *
 * Maps to PATCH /repos/{owner}/{repo}/pulls/{number} with { state:
 * "closed" }. Idempotent on GitHub's side: closing an already-closed PR
 * returns 200 with the closed PR. We treat that case as a no-op rather
 * than an error.
 *
 * Use this to abandon PRs that should not be merged — for example, the
 * leftover catalog/youtube-* PRs once the YouTube flow is migrated to
 * commit directly to main.
 */
export async function closePullRequest(env, repo, number) {
  const { ok, status, body } = await ghFetch(
    env,
    `/repos/${repo}/pulls/${encodeURIComponent(number)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' }),
    },
  )
  if (!ok) throw ghError(status, body, `close PR ${repo}#${number}`)
  return {
    closed: true,
    number: body.number,
    state: body.state,
    was_already_closed: body.state === 'closed' && body.closed_at && body.closed_at !== body.updated_at,
    html_url: body.html_url,
  }
}

// readPullRequest is internal to this module today; export it in case
// the MCP layer ever adds a read_pull_request tool. No tool currently
// uses it directly — repo_list_pull_requests covers the surveyed use case.
export { readPullRequest }
