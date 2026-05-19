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
// flex-with-tags-floated-right layout. Date column appears on Sources and
// Synthesis (where date carries information), but not on Concepts or
// Entities (which are evergreen and don't have a meaningful "date").
const COLLECTION_TABLE_SLUGS: Record<string, { showDate: boolean }> = {
  "reflect/sources": { showDate: true },
  "reflect/synthesis": { showDate: true },
  "reflect/concepts": { showDate: false },
  "reflect/entities": { showDate: false },
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
    // Column order: Title -> Date -> Summary -> Subjects -> Tags
    // Sortable: Title (alphabetical) and Date (chronological).
    // Default sort applied by the SSR sorter above is "newest first" via
    // byDateAndAlphabeticalFolderFirst. The client-side sort script in
    // PageList.afterDOMLoaded picks up that default and lets the user
    // toggle by clicking a sortable header.
    const showDate = tableConfig.showDate

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
              <th class="col-title sortable sort-active" data-sort="title">
                Title
                <span class="sort-indicator">⇅</span>
              </th>
              {showDate && (
                <th class="col-date sortable" data-sort="date">
                  Date
                  <span class="sort-indicator">⇅</span>
                </th>
              )}
              <th class="col-summary">Summary</th>
              <th class="col-subjects">Subjects</th>
              <th class="col-tags">Tags</th>
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

              return (
                <tr data-title={title.toLowerCase()} data-date={isoDate}>
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
                  <td class="col-tags">
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
                  </td>
                </tr>
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

   Column order: Title -> Date -> Summary -> Subjects -> Tags. */

/* Sources & Synthesis (5 columns: Title / Date / Summary / Subjects / Tags) */
.jb-table th.col-title,
.jb-table td.col-title {
  width: 22%;
  font-weight: 500;
}
.jb-table th.col-date,
.jb-table td.col-date {
  width: 12%;
  white-space: nowrap;
}
.jb-table th.col-summary,
.jb-table td.col-summary {
  width: 28%;
}
.jb-table th.col-subjects,
.jb-table td.col-subjects {
  width: 20%;
}
.jb-table th.col-tags,
.jb-table td.col-tags {
  width: 18%;
}

/* When Date column is absent (Concepts & Entities), redistribute the
   freed-up space across the remaining four columns. */
.jb-table > table:not(:has(.col-date)) th.col-title,
.jb-table > table:not(:has(.col-date)) td.col-title {
  width: 24%;
}
.jb-table > table:not(:has(.col-date)) th.col-summary,
.jb-table > table:not(:has(.col-date)) td.col-summary {
  width: 30%;
}
.jb-table > table:not(:has(.col-date)) th.col-subjects,
.jb-table > table:not(:has(.col-date)) td.col-subjects {
  width: 22%;
}
.jb-table > table:not(:has(.col-date)) th.col-tags,
.jb-table > table:not(:has(.col-date)) td.col-tags {
  width: 24%;
}

.jb-table td.col-title a {
  text-decoration: none;
}

.jb-table td.col-summary span.muted,
.jb-table td.col-subjects span.muted {
  color: var(--gray);
  font-style: italic;
}

/* Tags list inside the table cell — inline-flex, wrap, tight spacing. */
.jb-table .tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.jb-table .tags > li {
  margin: 0;
  padding: 0;
}

/* Subjects list — same shape as tags but unlinked plain pills, with a
   slightly stronger visual weight (subjects are deliberate; tags are
   descriptive). The styling is restrained on purpose: subjects
   shouldn't shout. */
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
  white-space: nowrap;
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

// Client-side sort behavior for the Reflect table headers.
//
// The SSR render emits rows in "newest first" order via the Quartz
// sorter. This script runs on every Quartz `nav` event (which fires on
// initial load AND on every SPA navigation) and:
//
// 1. Finds the .table-container.jb-table table on the page (if any).
// 2. Wires a click handler onto every <th class="sortable">.
// 3. On click, reorders the <tr> elements in <tbody> by the active key
//    (data-title or data-date), respecting the current ascending/
//    descending direction and updating the chevron indicator.
//
// State is held in plain locals — there's only ever one such table per
// page, so we don't need to scope state per element. `addCleanup` is
// Quartz's hook for tearing down listeners before the next nav event.
PageList.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const wrapper = document.querySelector(".table-container.jb-table")
  if (!wrapper) return
  const table = wrapper.querySelector("table")
  const tbody = table && table.querySelector("tbody")
  if (!table || !tbody) return

  // Default state matches the SSR render: sorted by date descending.
  // If this table has no Date column (Concepts/Entities), default to
  // title ascending instead.
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
        indEl.textContent = "⇅"
      }
    })

    const rows = Array.from(tbody.querySelectorAll("tr"))
    rows.sort((a, b) => {
      const av = a.getAttribute("data-" + sortKey) || ""
      const bv = b.getAttribute("data-" + sortKey) || ""
      // Empty values (rows with no date, mostly) sort to the bottom in
      // ascending order and to the top in descending order — consistent
      // with the SSR sorter's handling of missing dates.
      if (av === "" && bv !== "") return sortAsc ? 1 : -1
      if (bv === "" && av !== "") return sortAsc ? -1 : 1
      // For dates, parse to numeric timestamps and compare. ISO 8601
      // strings happen to sort correctly under string comparison, but
      // making the comparison explicitly numeric guarantees correct
      // chronological ordering even if the date format ever changes.
      // For titles (or any other string key), fall through to a plain
      // case-aware string compare.
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
    rows.forEach((row) => tbody.appendChild(row))
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
  }})
`
