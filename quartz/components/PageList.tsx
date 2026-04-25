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
      <div class="table-container jb-table">
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

/* Collection-table-specific styles. The base look (header band, cell
   borders, alternating rows, flush-left) comes from jbtable.scss. */

/* Percentage-based column widths so the table never overflows,
   regardless of viewport width. Tags gets the largest share since
   tag pills need horizontal room to look like proper pills.
   With table-layout: fixed (set by jbtable.scss), widths are ratios. */

/* Sources & Synthesis (4 columns: Title / Summary / Tags / Date) */
.jb-table th.col-title,
.jb-table td.col-title {
  width: 18%;
  font-weight: 500;
}
.jb-table th.col-summary,
.jb-table td.col-summary {
  width: 32%;
}
.jb-table th.col-tags,
.jb-table td.col-tags {
  width: 35%;
}
.jb-table th.col-date,
.jb-table td.col-date {
  width: 15%;
  white-space: nowrap;
}

/* When Date column is absent (Concepts & Entities), redistribute the
   freed-up space across the remaining three columns. */
.jb-table > table:not(:has(.col-date)) th.col-title,
.jb-table > table:not(:has(.col-date)) td.col-title {
  width: 22%;
}
.jb-table > table:not(:has(.col-date)) th.col-summary,
.jb-table > table:not(:has(.col-date)) td.col-summary {
  width: 38%;
}
.jb-table > table:not(:has(.col-date)) th.col-tags,
.jb-table > table:not(:has(.col-date)) td.col-tags {
  width: 40%;
}

.jb-table td.col-title a {
  text-decoration: none;
}

.jb-table td.col-summary span.muted {
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
`
