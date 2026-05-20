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
      component: Component.SourcesList(),
      condition: (page) => page.fileData.slug === "reflect/sources",
    }),
    Component.ConditionalRender({
      component: Component.Notes(),
      condition: (page) =>
        page.fileData.slug === "reflect/notes" ||
        page.fileData.slug === "reflect/notes/index",
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
      { title: "Notes", slug: "reflect/notes" },
    ],
  }),
  Component.SidebarLink({
    title: "Visualize",
    slug: "visualize",
    defaultState: "open",
    links: [
      { title: "Graph", slug: "visualize/graph" },
      { title: "Help", slug: "visualize/help" },
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
