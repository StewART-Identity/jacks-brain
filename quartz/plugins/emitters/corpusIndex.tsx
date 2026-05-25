import { FullSlug, SimpleSlug, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { getDate } from "../../components/Date"

/**
 * CorpusIndex — build-time emitter that produces a single
 * /static/corpus.json file containing one rich record per page.
 *
 * Designed to be consumed by the Visualize sub-pages (Timeline,
 * Subjects, Tags, Confidence), the Quiz section, and future analytics
 * components. It is intentionally separate from ContentIndex's
 * linkIndex.json — that file's shape is constrained by the existing
 * search/graph consumers, and adding richer frontmatter to it would
 * risk breaking them.
 *
 * Schema:
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
 *         "links": [ "slug-1", "slug-2" ],
 *         "quiz": [ { "q": "...", "a": "...", "added": "..." } ]
 *       },
 *       ...
 *     ]
 *   }
 *
 * Implementation notes:
 *
 *   - Same walk pattern as ContentIndex: iterate the transformed
 *     content array, pull each file's frontmatter + parsed-link data,
 *     normalize, push.
 *
 *   - Frontmatter normalization happens once here. We don't want
 *     each visualization re-implementing "what if `tags` is a single
 *     string vs. array vs. null vs. undefined" — that's a recipe for
 *     drift.
 *
 *   - Dates are emitted as ISO strings. Notes carry ISO datetimes
 *     (with hours/minutes/seconds) so chronological sorting within a
 *     day works; other pages carry YYYY-MM-DD. Consumers should
 *     parse with new Date(s); both shapes round-trip correctly.
 *
 *   - Type inference: frontmatter.type is the canonical source. If
 *     missing, we infer from the slug prefix so older pages without
 *     explicit type are still classified for the visualizations.
 *
 *   - We emit empty arrays rather than undefined for tags / subjects
 *     / views / links / quiz so the JSON shape is uniform. Consumers
 *     can iterate without null-checking; `.length === 0` is the
 *     absence test.
 */

type ConfidenceLevel = "high" | "medium" | "low" | "speculative"
type PageType = "source" | "entity" | "concept" | "synthesis" | "note"

interface CorpusView {
  date: string
  note: string
}

interface CorpusQuizEntry {
  q: string
  a: string
  added: string | null
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
  quiz: CorpusQuizEntry[]
}

interface CorpusOutput {
  generated: string
  pages: CorpusPage[]
}

/* ───── Frontmatter normalization helpers ────────────────────────── */

function normalizeStringArray(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr
    .filter((v) => typeof v === "string" || typeof v === "number")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0)
}

function normalizeStringOrNull(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== "string" && typeof raw !== "number") return null
  const s = String(raw).trim()
  return s.length > 0 ? s : null
}

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
  if (slug.startsWith("reflect/sources/")) return "source"
  if (slug.startsWith("reflect/entities/")) return "entity"
  if (slug.startsWith("reflect/concepts/")) return "concept"
  if (slug.startsWith("reflect/synthesis/")) return "synthesis"
  if (slug.startsWith("notes/")) return "note"
  return null
}

function normalizeViews(raw: unknown): CorpusView[] {
  if (!Array.isArray(raw)) return []
  const out: CorpusView[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const date = normalizeStringOrNull(e.date)
    const note = normalizeStringOrNull(e.note)
    if (date === null) continue
    out.push({ date, note: note ?? "" })
  }
  return out
}

// Quiz entries — same shape as views, defensively normalized. An
// entry needs both `q` and `a` to be a non-empty string; otherwise
// it's dropped. `added` is optional.
function normalizeQuiz(raw: unknown): CorpusQuizEntry[] {
  if (!Array.isArray(raw)) return []
  const out: CorpusQuizEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const q = normalizeStringOrNull(e.q)
    const a = normalizeStringOrNull(e.a)
    if (q === null || a === null) continue
    const added = normalizeStringOrNull(e.added)
    out.push({ q, a, added })
  }
  return out
}

function emitDate(frontmatterValue: unknown, fallback: Date | undefined): string | null {
  const fm = normalizeStringOrNull(frontmatterValue)
  if (fm !== null) return fm
  if (fallback) {
    const y = fallback.getUTCFullYear()
    const m = String(fallback.getUTCMonth() + 1).padStart(2, "0")
    const d = String(fallback.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  return null
}

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
        const quiz = normalizeQuiz(frontmatter.quiz)

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
          quiz,
        })
      }

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
