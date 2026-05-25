import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { FullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"

interface SubjectContentOptions {
  sort?: SortFn
  numPages: number
}

const defaultOptions: SubjectContentOptions = {
  numPages: 10,
}

/**
 * SubjectContent — page renderer for the /subjects and /subjects/<name>
 * routes. Mirrors TagContent's structure precisely so the browse
 * surfaces are interchangeable from a user perspective; the only
 * differences are:
 *
 *   - reads `subjects` from frontmatter (not `tags`)
 *   - emitted under /subjects/ (not /tags/)
 *   - doesn't apply getAllSegmentPrefixes — subjects don't have
 *     a hierarchical "foo/bar" form. Each subject is a flat atom
 *     in the controlled vocabulary; if `foo/bar` ever appears it's
 *     a wrong-vocabulary entry, not a hierarchy.
 *   - i18n strings are hardcoded (see commit message)
 *
 * Like TagContent, this component is invoked by SubjectPage (its
 * companion emitter) for every subject in the corpus plus a single
 * /subjects index page.
 */
export default ((opts?: Partial<SubjectContentOptions>) => {
  const options: SubjectContentOptions = { ...defaultOptions, ...opts }

  const SubjectContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props
    const slug = fileData.slug

    if (!(slug?.startsWith("subjects/") || slug === "subjects")) {
      throw new Error(
        `Component "SubjectContent" tried to render a non-subject page: ${slug}`,
      )
    }

    // Normalize the subjects array on a page. Frontmatter parsing
    // leaves `subjects:` as whatever YAML gave us — usually
    // string[], occasionally a single string. Same coercion as the
    // corpus emitter so the two surfaces stay in sync.
    const pageSubjects = (file: QuartzPluginData): string[] => {
      const raw = file.frontmatter?.subjects
      if (raw === undefined || raw === null) return []
      const arr = Array.isArray(raw) ? raw : [raw]
      return arr
        .filter((s) => typeof s === "string" || typeof s === "number")
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0)
    }

    const subject = simplifySlug(slug.slice("subjects/".length) as FullSlug)
    const allPagesWithSubject = (subject: string) =>
      allFiles.filter((file) => pageSubjects(file).includes(subject))

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")

    // /subjects (the index page) → list every subject with its
    // page count, with the first N pages under each.
    if (subject === "/") {
      const subjects = [
        ...new Set(allFiles.flatMap((data) => pageSubjects(data))),
      ].sort((a, b) => a.localeCompare(b))
      const subjectItemMap: Map<string, QuartzPluginData[]> = new Map()
      for (const s of subjects) {
        subjectItemMap.set(s, allPagesWithSubject(s))
      }
      return (
        <div class="popover-hint">
          <article class={classes}>
            <p>{content}</p>
          </article>
          <p>Found {subjects.length} total subjects.</p>
          <div>
            {subjects.map((s) => {
              const pages = subjectItemMap.get(s)!
              const listProps = {
                ...props,
                allFiles: pages,
              }

              const subjectListingPage = `/subjects/${s}` as FullSlug
              const href = resolveRelative(fileData.slug!, subjectListingPage)
              const count = pages.length
              const countText =
                count === 1 ? "1 page" : `${count} pages`

              return (
                <div>
                  <h2>
                    <a class="internal tag-link" href={href}>
                      {s}
                    </a>
                  </h2>
                  <div class="page-listing">
                    <p>
                      {countText} under this subject.
                      {pages.length > options.numPages && (
                        <>
                          {" "}
                          <span>Showing first {options.numPages}.</span>
                        </>
                      )}
                    </p>
                    <PageList limit={options.numPages} {...listProps} sort={options?.sort} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // /subjects/<name> → list every page whose subjects: array
    // contains <name>.
    const pages = allPagesWithSubject(subject)
    const listProps = {
      ...props,
      allFiles: pages,
    }
    const count = pages.length
    const countText = count === 1 ? "1 page" : `${count} pages`

    return (
      <div class="popover-hint">
        <article class={classes}>{content}</article>
        <div class="page-listing">
          <p>{countText} under this subject.</p>
          <div>
            <PageList {...listProps} sort={options?.sort} />
          </div>
        </div>
      </div>
    )
  }

  SubjectContent.css = concatenateResources(style, PageList.css)
  // Forward PageList's client-side sort behavior. Same rationale as
  // TagContent and FolderContent — Quartz collects component scripts
  // at the emitter level and doesn't recurse into children, so we
  // hoist PageList's afterDOMLoaded up to where it'll be picked up.
  SubjectContent.afterDOMLoaded = PageList.afterDOMLoaded
  return SubjectContent
}) satisfies QuartzComponentConstructor
