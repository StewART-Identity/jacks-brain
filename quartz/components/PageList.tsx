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

// Collection sub-pages render as actual data tables instead of the default
// flex-with-tags-floated-right layout. Date column appears on Sources and
// Synthesis (where date carries information), but not on Concepts or
// Entities (which are evergreen and don't have a meaningful "date").
const COLLECTION_TABLE_SLUGS: Record<string, { showDate: boolean }> = {
  "collection/sources": { showDate: true },
  "collection/synthesis": { showDate: true },
  "collection/concepts": { showDate: false },
  "collection/entities": { showDate: false },
}

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabeticalFolderFirst(cfg)
  let list = allFiles.sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  const currentSlug = fileData.slug ?? ""
  // Quartz's FullSlug for an index page includes the trailing 'index'
  // segment (e.g. "collection/sources/index"). Strip it for the lookup.
  const lookupSlug = currentSlug.replace(/\/index$/, "")
  const tableConfig = COLLECTION_TABLE_SLUGS[lookupSlug]

  if (tableConfig) {
    // Collection sub-page: render as a real table.
    const showDate = tableConfig.showDate
    return (
      <div class="table-container collection-table">
        <table>
          <thead>
            <tr>
              <th class="col-title">Title</th>
              <th class="col-summary">Summary</th>
              <th class="col-tags">Tags</th>
              {showDate && <th class="col-date">Date</th>}
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

              return (
                <tr>
                  <td class="col-title">
                    <a
                      href={resolveRelative(fileData.slug!, page.slug!)}
                      class="internal"
                    >
                      {title}
                    </a>
                  </td>
                  <td class="col-summary">
                    {summary ? (
                      <span>{summary}</span>
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
                  {showDate && (
                    <td class="col-date">
                      {page.dates && (
                        <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                      )}
                    </td>
                  )}
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

/* Collection sub-page table styling */

.collection-table {
  margin: 1rem 0;
}

.collection-table > table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.collection-table th,
.collection-table td {
  vertical-align: top;
  padding: 0.5rem 0.75rem;
}

.collection-table th {
  text-align: left;
  border-bottom: 2px solid var(--gray);
  font-weight: 600;
  background-color: var(--light);
}

.collection-table tbody tr {
  border-bottom: 1px solid var(--lightgray);
}
.collection-table tbody tr:last-child {
  border-bottom: none;
}

/* Column widths — Title is fixed-ish; Summary stretches; Tags is bounded;
   Date is narrow. */
.collection-table th.col-title,
.collection-table td.col-title {
  width: 12rem;
  font-weight: 500;
}
.collection-table th.col-summary,
.collection-table td.col-summary {
  width: auto;
}
.collection-table th.col-tags,
.collection-table td.col-tags {
  width: 14rem;
}
.collection-table th.col-date,
.collection-table td.col-date {
  width: 7rem;
  white-space: nowrap;
}

.collection-table td.col-title a {
  text-decoration: none;
}

.collection-table td.col-summary span.muted {
  color: var(--gray);
  font-style: italic;
}

/* Tags list inside the table cell — inline-flex, wrap, tight spacing. */
.collection-table .tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.collection-table .tags > li {
  margin: 0;
  padding: 0;
}
`
