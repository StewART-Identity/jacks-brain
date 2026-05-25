import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
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
      { title: "Write", slug: "notes/write" },
      { title: "Browse", slug: "notes/browse" },
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
