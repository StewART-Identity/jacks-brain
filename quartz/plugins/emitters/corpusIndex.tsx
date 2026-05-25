import { FullSlug, SimpleSlug, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { getDate } from "../../components/Date"

/**
 * CorpusIndex — build-time emitter that produces a single
 * /static/corpus.json file containing one rich record per page.
 *
 * Designed to be consumed by the Visualize sub-pages (Timeline,
 * Subjects, Tags, Confidence) and future analytics components. It is
 * intentionally separate from ContentIndex's linkIndex.json — that
 * file's shape is constrained by the existing search/graph consumers,
 * and adding richer frontmatter to it would risk breaking them.
 *
 * Schema (also documented in the commit message and in CLAUDE.md if
 * we add a "shared static data" section later):
 *
 *   {
 *     "generated": "2026-05-24T18:32:00.000Z",
 *     "pages": [
 *       {
 *         "slug": "reflect/sources/...",
 *         "title": "...",
 *         "type": "source" | "entity" | "concept" | "synthesis" |
 *                 "note" | null,
 *         "summary": "...",
 *         "created": "2026-05-04",       // ISO date or datetime
 *         "updated": "2026-05-04",
 *         "subjects": ["..."],
 *         "tags": ["..."],
 *         "confidence": "high" | "medium" | "low" | "speculative" |
 *                       null,
 *         "role": "argument" | "evidence" | ... | null,
 *         "views": [ { "date": "...", "note": "..." } ],
 *         "links": [ "slug-1", "slug-2" ]
 *       },
 *       ...
 *     ]
 *   }
 *
 * Implementation notes:
 *
 *   - Same walk pattern as ContentIndex: iterate ctx.cfg.plugins'
 *     transformed content array, pull each file's frontmatter +
 *     parsed-link data, normalize, push to the array.
 *
 *   - Frontmatter normalization happens once here. We don't want
 *     each visualization re-implementing "what if `tags` is a single
 *     string vs. array vs. null vs. undefined" — that's a recipe
 *     for drift.
 *
 *   - Dates are emitted as ISO strings. Notes carry ISO datetimes
 *     (with hours/minutes/seconds) so chronological sorting within a
 *     day works; other pages carry YYYY-MM-DD. Consumers should
 *     parse with new Date(s); both shapes round-trip correctly.
 *
 *   - Type inference: frontmatter.type is the canonical source. If
 *     missing, we infer from the slug prefix so older pages without
 *     explicit type are still classified for the visualizations.
 *     Visualizations that filter by type should rely on the emitted
 *     value rather than re-inferring on the client.
 *
 *   - We emit empty arrays rather than undefined for tags / subjects
 *     / views / links so the JSON shape is uniform. Consumers can
 *     iterate without null-checking; `.length === 0` is the absence
 *     test.
 */

type ConfidenceLevel = "high" | "medium" | "low" | "speculative"
type PageType = "source" | "entity" | "concept" | "synthesis" | "note"

interface CorpusView {
  date: string
  note: string
}

interface CorpusPage {
  slug: string
  title: string
  type: PageType | null
  summary: string
  created: string | null
  updated: string | null
  subjects: string[]
  tags: string[]
  confidence: ConfidenceLevel | null
  role: string | null
  views: CorpusView[]
  links: string[]
}

interface CorpusOutput {
  generated: string
  pages: CorpusPage[]
}

/* ───── Frontmatter normalization helpers ────────────────────────── */

// Coerce a frontmatter value that should be string[] into a clean
// array. Handles single-string, array, null, undefined, and stray
// non-string entries (numbers, nulls) by stringifying and trimming.
function normalizeStringArray(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr
    .filter((v) => typeof v === "string" || typeof v === "number")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
}

// Coerce a frontmatter value that should be a single string. Returns
// the trimmed string, or null if missing/empty/non-stringable.
function normalizeStringOrNull(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== "string" && typeof raw !== "number") return null
  const s = String(raw).trim()
  return s.length > 0 ? s : null
}

// Confidence is a constrained vocabulary — only the four values
// listed in CLAUDE.md are valid. Anything else returns null so a
// visualization filtering by confidence doesn't have to handle
// freeform values.
function normalizeConfidence(raw: unknown): ConfidenceLevel | null {
  const s = normalizeStringOrNull(raw)
  if (s === null) return null
  const lower = s.toLowerCase()
  if (
    lower === "high" ||
    lower === "medium" ||
    lower === "low" ||
    lower === "speculative"
  ) {
    return lower
  }
  return null
}

