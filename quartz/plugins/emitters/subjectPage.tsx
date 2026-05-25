import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { ProcessedContent, QuartzPluginData, defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import { FullSlug, joinSegments, pathToRoot } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { SubjectContent } from "../../components"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"

interface SubjectPageOptions extends FullPageLayout {
  sort?: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

/**
 * Normalize the subjects array on a page. Same coercion as
 * SubjectContent and the corpus emitter — single source of truth
 * for "what does `subjects:` mean" is the controlled-vocabulary
 * rules in CLAUDE.md. Frontmatter parsing can return either an
 * array or a single value; we always emit an array of trimmed
 * non-empty strings.
 */
function pageSubjects(file: QuartzPluginData): string[] {
  const raw = file.frontmatter?.subjects
  if (raw === undefined || raw === null) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr
    .filter((s) => typeof s === "string" || typeof s === "number")
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0)
}

function computeSubjectInfo(
  allFiles: QuartzPluginData[],
  content: ProcessedContent[],
): [Set<string>, Record<string, ProcessedContent>] {
  const subjects: Set<string> = new Set(allFiles.flatMap((data) => pageSubjects(data)))

  // The index page (the /subjects landing). Treated as a pseudo-subject
  // under the name "index" so the rest of the pipeline can iterate
  // uniformly. Same pattern as TagPage.
  subjects.add("index")

  const subjectDescriptions: Record<string, ProcessedContent> = Object.fromEntries(
    [...subjects].map((subject) => {
      const title =
        subject === "index" ? "Subject Index" : `Subject: ${subject}`
      return [
        subject,
        defaultProcessedContent({
          slug: joinSegments("subjects", subject) as FullSlug,
          frontmatter: { title, tags: [] },
        }),
      ]
    }),
  )

  // If the user has explicitly authored a content page under
  // /subjects/<name>.md (similar to how they can author /tags/<tag>.md
  // to give a tag a custom description), use that page's
  // ProcessedContent so the custom prose appears above the listing.
  for (const [tree, file] of content) {
    const slug = file.data.slug!
    if (slug.startsWith("subjects/")) {
      const subject = slug.slice("subjects/".length)
      if (subjects.has(subject)) {
        subjectDescriptions[subject] = [tree, file]
        if (file.data.frontmatter?.title === subject) {
          file.data.frontmatter.title = `Subject: ${subject}`
        }
      }
    }
  }

  return [subjects, subjectDescriptions]
}

async function processSubjectPage(
  ctx: BuildCtx,
  subject: string,
  subjectContent: ProcessedContent,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  const slug = joinSegments("subjects", subject) as FullSlug
  const [tree, file] = subjectContent
  const cfg = ctx.cfg.configuration
  const externalResources = pageResources(pathToRoot(slug), resources)
  const componentData: QuartzComponentProps = {
    ctx,
    fileData: file.data,
    externalResources,
    cfg,
    children: [],
    tree,
    allFiles,
  }

  const content = renderPage(cfg, slug, componentData, opts, externalResources)
  return write({
    ctx,
    content,
    slug: file.data.slug!,
    ext: ".html",
  })
}

export const SubjectPage: QuartzEmitterPlugin<Partial<SubjectPageOptions>> = (userOpts) => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: SubjectContent({ sort: userOpts?.sort }),
    ...userOpts,
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "SubjectPage",
    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
      ]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)
      const [subjects, subjectDescriptions] = computeSubjectInfo(allFiles, content)

      for (const subject of subjects) {
        yield processSubjectPage(
          ctx,
          subject,
          subjectDescriptions[subject],
          allFiles,
          opts,
          resources,
        )
      }
    },
    async *partialEmit(ctx, content, resources, changeEvents) {
      const allFiles = content.map((c) => c[1].data)

      // Find which subject pages need to be rebuilt based on which
      // files changed. Same logic as TagPage's partialEmit, adapted
      // for the subjects field.
      const affectedSubjects: Set<string> = new Set()
      for (const changeEvent of changeEvents) {
        if (!changeEvent.file) continue
        const slug = changeEvent.file.data.slug!

        // Author edited a subject content page directly.
        if (slug.startsWith("subjects/")) {
          const subject = slug.slice("subjects/".length)
          affectedSubjects.add(subject)
        }

        // Author edited a page whose subjects: changed (or any page,
        // since we can't tell which fields changed). Add every
        // subject that page belongs to.
        pageSubjects(changeEvent.file.data).forEach((s) => affectedSubjects.add(s))

        // The index always rebuilds when anything changes — page
        // counts shown on it could have shifted.
        affectedSubjects.add("index")
      }

      if (affectedSubjects.size > 0) {
        const [, subjectDescriptions] = computeSubjectInfo(allFiles, content)
        for (const subject of affectedSubjects) {
          if (subjectDescriptions[subject]) {
            yield processSubjectPage(
              ctx,
              subject,
              subjectDescriptions[subject],
              allFiles,
              opts,
              resources,
            )
          }
        }
      }
    },
  }
}
