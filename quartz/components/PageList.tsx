import { FullSlug, isFolderPath, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"

export type SortFn = (f1: QuartzPluginData, f2: QuartzPluginData) => number

export function byDateAndAlphabetical(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    if (f1.dates && f2.dates) {
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

export function byDateAndAlphabeticalFolderFirst(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    const f1IsFolder = isFolderPath(f1.slug ?? "")
    const f2IsFolder = isFolderPath(f2.slug ?? "")
    if (f1IsFolder && !f2IsFolder) return -1
    if (!f1IsFolder && f2IsFolder) return 1

    if (f1.dates && f2.dates) {
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

// Reflect sub-pages render as actual data tables instead of the default
// flex-with-tags-floated-right layout. Configuration per page:
//
//   showDate    — Date column is rendered (Sources only). The catalog
//                 date matters on Sources because URL-based content
//                 (web pages, YouTube videos, evolving reports) is
//                 only meaningful pinned to the version cataloged.
//                 Synthesis/Concepts/Entities are conceptually
//                 evergreen — dates there would be intake-log noise.
//                 If you ever want chronological intake order, that's
//                 the Retention page's job.
//   titleLabel  — User-facing label for the first sortable column.
//                 Sources/Synthesis/Concepts use "Title" because the
//                 cataloged items have titles; Entities use "Name"
//                 because people, organizations, and tools have names,
//                 not titles. The underlying data-sort attribute stays
//                 "title" regardless — only the visible header label
//                 differs.
const COLLECTION_TABLE_SLUGS: Record<
  string,
  { showDate: boolean; titleLabel: string }
> = {
  "reflect/sources": { showDate: true, titleLabel: "Title" },
  "reflect/synthesis": { showDate: false, titleLabel: "Title" },
  "reflect/concepts": { showDate: false, titleLabel: "Title" },
  "reflect/entities": { showDate: false, titleLabel: "Name" },
}

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabeticalFolderFirst(cfg)
  let list = allFiles.sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  const currentSlug = fileData.slug ?? ""
  // Quartz's FullSlug for an index page includes the trailing 'index'
  // segment (e.g. "reflect/sources/index"). Strip it for the lookup.
  const lookupSlug = currentSlug.replace(/\/index$/, "")
  const tableConfig = COLLECTION_TABLE_SLUGS[lookupSlug]

  if (tableConfig) {
    // Reflect sub-page: render as a real table.
    //
    // Column order: Tags-disclose -> Title/Name -> [Date] -> Summary -> Subjects
    // Sortable: Title/Name (alphabetical), Date (chronological) when present.
    // Default sort applied by the SSR sorter above is "newest first" via
    // byDateAndAlphabeticalFolderFirst. The client-side sort script in
    // PageList.afterDOMLoaded picks up that default and lets the user
    // toggle by clicking a sortable header.
    //
    // Each item renders as TWO <tr> elements:
    //   1. A primary row carrying the title, date, summary, and
    //      subjects cells, plus a leading "Tags" disclosure cell with
    //      the chevron-plus-count-plus-noun button.
    //   2. A tag row, initially hidden, with a single full-width <td
    //      colspan> containing the wrapping pill list of tags (or a
    //      muted "—" if the item has no tags).
    // The button in cell 1 toggles cell 2's visibility. Open/closed
    // state is persisted to localStorage per slug — see the toggle
    // script in afterDOMLoaded.
    const showDate = tableConfig.showDate
    const titleLabel = tableConfig.titleLabel

    // Column count for the tag-row's colspan. Includes the disclose
    // column. Sources: 5 (disclose+title+date+summary+subjects).
    // Synthesis/Concepts/Entities: 4 (disclose+title+summary+subjects).
    const colspanCount = showDate ? 5 : 4

    // When the page list is empty, show an explanatory notice instead
    // of the table. Each Reflect sub-page's empty state has its own
    // copy because the reasons for emptiness differ:
    //
    // - Sources/Entities/Concepts: empty means "nothing cataloged yet."
    //   Action: catalog something. The Selection page is the entry
    //   point.
    // - Synthesis: empty is the NORMAL state until you have multiple
    //   sources that connect. The cataloger doesn't manufacture
    //   synthesis pages; it only creates them when a new source
    //   genuinely intersects existing wiki content. Saying "catalog
    //   more" would be misleading — synthesis emerges, it's not
    //   ordered.
    //
    // Subjects pill rendering, tag rendering, etc. are all skipped in
    // this branch since there's nothing to render in those cells.
    if (list.length === 0) {
      const emptyCopy: Record<string, { headline: string; body: string }> = {
        "reflect/sources": {
          headline: "No sources cataloged yet.",
          body: "Upload a document via the Selection page to start the cataloging pipeline.",
        },
        "reflect/entities": {
          headline: "No entities yet.",
          body: "Cataloged sources automatically generate entity pages for the people, organizations, tools, and systems they reference. Entities will appear here as you catalog sources.",
        },
        "reflect/concepts": {
          headline: "No concepts yet.",
          body: "Cataloged sources automatically generate concept pages for the ideas, theories, frameworks, and principles they cover. Concepts will appear here as you catalog sources.",
        },
        "reflect/synthesis": {
          headline: "No synthesis pages yet.",
          body: "Synthesis pages emerge organically — the cataloger creates one when a newly cataloged source genuinely connects to or contrasts with existing wiki content. With only a small number of sources cataloged, there may not be cross-cutting material to synthesize. As the collection grows, synthesis pages will start appearing here.",
        },
      }
      const copy = emptyCopy[lookupSlug]
      return (
        <div class="jb-empty-state">
          <h3>{copy.headline}</h3>
          <p>{copy.body}</p>
        </div>
      )
    }

    return (
      <div class="table-container jb-table">
        <table>
          <thead>
            <tr>
              {/* Tags column header — labels the disclose column. The
                  user-facing word "Tags" lives here so the buttons
                  underneath only have to communicate count and state,
                  not topic. */}
              <th class="col-disclose">Tags</th>
              <th class="col-title sortable sort-active" data-sort="title">
                {titleLabel}
                <span class="sort-indicator">▼</span>
              </th>
              {showDate && (
                <th class="col-date sortable" data-sort="date">
                  Date
                  <span class="sort-indicator">▼</span>
                </th>
              )}
              <th class="col-summary">Summary</th>
              <th class="col-subjects">Subjects</th>
            </tr>
          </thead>
          <tbody>
            {list.map((page) => {
              const title = page.frontmatter?.title ?? "(untitled)"
              const summary =
                (page.frontmatter as Record<string, unknown> | undefined)?.summary as
                  | string
                  | undefined
              const tags = page.frontmatter?.tags ?? []
              // Subjects: controlled-vocabulary classifications. Read
              // from frontmatter directly since QuartzPluginData's
              // typed `frontmatter` only declares the standard fields.
              // Cast to access the `subjects` field we added.
              const subjects =
                ((page.frontmatter as Record<string, unknown> | undefined)?.subjects as
                  | string[]
                  | undefined) ?? []
              // ISO timestamp on the row so the client-side sort script
              // can compare dates without re-parsing the formatted date.
              // Empty string for pages with no date so they sort last on
              // ascending and first on descending — same as undefined-date
              // handling in the SSR sorters above.
              const isoDate = page.dates ? getDate(cfg, page)!.toISOString() : ""

              const pageSlug = page.slug ?? ""
              const hasTags = tags.length > 0

              return (
                <>
                  {/* Primary row — carries the row-level data attributes
                      that the sort script reads. The tag row below
                      inherits its sort position by being the
                      nextElementSibling at re-attach time. */}
                  <tr
                    class="primary-row"
                    data-slug={pageSlug}
                    data-title={title.toLowerCase()}
                    data-date={isoDate}
                  >
                    <td class="col-disclose">
                      {hasTags ? (
                        <button
                          type="button"
                          class="jb-tag-toggle"
                          aria-expanded="false"
                          aria-label={`Show ${tags.length} tag${tags.length === 1 ? "" : "s"} for ${title}`}
                          data-target-slug={pageSlug}
                        >
                          <span class="jb-tag-toggle-chevron" aria-hidden="true">▸</span>
                          <span class="jb-tag-toggle-count">{tags.length}</span>
                          <span class="jb-tag-toggle-label">
                            {tags.length === 1 ? "tag" : "tags"}
                          </span>
                        </button>
                      ) : (
                        <span class="jb-tag-toggle-empty muted" aria-label="No tags">
                          —
                        </span>
                      )}
                    </td>
                    <td class="col-title">
                      <a
                        href={resolveRelative(fileData.slug!, page.slug!)}
                        class="internal"
                      >
                        {title}
                      </a>
                    </td>
                    {showDate && (
                      <td class="col-date">
                        {page.dates && (
                          <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                        )}
                      </td>
                    )}
                    <td class="col-summary">
                      {summary ? (
                        <span>{summary}</span>
                      ) : (
                        <span class="muted">—</span>
                      )}
                    </td>
                    <td class="col-subjects">
                      {subjects.length > 0 ? (
                        <ul class="subjects">
                          {subjects.map((subject) => (
                            <li>{subject}</li>
                          ))}
                        </ul>
                      ) : (
                        <span class="muted">—</span>
                      )}
                    </td>
                  </tr>
                  {/* Tag row — full-width disclosure target. The
                      `hidden` HTML attribute (not CSS display: none) is
                      the source of truth; the toggle script flips it
                      and updates aria-expanded on the matching button.
                      Pairing is via DOM adjacency, not an explicit id
                      reference, which keeps the sort script's
                      pair-move logic simple. */}
                  <tr class="tag-row" data-pair-slug={pageSlug} hidden>
                    <td colspan={colspanCount} class="col-tags-full">
                      {hasTags ? (
                        <ul class="tags">
                          {tags.map((tag) => (
                            <li>
                              <a
                                class="internal tag-link"
                                href={resolveRelative(
                                  fileData.slug!,
                                  `tags/${tag}` as FullSlug,
                                )}
                              >
                                {tag}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span class="muted">—</span>
                      )}
                    </td>
                  </tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Default rendering for other contexts (tag pages, search results, etc.).
  return (
    <ul class="section-ul">
      {list.map((page) => {
        const title = page.frontmatter?.title
        const tags = page.frontmatter?.tags ?? []

        return (
          <li class="section-li">
            <div class="section">
              <p class="meta">
                {page.dates && <Date date={getDate(cfg, page)!} locale={cfg.locale} />}
              </p>
              <div class="desc">
                <h3>
                  <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                    {title}
                  </a>
                </h3>
              </div>
              <ul class="tags">
                {tags.map((tag) => (
                  <li>
                    <a
                      class="internal tag-link"
                      href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                    >
                      {tag}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}

/* Reflect-table-specific styles. The base look (header band, cell
   borders, alternating rows, flush-left) comes from jbtable.scss. */

/* Percentage-based column widths so the table never overflows,
   regardless of viewport width. With table-layout: fixed (set by
   jbtable.scss), widths are ratios.

   Column order: Tags-disclose -> Title -> [Date on Sources only] ->
   Summary -> Subjects. */

/* Tags-disclose column — fits "▸ N tags" comfortably. ~6.5rem accommodates
   "▸ 99 tags" with breathing room. Centered so the cluster reads as a
   single control element. */
.jb-table th.col-disclose,
.jb-table td.col-disclose {
  width: 6.5rem;
  text-align: center;
  white-space: nowrap;
}

/* Sources (5 columns: Tags / Title / Date / Summary / Subjects).
   Date column carries text-align: center !important — diagnostic
   while we figure out what's been beating the previous text-align
   declarations. Two earlier text-align: center rules (one in
   _jbtable.scss, one in this file) didn't visually center the
   dates, so something with higher specificity is overriding.
   !important forces the issue; if THIS works, we know it's a
   specificity problem and can craft a proper-specificity fix. */
.jb-table th.col-title,
.jb-table td.col-title {
  width: 24%;
  font-weight: 500;
}
.jb-table th.col-date,
.jb-table td.col-date {
  width: 14%;
  white-space: nowrap;
  text-align: center !important;
}
.jb-table th.col-summary,
.jb-table td.col-summary {
  width: 32%;
}
.jb-table th.col-subjects,
.jb-table td.col-subjects {
  width: 21%;
}

/* When Date column is absent (Synthesis, Concepts, Entities), redistribute
   the freed-up space across the remaining columns. The :has() selector
   targets only tables without a .col-date cell — the three atemporal
   Reflect tables. */
.jb-table > table:not(:has(.col-date)) th.col-title,
.jb-table > table:not(:has(.col-date)) td.col-title {
  width: 27%;
}
.jb-table > table:not(:has(.col-date)) th.col-summary,
.jb-table > table:not(:has(.col-date)) td.col-summary {
  width: 38%;
}
.jb-table > table:not(:has(.col-date)) th.col-subjects,
.jb-table > table:not(:has(.col-date)) td.col-subjects {
  width: 26%;
}

.jb-table td.col-title a {
  text-decoration: none;
}

.jb-table td.col-summary span.muted,
.jb-table td.col-subjects span.muted {
  color: var(--gray);
  font-style: italic;
}

/* Tag-row striping: each item is two <tr>s (primary + tag), so
   alternation must happen per-pair, not per-row. Items 1, 3, 5, … get
   the lighter fill (group A: 4n+1 = primary, 4n+2 = tag). Items 2, 4,
   6, … get the darker fill (group B: 4n+3 = primary, 4n+4 = tag).

   The PAIR shares one background fill so when the tag row is open,
   the visual effect is one continuous shaded block per item. This is
   the "less distinction between rows" requirement. */
.jb-table > table tbody tr:nth-child(4n+1) td,
.jb-table > table tbody tr:nth-child(4n+2) td {
  background-color: #1B3F29;
}
.jb-table > table tbody tr:nth-child(4n+3) td,
.jb-table > table tbody tr:nth-child(4n+4) td {
  background-color: #163524;
}

/* Tag row: full-width disclosure target.

   No top border so the tag row visually fuses with its primary row
   (same background fill from the pair-aware striping above). Padding
   indents the content to align with the Title column's text content
   — col-disclose is 6.5rem + cell padding (0.75rem), so the left
   padding here matches the visual start of the Title column above.
   This makes the tags read as "belonging to" the title rather than
   sitting in their own anonymous strip. */
.jb-table > table tbody tr.tag-row > td {
  border-top: none;
  padding: 0.2rem 0.75rem 0.75rem 7.25rem;
}

/* Tags list inside the tag row — horizontal wrapping pill row.
   Generous gap because tags are now THE primary content of this row,
   not a cramped column. */
.jb-table .col-tags-full .tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.jb-table .col-tags-full .tags > li {
  margin: 0;
  padding: 0;
}

/* Muted "—" placeholder when an item has no tags. */
.jb-table .col-tags-full .muted {
  color: var(--gray);
  font-style: italic;
}

/* Subjects list — same shape as tags but unlinked plain pills, with a
   slightly stronger visual weight (subjects are deliberate; tags are
   descriptive). The styling is restrained on purpose: subjects
   shouldn't shout.

   NO white-space: nowrap on the pill — long subject names like
   "identity-management" can wrap their text inside the pill rather
   than overflowing the column. The flex-wrap on the parent already
   lets multiple pills stack vertically; this lets a single long pill
   wrap its content when it exceeds the column width. */
.jb-table .subjects {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.jb-table .subjects > li {
  margin: 0;
  padding: 0.05rem 0.4rem;
  background: var(--lightgray);
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--dark);
  overflow-wrap: anywhere;
}

/* Disclose button — chevron + count + "tags" noun.

   Real <button> for keyboard operability and screen-reader semantics.
   Text uses the same warm sand yellow as the column headers so the
   button visually anchors to the column it belongs to. Hover/focus
   states use a soft yellow background wash; transparent → 12% yellow
   gives a discoverable but not distracting affordance. */
.jb-table .jb-tag-toggle {
  background: transparent;
  border: none;
  color: #F0DDB3;
  padding: 0.15rem 0.4rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  border-radius: 4px;
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  transition: background 0.12s ease;
}
.jb-table .jb-tag-toggle:hover,
.jb-table .jb-tag-toggle:focus-visible {
  background: rgba(240, 221, 179, 0.12);
  outline: none;
}
.jb-table .jb-tag-toggle:focus-visible {
  box-shadow: 0 0 0 2px rgba(240, 221, 179, 0.55);
}
.jb-table .jb-tag-toggle-chevron {
  display: inline-block;
  font-size: 0.85em;
  transition: transform 0.15s ease;
}
.jb-table .jb-tag-toggle[aria-expanded="true"] .jb-tag-toggle-chevron {
  transform: rotate(90deg);  /* ▸ pivots into ▾ */
}
.jb-table .jb-tag-toggle-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.jb-table .jb-tag-toggle-label {
  /* Smaller noun to keep the count visually prominent. */
  font-size: 0.9em;
  opacity: 0.85;
}
.jb-table .jb-tag-toggle-empty {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  color: var(--gray);
  font-style: italic;
}

/* Empty-state notice shown on Reflect sub-pages when there are no
   pages of that type yet. Replaces the table entirely — when there's
   nothing to show, the table headers are noise. The message
   distinguishes "no content yet, you should catalog something" (most
   sub-pages) from "this is normal, synthesis emerges over time"
   (synthesis specifically). */
.jb-empty-state {
  margin: 1.5rem 0;
  padding: 1.5rem;
  border: 1px dashed var(--lightgray);
  border-radius: 8px;
  background: rgba(0, 122, 51, 0.03);
  text-align: center;
}
.jb-empty-state h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--secondary);
}
.jb-empty-state p {
  margin: 0;
  color: var(--gray);
  line-height: 1.5;
  max-width: 36rem;
  margin-left: auto;
  margin-right: auto;
}
`

// Client-side behavior for the Reflect tables — covers two distinct
// interactions on the same table:
//
//  1) Column-header sorting (Title/Name / Date), as before but updated
//     to keep primary-row + tag-row pairs together when reordering.
//  2) Per-item tag-row disclosure (chevron buttons), with localStorage
//     persistence so the open set survives sorting, SPA nav, and full
//     reload.
//
// The two interactions share state implicitly via the DOM: open state
// lives on the tag-row's `hidden` attribute and on the matching
// button's `aria-expanded` attribute. When sort moves a primary row,
// we also move its sibling tag-row to follow it — the hidden
// attribute travels with the node, so open state is preserved across
// sort with no extra bookkeeping.
//
// localStorage key: "jb-tag-open" — a JSON-serialized object
// { [slug]: true, … }. We only store opened slugs (no false entries)
// to keep the stored value compact and to make the empty/default
// state self-evident.
PageList.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const wrapper = document.querySelector(".table-container.jb-table")
  if (!wrapper) return
  const table = wrapper.querySelector("table")
  const tbody = table && table.querySelector("tbody")
  if (!table || !tbody) return

  // ───── Tag-row disclosure (localStorage-backed) ─────

  const STORAGE_KEY = "jb-tag-open"

  function loadOpenSet() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return new Set()
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object") return new Set()
      return new Set(Object.keys(parsed).filter((k) => parsed[k] === true))
    } catch (e) {
      // Bad JSON in localStorage (manual edit, version skew). Treat as
      // empty and don't propagate the error — disclosure should never
      // break the page.
      return new Set()
    }
  }

  function persistOpenSet(set) {
    try {
      const obj = {}
      set.forEach((slug) => { obj[slug] = true })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
    } catch (e) {
      // localStorage can throw (private mode, quota). Silent failure
      // here is correct: the UI state stays right for the current
      // session, persistence just doesn't carry over.
    }
  }

  const openSlugs = loadOpenSet()

  // Find the tag-row paired with a primary row. Pairing is by DOM
  // adjacency — the tag-row is always the primary-row's
  // nextElementSibling at SSR time, and the sort handler below
  // preserves that adjacency.
  function tagRowFor(primaryRow) {
    const next = primaryRow.nextElementSibling
    if (next && next.classList.contains("tag-row")) return next
    return null
  }

  function setOpen(primaryRow, open) {
    const tagRow = tagRowFor(primaryRow)
    const button = primaryRow.querySelector(".jb-tag-toggle")
    if (!tagRow || !button) return
    const slug = primaryRow.getAttribute("data-slug") || ""
    if (open) {
      tagRow.hidden = false
      button.setAttribute("aria-expanded", "true")
      if (slug) openSlugs.add(slug)
    } else {
      tagRow.hidden = true
      button.setAttribute("aria-expanded", "false")
      if (slug) openSlugs.delete(slug)
    }
    persistOpenSet(openSlugs)
  }

  // Apply persisted open-state to all primary rows on mount. Runs once
  // after the SSR DOM is in place, before any user interaction.
  function applyPersistedState() {
    const primaryRows = tbody.querySelectorAll("tr.primary-row")
    primaryRows.forEach((row) => {
      const slug = row.getAttribute("data-slug") || ""
      const button = row.querySelector(".jb-tag-toggle")
      const tagRow = tagRowFor(row)
      if (!button || !tagRow) return  // item with no tags — nothing to restore
      if (slug && openSlugs.has(slug)) {
        tagRow.hidden = false
        button.setAttribute("aria-expanded", "true")
      } else {
        // Defensive: ensure consistent baseline. The SSR hidden + aria
        // attributes should already match, but a navigated-to page
        // could have been rendered with stale defaults.
        tagRow.hidden = true
        button.setAttribute("aria-expanded", "false")
      }
    })
  }

  function onToggleClick(ev) {
    const button = ev.currentTarget
    const primaryRow = button.closest("tr.primary-row")
    if (!primaryRow) return
    const isOpen = button.getAttribute("aria-expanded") === "true"
    setOpen(primaryRow, !isOpen)
  }

  // Wire toggle handlers. Each .jb-tag-toggle is a real <button> so
  // Enter/Space activation comes free; we only need the click
  // listener.
  const toggleButtons = tbody.querySelectorAll(".jb-tag-toggle")
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", onToggleClick)
    window.addCleanup(() => btn.removeEventListener("click", onToggleClick))
  })

  applyPersistedState()

  // ───── Column-header sorting ─────

  // Default state matches the SSR render: sorted by date descending.
  // If this table has no Date column (Concepts/Entities/Synthesis),
  // default to title ascending instead.
  const hasDate = !!table.querySelector("th.col-date")
  let sortKey = hasDate ? "date" : "title"
  let sortAsc = hasDate ? false : true

  function indicator(asc) {
    return asc ? "▲" : "▼"
  }

  function applySort() {
    const headers = table.querySelectorAll("th.sortable")
    headers.forEach((th) => {
      const key = th.getAttribute("data-sort")
      const indEl = th.querySelector(".sort-indicator")
      if (!indEl) return
      if (key === sortKey) {
        th.classList.add("sort-active")
        indEl.textContent = indicator(sortAsc)
      } else {
        th.classList.remove("sort-active")
        // Inactive indicator: ▼, same glyph as active. The opacity
        // rule in _jbtable.scss (.sort-indicator { opacity: 0.55 },
        // .sort-active .sort-indicator { opacity: 1 }) does the
        // muting. Using the same glyph keeps the visual weight
        // consistent — earlier ▾ (U+25BE) was a different glyph and
        // rendered visibly smaller than the active ▼ (U+25BC).
        indEl.textContent = "▼"
      }
    })

    // Enumerate primary rows only — tag rows ride along.
    const primaryRows = Array.from(tbody.querySelectorAll("tr.primary-row"))
    primaryRows.sort((a, b) => {
      const av = a.getAttribute("data-" + sortKey) || ""
      const bv = b.getAttribute("data-" + sortKey) || ""
      // Empty values (rows with no date, mostly) sort to the bottom in
      // ascending order and to the top in descending order — consistent
      // with the SSR sorter's handling of missing dates.
      if (av === "" && bv !== "") return sortAsc ? 1 : -1
      if (bv === "" && av !== "") return sortAsc ? -1 : 1
      if (sortKey === "date") {
        const at = Date.parse(av)
        const bt = Date.parse(bv)
        if (at < bt) return sortAsc ? -1 : 1
        if (at > bt) return sortAsc ? 1 : -1
        return 0
      }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

    // Re-append each primary row in sorted order, immediately followed
    // by its paired tag row. appendChild moves existing nodes (it
    // doesn't clone) so the open state on the tag row's hidden
    // attribute is preserved across sort. After the loop, the tbody's
    // child order is primary, tag, primary, tag, … in the new sorted
    // order — striping selectors (4n+1, +2, +3, +4) still match
    // correctly.
    primaryRows.forEach((primaryRow) => {
      const tagRow = tagRowFor(primaryRow)
      tbody.appendChild(primaryRow)
      if (tagRow) tbody.appendChild(tagRow)
    })
  }

  function onHeaderClick(ev) {
    const th = ev.currentTarget
    const key = th.getAttribute("data-sort")
    if (!key) return
    if (sortKey === key) {
      sortAsc = !sortAsc
    } else {
      sortKey = key
      // Sensible default direction per column: newest first for date,
      // A-to-Z for title.
      sortAsc = key !== "date"
    }
    applySort()
  }

  const sortableHeaders = table.querySelectorAll("th.sortable")
  sortableHeaders.forEach((th) => {
    th.addEventListener("click", onHeaderClick)
    window.addCleanup(() =>
      th.removeEventListener("click", onHeaderClick),
    )
  })

  // Set the initial indicator to match the SSR-applied sort order
  // without re-sorting the rows (they're already in the right order).
  const activeHeader = table.querySelector('th.sortable[data-sort="' + sortKey + '"]')
  if (activeHeader) {
    activeHeader.classList.add("sort-active")
    const indEl = activeHeader.querySelector(".sort-indicator")
    if (indEl) indEl.textContent = indicator(sortAsc)
  }

  // If Title is not the active sort key (because Date is), it still
  // has class="sort-active" from the SSR render. Remove it so only
  // the truly active column appears active. Same defensive cleanup
  // for the indicator glyph — the SSR rendered ▼ on Title as a
  // placeholder; if it's not active, the JS above set it back to ▼
  // already, but ensure sort-active is dropped.
  const titleHeader = table.querySelector('th.sortable[data-sort="title"]')
  if (titleHeader && sortKey !== "title") {
    titleHeader.classList.remove("sort-active")
  }})
`
