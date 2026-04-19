import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.ConditionalRender({
      component: Component.UploadZone(),
      condition: (page) => page.fileData.slug === "learn/knowledge",
    }),
    Component.ConditionalRender({
      component: Component.FullGraph(),
      condition: (page) => page.fileData.slug === "visualize/graph-view",
    }),
    Component.ConditionalRender({
      component: Component.SourcesList(),
      condition: (page) => page.fileData.slug === "recall/sources",
    }),
    Component.ConditionalRender({
      component: Component.NukeButton(),
      condition: (page) => page.fileData.slug === "application/nuke",
    }),
    Component.ConditionalRender({
      component: Component.SearchPage(),
      condition: (page) => page.fileData.slug === "learn/search",
    }),
    Component.ConditionalRender({
      component: Component.DarkModePage(),
      condition: (page) => page.fileData.slug === "application/darkmode",
    }),
    Component.ConditionalRender({
      component: Component.ReadingModePage(),
      condition: (page) => page.fileData.slug === "application/readingmode",
    }),
  ],
  footer: Component.Footer(),
}

const sidebarLeft = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.SidebarLink({
    title: "Learn",
    slug: "learn",
    defaultState: "open",
    links: [
      { title: "Knowledge", slug: "learn/knowledge" },
      { title: "Memory", slug: "learn/memory" },
    ],
  }),
  Component.SidebarLink({
    title: "Study",
    slug: "recall",
    defaultState: "open",
    links: [
      { title: "Sources", slug: "recall/sources" },
      { title: "Entities", slug: "recall/entities" },
      { title: "Concepts", slug: "recall/concepts" },
      { title: "Synthesis", slug: "recall/synthesis" },
      { title: "Search", slug: "learn/search" },
    ],
  }),
  Component.SidebarLink({
    title: "Visualize",
    slug: "visualize",
    defaultState: "open",
    links: [
      { title: "Graph View", slug: "visualize/graph-view" },
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
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta({ showReadingTime: false })],
  left: sidebarLeft,
  right: [],
}
