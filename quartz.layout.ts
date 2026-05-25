import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { scanTopics } from "./quartz/util/upskill"

// Predicate: this page can host quiz questions. Used both by
// QuizSuggest (renders the "Generate questions" button) and matches
// the slug-allowlist that /api/quiz/suggest enforces server-side.
const QUIZZABLE_PREFIXES = [
  "reflect/concepts/",
  "reflect/entities/",
  "reflect/sources/",
  "reflect/synthesis/",
  "notes/entries/",
  "journal/entries/",
]
function isQuizzablePage(slug: string | undefined): boolean {
  if (!slug) return false
  if (slug.endsWith("/index")) return false
  for (const prefix of QUIZZABLE_PREFIXES) {
    if (slug.startsWith(prefix) && slug.length > prefix.length) return true
  }
  return false
}

// Upskill topics — scanned from data/upskill/<slug>/meta.json at build
// time. See quartz/util/upskill.ts for the format and contract. The
// scan runs once when this module loads. Topics with `hidden: true`
// are filtered out before this list is returned.
//
// The sidebar sub-links for Upskill are: a static "Manage" link first
// (always present, regardless of whether topics exist) followed by one
// link per visible topic from the scan.
const upskillTopics = scanTopics()

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    // Floating sidebar-expand button. Lives in afterBody, NOT in the
    // sidebar — see SidebarExpand.tsx for the rationale. Visible only
    // when the sidebar is collapsed (CSS-controlled via the
    // html.jb-sidebar-collapsed class). Registered first in afterBody
    // so it renders as the topmost interactive element on the page
    // (z-index also handles ordering).
    Component.SidebarExpand(),
    Component.Hamburger(),
    Component.ConditionalRender({
      component: Component.UploadZone(),
      condition: (page) => page.fileData.slug === "collect/selection",
    }),
    Component.ConditionalRender({
      component: Component.FullGraph(),
      condition: (page) => page.fileData.slug === "visualize/graph",
    }),
    Component.ConditionalRender({
      component: Component.Timeline(),
      condition: (page) => page.fileData.slug === "visualize/timeline",
    }),
    Component.ConditionalRender({
      component: Component.Subjects(),
      condition: (page) => page.fileData.slug === "visualize/subjects",
    }),
    Component.ConditionalRender({
      component: Component.Tags(),
      condition: (page) => page.fileData.slug === "visualize/tags",
    }),
    Component.ConditionalRender({
      component: Component.Confidence(),
      condition: (page) => page.fileData.slug === "visualize/confidence",
    }),
    Component.ConditionalRender({
      component: Component.SourcesList(),
      condition: (page) => page.fileData.slug === "reflect/sources",
    }),
    Component.ConditionalRender({
      component: Component.NoteForm(),
      condition: (page) => page.fileData.slug === "notes/write",
    }),
    Component.ConditionalRender({
      component: Component.NotesList(),
      condition: (page) => page.fileData.slug === "notes/browse",
    }),
    Component.ConditionalRender({
      component: Component.JournalForm(),
      condition: (page) => page.fileData.slug === "journal/write",
    }),
    Component.ConditionalRender({
      component: Component.JournalList(),
      condition: (page) => page.fileData.slug === "journal/browse",
    }),
    Component.ConditionalRender({
      component: Component.QuizTake(),
      condition: (page) => page.fileData.slug === "quiz/take",
    }),
    Component.ConditionalRender({
      component: Component.QuizSuggest(),
      condition: (page) => isQuizzablePage(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.UpskillManage(),
      condition: (page) => page.fileData.slug === "upskill/manage",
    }),
    Component.ConditionalRender({
      component: Component.NukeButton(),
      condition: (page) => page.fileData.slug === "application/nuke",
    }),
    Component.ConditionalRender({
      component: Component.SearchPage(),
      condition: (page) => page.fileData.slug === "search/wiki",
    }),
    Component.ConditionalRender({
      component: Component.ResearchPage(),
      condition: (page) => page.fileData.slug === "search/web",
    }),
    Component.ConditionalRender({
      component: Component.Acquisition(),
      condition: (page) => page.fileData.slug === "collect/acquisition",
    }),
    Component.ConditionalRender({
      component: Component.RetentionList(),
      condition: (page) => page.fileData.slug === "collect/retention",
    }),
  ],
  footer: Component.Footer(),
}

const sidebarLeft = [
  // In-sidebar collapse button. Positioned absolutely in the
  // top-right of the sidebar via CSS. Source order at the top of the
  // array doesn't determine visual position; CSS does.
  Component.SidebarToggle(),
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.SidebarLink({
    title: "Search",
    slug: "search",
    defaultState: "open",
    links: [
      { title: "Wiki", slug: "search/wiki" },
      { title: "Web", slug: "search/web" },
    ],
  }),
  Component.SidebarLink({
    title: "Notes",
    slug: "notes",
    defaultState: "open",
    links: [
      { title: "Browse", slug: "notes/browse" },
      { title: "Write", slug: "notes/write" },
    ],
  }),
  Component.SidebarLink({
    title: "Journal",
    slug: "journal",
    defaultState: "open",
    links: [
      { title: "Browse", slug: "journal/browse" },
      { title: "Write", slug: "journal/write" },
    ],
  }),
  Component.SidebarLink({
    title: "Collect",
    slug: "collect",
    defaultState: "open",
    links: [
      { title: "Selection", slug: "collect/selection" },
      { title: "Acquisition", slug: "collect/acquisition" },
      { title: "Retention", slug: "collect/retention" },
    ],
  }),
  Component.SidebarLink({
    title: "Reflect",
    slug: "reflect",
    defaultState: "open",
    links: [
      { title: "Sources", slug: "reflect/sources" },
      { title: "Entities", slug: "reflect/entities" },
      { title: "Concepts", slug: "reflect/concepts" },
      { title: "Synthesis", slug: "reflect/synthesis" },
    ],
  }),
  Component.SidebarLink({
    title: "Visualize",
    slug: "visualize",
    defaultState: "open",
    links: [
      { title: "Graph", slug: "visualize/graph" },
      { title: "Timeline", slug: "visualize/timeline" },
      { title: "Subjects", slug: "visualize/subjects" },
      { title: "Tags", slug: "visualize/tags" },
      { title: "Confidence", slug: "visualize/confidence" },
    ],
  }),
  // Upskill — Manage entry first (always present), then dynamic
  // sub-links from data/upskill/<slug>/meta.json. Sits between
  // Visualize and Quiz: bring stuff in → make sense of it → expand
  // foundation → test yourself.
  Component.SidebarLink({
    title: "Upskill",
    slug: "upskill",
    defaultState: "open",
    links: [
      { title: "Manage", slug: "upskill/manage" },
      ...upskillTopics.map((t) => ({
        title: t.title,
        slug: `upskill/${t.slug}`,
      })),
    ],
  }),
  Component.SidebarLink({
    title: "Quiz",
    slug: "quiz",
    defaultState: "open",
    links: [
      { title: "Take", slug: "quiz/take" },
    ],
  }),
  Component.ApplicationMenu(),
  Component.Search(),
]

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta({ showReadingTime: false }),
    Component.TagList(),
  ],
  left: sidebarLeft,
  right: [],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta({ showReadingTime: false }),
  ],
  left: sidebarLeft,
  right: [],
}
