import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { QuartzPluginData, defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import { FullSlug, joinSegments, pathToRoot } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { FolderContent } from "../../components"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"
import { scanTopics, TopicMeta } from "../../util/upskill"

/**
 * UpskillPage — emit one HTML landing page per Upskill topic, plus the
 * /upskill/ section landing.
 *
 * The Upskill section is data-driven: topics live as
 *   data/upskill/<slug>/meta.json
 * with their actual study material at
 *   content/upskill/<slug>/*.md
 *
 * The sidebar links to /upskill/<slug>/ for each topic. Without this
 * emitter, those URLs would only resolve if either (a) the user
 * hand-wrote a content/upskill/<slug>.md shim, or (b) Quartz's
 * FolderPage emitter had at least one .md file to discover under
 * content/upskill/<slug>/. Empty topics — perfectly normal early in a
 * topic's life — would 404. This emitter fixes that by manufacturing
 * the landing page from meta.json.
 *
 * Emitter ordering: this plugin must run after FolderPage in the
 * emitters array (see quartz.config.ts). When both emit to the same
 * slug (a topic that has both meta.json AND study pages under it),
 * UpskillPage wins by writing last, which is what we want — our
 * version knows about the topic's meta.json summary.
 *
 * Body rendering: we use FolderContent as pageBody, the same component
 * the standard /reflect/<category>/ pages use. It walks the trie for
 * the slug and renders a sortable PageList of children. For an empty
 * topic this lists nothing; the meta.json summary appears via the
 * synthetic frontmatter's `description` field, which FolderContent
 * surfaces when the tree itself is empty.
 */
export const UpskillPage: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: FolderContent(),
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "UpskillPage",
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
      const topics = scanTopics()

      // Section landing — /upskill/
      yield* emitSyntheticPage({
        ctx,
        slug: joinSegments("upskill", "index") as FullSlug,
        title: "Upskill",
        description: "Self-directed study material — topics derived from data/upskill/.",
        allFiles,
        opts,
        resources,
      })

      // One landing per visible topic.
      for (const topic of topics) {
        yield* emitTopicPage({ ctx, topic, allFiles, opts, resources })
      }
    },
    async *partialEmit(ctx, content, resources, _changeEvents) {
      // Rescan from disk on every partial rebuild. The set of topics
      // can change between builds (a new meta.json was added, an old
      // one removed) and we don't try to track which change events
      // imply a topic-set change — easier to just re-derive.
      const allFiles = content.map((c) => c[1].data)
      const topics = scanTopics()

      yield* emitSyntheticPage({
        ctx,
        slug: joinSegments("upskill", "index") as FullSlug,
        title: "Upskill",
        description: "Self-directed study material — topics derived from data/upskill/.",
        allFiles,
        opts,
        resources,
      })

      for (const topic of topics) {
        yield* emitTopicPage({ ctx, topic, allFiles, opts, resources })
      }
    },
  }
}

interface EmitTopicArgs {
  ctx: BuildCtx
  topic: TopicMeta
  allFiles: QuartzPluginData[]
  opts: FullPageLayout
  resources: StaticResources
}

async function* emitTopicPage({ ctx, topic, allFiles, opts, resources }: EmitTopicArgs) {
  yield* emitSyntheticPage({
    ctx,
    slug: joinSegments("upskill", topic.slug, "index") as FullSlug,
    title: topic.title,
    description: topic.summary ?? "",
    allFiles,
    opts,
    resources,
  })
}

interface EmitSyntheticArgs {
  ctx: BuildCtx
  slug: FullSlug
  title: string
  description: string
  allFiles: QuartzPluginData[]
  opts: FullPageLayout
  resources: StaticResources
}

async function* emitSyntheticPage({
  ctx,
  slug,
  title,
  description,
  allFiles,
  opts,
  resources,
}: EmitSyntheticArgs) {
  const [tree, file] = defaultProcessedContent({
    slug,
    frontmatter: { title, tags: [] },
    description,
  })
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
  yield write({
    ctx,
    content,
    slug,
    ext: ".html",
  })
}
