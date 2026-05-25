import fs from "fs"
import path from "path"

/**
 * Upskill — dynamic-sidebar plumbing for the /upskill/ section.
 *
 * The Upskill section is data-driven: rather than hand-listing topics
 * in quartz.layout.ts, we scan `data/upskill/<slug>/meta.json` files
 * at build time and derive both the sidebar entries and the topic
 * landing pages from that scan.
 *
 * Why: the topics here are study material that gets added and removed
 * frequently, sometimes in small slices. The two-step "register the
 * topic in meta.json and write the study pages" workflow is friendlier
 * to that cadence than "register the topic in TypeScript layout config
 * AND write the study pages AND add a shim landing page" would be.
 *
 * Scoping: this module is intentionally hard-coded to data/upskill/
 * rather than parameterized over a generic dataDir. We don't have a
 * second dynamic section today; if one shows up later, generalize
 * then. (See the related discussion in the architecture chat that
 * led to this commit.)
 */

const UPSKILL_DATA_DIR = "data/upskill"

export interface TopicMeta {
  /** Directory name under data/upskill/. URL-safe, kebab-case. */
  slug: string
  /** Display label shown in the sidebar and on the topic landing page. */
  title: string
  /** Sort priority within the sidebar. Ascending. Ties broken by slug. */
  order: number
  /** Optional one-line description shown on the topic landing page. */
  summary?: string
  /**
   * Exclude this topic from the sidebar without deleting its directory.
   * Useful for parking half-written topics. The topic's pages can still
   * be browsed by direct URL — they're just unlinked from the sidebar.
   */
  hidden?: boolean
}

/**
 * Read every meta.json under data/upskill/<*>/ and return the topics
 * sorted for sidebar display.
 *
 * Behavior:
 *   - Missing data/upskill/ directory → returns []. Important because
 *     this function runs at module load in quartz.layout.ts, which
 *     happens on every Quartz invocation including a fresh checkout
 *     where the data dir hasn't been created yet.
 *   - Subdirectory without meta.json → silently skipped. A topic
 *     without metadata isn't ready to surface.
 *   - meta.json that fails to parse → logged and skipped. The build
 *     proceeds with the other topics. Better to surface 8 of 9 topics
 *     than to fail the whole build because one meta.json has a
 *     trailing comma.
 *   - hidden: true → topic excluded from the returned array entirely.
 *     The caller doesn't need to filter again.
 *
 * Sort:
 *   - Ascending by `order`. Topics without an explicit order are
 *     treated as order: 9999 and pushed to the end.
 *   - Ties broken alphabetically by slug, so the sort is deterministic
 *     across builds.
 */
export function scanTopics(): TopicMeta[] {
  if (!fs.existsSync(UPSKILL_DATA_DIR)) {
    return []
  }

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(UPSKILL_DATA_DIR, { withFileTypes: true })
  } catch (err) {
    console.warn(`[upskill] Could not read ${UPSKILL_DATA_DIR}: ${(err as Error).message}`)
    return []
  }

  const topics: TopicMeta[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const slug = entry.name
    const metaPath = path.join(UPSKILL_DATA_DIR, slug, "meta.json")

    if (!fs.existsSync(metaPath)) {
      // Subdirectory without meta.json — not yet a topic.
      continue
    }

    let parsed: unknown
    try {
      const raw = fs.readFileSync(metaPath, "utf-8")
      parsed = JSON.parse(raw)
    } catch (err) {
      console.warn(`[upskill] Could not parse ${metaPath}: ${(err as Error).message}`)
      continue
    }

    if (!parsed || typeof parsed !== "object") {
      console.warn(`[upskill] ${metaPath} did not parse to an object; skipping`)
      continue
    }

    const meta = parsed as Record<string, unknown>

    // The slug in meta.json must match the directory name. We trust
    // the directory name as authoritative (it's what shows up in the
    // URL) and warn if meta.json's `slug` disagrees.
    const metaSlug = typeof meta.slug === "string" ? meta.slug : undefined
    if (metaSlug !== undefined && metaSlug !== slug) {
      console.warn(
        `[upskill] ${metaPath} slug "${metaSlug}" disagrees with directory name "${slug}"; using directory name`,
      )
    }

    const title = typeof meta.title === "string" && meta.title.trim().length > 0
      ? meta.title.trim()
      : slug
    const order = typeof meta.order === "number" && Number.isFinite(meta.order)
      ? meta.order
      : 9999
    const summary = typeof meta.summary === "string" && meta.summary.trim().length > 0
      ? meta.summary.trim()
      : undefined
    const hidden = meta.hidden === true

    if (hidden) continue

    topics.push({ slug, title, order, summary })
  }

  topics.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.slug.localeCompare(b.slug)
  })

  return topics
}