// Page type is the canonical classifier. Frontmatter.type is preferred;
// if missing we infer from the slug prefix so pages predating the
// `type:` convention still classify. The slug-prefix inference matches
// the directory layout in CLAUDE.md.
function inferType(
  frontmatterType: unknown,
  slug: string,
): PageType | null {
  const fromFrontmatter = normalizeStringOrNull(frontmatterType)
  if (fromFrontmatter !== null) {
    const lower = fromFrontmatter.toLowerCase()
    if (
      lower === "source" ||
      lower === "entity" ||
      lower === "concept" ||
      lower === "synthesis" ||
      lower === "note"
    ) {
      return lower
    }
  }
  // Slug-prefix fallback. Order matters: notes lives at top level so
  // the prefix is just "notes/", while sources/entities/concepts/
  // synthesis live under reflect/.
  if (slug.startsWith("reflect/sources/")) return "source"
  if (slug.startsWith("reflect/entities/")) return "entity"
  if (slug.startsWith("reflect/concepts/")) return "concept"
  if (slug.startsWith("reflect/synthesis/")) return "synthesis"
  if (slug.startsWith("notes/")) return "note"
  return null
}

// Views — source-only. Frontmatter parser leaves them as an array of
// objects with date + note keys. We coerce each to {date: string,
// note: string} and drop any malformed entries.
function normalizeViews(raw: unknown): CorpusView[] {
  if (!Array.isArray(raw)) return []
  const out: CorpusView[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const date = normalizeStringOrNull(e.date)
    const note = normalizeStringOrNull(e.note)
    if (date === null) continue // date is required
    out.push({ date, note: note ?? "" })
  }
  return out
}

// Date emission. Prefer the frontmatter string if present (notes have
// ISO datetimes; other pages have YYYY-MM-DD). Fall back to the
// CreatedModifiedDate plugin's parsed Date, formatted as YYYY-MM-DD.
// Returns null if neither source has a value.
function emitDate(frontmatterValue: unknown, fallback: Date | undefined): string | null {
  const fm = normalizeStringOrNull(frontmatterValue)
  if (fm !== null) return fm
  if (fallback) {
    // Format as YYYY-MM-DD to match the rest of the wiki's date convention.
    const y = fallback.getUTCFullYear()
    const m = String(fallback.getUTCMonth() + 1).padStart(2, "0")
    const d = String(fallback.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  return null
}

// Outbound wikilink normalization. Quartz hands us SimpleSlug[] but
// they may include duplicates and case variations. Dedupe and
// lowercase. Self-links (page links to itself) are dropped because
// they're noise in every visualization that uses them.
function normalizeLinks(rawLinks: SimpleSlug[] | undefined, selfSlug: string): string[] {
  if (!Array.isArray(rawLinks)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const link of rawLinks) {
    const s = String(link).trim().toLowerCase()
    if (!s || s === selfSlug.toLowerCase()) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

/* ───── Emitter ─────────────────────────────────────────────────── */

export const CorpusIndex: QuartzEmitterPlugin = () => {
  return {
    name: "CorpusIndex",
    async *emit(ctx, content) {
      const pages: CorpusPage[] = []

      for (const [, file] of content) {
        const slug = file.data.slug
        if (!slug) continue

        const frontmatter = (file.data.frontmatter ?? {}) as Record<string, unknown>
        const title = (frontmatter.title as string) ?? slug
        const summary = normalizeStringOrNull(frontmatter.summary) ?? ""
        const subjects = normalizeStringArray(frontmatter.subjects)
        const tags = normalizeStringArray(frontmatter.tags)
        const confidence = normalizeConfidence(frontmatter.confidence)
        const role = normalizeStringOrNull(frontmatter.role)
        const type = inferType(frontmatter.type, slug)
        const views = normalizeViews(frontmatter.views)

        // Date sources:
        //   - frontmatter.created / frontmatter.updated when present
        //   - file.data.dates (set by CreatedModifiedDate plugin) as fallback
        const parsedDate = getDate(ctx.cfg.configuration, file.data)
        const created = emitDate(frontmatter.created, parsedDate)
        const updated = emitDate(frontmatter.updated, parsedDate)

        const links = normalizeLinks(file.data.links, slug)

        pages.push({
          slug,
          title,
          type,
          summary,
          created,
          updated,
          subjects,
          tags,
          confidence,
          role,
          views,
          links,
        })
      }

      // Stable output order: by slug ascending. The visualizations
      // sort as they need, but a stable order means the emitted JSON
      // diffs cleanly across builds when content hasn't materially
      // changed.
      pages.sort((a, b) => a.slug.localeCompare(b.slug))

      const output: CorpusOutput = {
        generated: new Date().toISOString(),
        pages,
      }

      const fp = joinSegments("static", "corpus") as FullSlug
      yield write({
        ctx,
        content: JSON.stringify(output),
        slug: fp,
        ext: ".json",
      })
    },
  }
}
