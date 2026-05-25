import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

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
  "upskill/",
]
// UI-shell pages that match a quizzable prefix but aren't actual
// content. The upskill/ tree mixes content pages (e.g. upskill/git/
// object-model) with management/navigation shells (upskill/manage,
// upskill/topics) — the prefix alone can't tell them apart, so we
// list the shells here explicitly.
const QUIZ_SHELL_EXCLUSIONS = new Set([
  "upskill/manage",
  "upskill/topics",
])
function isQuizzablePage(slug: string | undefined): boolean {
  if (!slug) return false
  if (slug.endsWith("/index")) return false
  if (QUIZ_SHELL_EXCLUSIONS.has(slug)) return false
  for (const prefix of QUIZZABLE_PREFIXES) {
    if (slug.startsWith(prefix) && slug.length > prefix.length) return true
  }
  return false
}

// Upskill sidebar: the per-topic listing was removed in favor of a
// single "Topics" link pointing at /upskill/topics, where
// UpskillTopics renders a card grid that scans data/upskill/ at
// build time. quartz/util/upskill.ts (scanTopics) is now consumed
// only by that component, not here.

/**
 * Compute the default open/closed state for a sidebar section based
 * on the current page's slug. A section is open iff the current page
 * belongs to it — e.g. on /notes/write, Notes is open and everything
 * else is collapsed.
 *
 * Implemented as a factory because Component.SidebarLink() is called
 * at module load, before any specific page is being rendered. The
 * actual defaultState resolution happens lazily when SidebarLink
 * itself renders — but since SidebarLink's Options.defaultState is
 * read once at constructor time (not per-render), we can't actually
 * close over `fileData.slug` here.
 *
 * Solution: SidebarLink now accepts defaultState="open" or
 * "collapsed" at constructor time, but its render function reads the
 * current page's slug from QuartzComponentProps and overrides at
 * render time. See SidebarLink.tsx — the actual per-page logic lives
 * there. This file just lists each section's slug prefix and lets
 * SidebarLink figure out openness from the prop.
 *
 * Wait — that's not actually how SidebarLink is structured. Let me
 * keep it simple: pass defaultState: "collapsed" as a baseline, and
 * SidebarLink's render function picks up the per-page override
 * itself by checking whether fileData.slug starts with opts.slug.
 */

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
      component: Component.UpskillTopics(),
      condition: (page) => page.fileData.slug === "upskill/topics",
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

// Section descriptors. Each row is a sidebar section with the slug
// prefix that determines membership ("does the current page belong
// here?") and the list of sub-links it contains. The zone separators
// are interpolated between sections, not encoded here.
//
// SidebarLink's `defaultState` is set to "open" only for the section
// whose slug prefix matches the current page's slug; everything else
// is "collapsed". The match uses startsWith on the section slug so
// e.g. "notes/write" opens the "notes" section.
//
// This is the per-page state computation we promised: it runs every
// time the layout is materialized for a specific page. The user sees
// a quiet sidebar with only the section containing their current
// page expanded by default.
function sectionDefaultState(
  pageSlug: string | undefined,
  sectionSlug: string,
): "open" | "collapsed" {
  if (!pageSlug) return "collapsed"
  if (pageSlug === sectionSlug) return "open"
  if (pageSlug.startsWith(sectionSlug + "/")) return "open"
  return "collapsed"
}

// Build the left sidebar for a specific page. The function takes the
// current page's slug so each SidebarLink section can have its
// defaultState computed at render time.
function buildSidebarLeft(pageSlug: string | undefined) {
  return [
    // In-sidebar collapse button. Positioned absolutely in the
    // top-right of the sidebar via CSS. Source order at the top of the
    // array doesn't determine visual position; CSS does.
    Component.SidebarToggle(),
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),

    // ─── DOING — capture and curate raw inputs ─────────────────────
    Component.SidebarZoneHeader({ label: "Doing", first: true }),
    Component.SidebarLink({
      title: "Search",
      slug: "search",
      defaultState: sectionDefaultState(pageSlug, "search"),
      links: [
        { title: "Wiki", slug: "search/wiki" },
        { title: "Web", slug: "search/web" },
      ],
    }),
    Component.SidebarLink({
      title: "Notes",
      slug: "notes",
      defaultState: sectionDefaultState(pageSlug, "notes"),
      links: [
        { title: "Browse", slug: "notes/browse" },
        { title: "Write", slug: "notes/write" },
      ],
    }),
    Component.SidebarLink({
      title: "Journal",
      slug: "journal",
      defaultState: sectionDefaultState(pageSlug, "journal"),
      links: [
        { title: "Browse", slug: "journal/browse" },
        { title: "Write", slug: "journal/write" },
      ],
    }),
    Component.SidebarLink({
      title: "Collect",
      slug: "collect",
      defaultState: sectionDefaultState(pageSlug, "collect"),
      links: [
        { title: "Selection", slug: "collect/selection" },
        { title: "Acquisition", slug: "collect/acquisition" },
        { title: "Retention", slug: "collect/retention" },
      ],
    }),

    // ─── SEEING — survey what's accumulated ────────────────────────
    Component.SidebarZoneHeader({ label: "Seeing" }),
    Component.SidebarLink({
      title: "Reflect",
      slug: "reflect",
      defaultState: sectionDefaultState(pageSlug, "reflect"),
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
      defaultState: sectionDefaultState(pageSlug, "visualize"),
      links: [
        { title: "Graph", slug: "visualize/graph" },
        { title: "Timeline", slug: "visualize/timeline" },
        { title: "Subjects", slug: "visualize/subjects" },
        { title: "Tags", slug: "visualize/tags" },
        { title: "Confidence", slug: "visualize/confidence" },
      ],
    }),

    // ─── STUDYING — build and test your own knowledge ──────────────
    Component.SidebarZoneHeader({ label: "Studying" }),
    Component.SidebarLink({
      title: "Upskill",
      slug: "upskill",
      defaultState: sectionDefaultState(pageSlug, "upskill"),
      links: [
        { title: "Manage", slug: "upskill/manage" },
        { title: "Topics", slug: "upskill/topics" },
      ],
    }),
    Component.SidebarLink({
      title: "Quiz",
      slug: "quiz",
      defaultState: sectionDefaultState(pageSlug, "quiz"),
      links: [
        { title: "Take", slug: "quiz/take" },
      ],
    }),

    // ─── META — the workshop itself ───────────────────────────────
    Component.SidebarZoneHeader({ label: "Meta" }),
    Component.SidebarLink({
      title: "Application",
      slug: "application",
      defaultState: sectionDefaultState(pageSlug, "application"),
      links: [
        { title: "Help", slug: "application/help" },
        { title: "Nuke It From Orbit", slug: "application/nuke" },
      ],
    }),

    Component.Search(),
  ]
}

// Quartz's layout system reads `left` once at configuration time — it
// doesn't pass per-page state through. To get per-page defaultState
// for SidebarLink, we materialize the sidebar with a slug parameter
// at THIS module's load time using a callable wrapper. But the layout
// API expects a static array, not a function...
//
// Solution: SidebarLink itself reads fileData.slug at render time and
// overrides defaultState if the section matches. The defaultState
// passed in here is the baseline ("collapsed" for almost all
// sections) but SidebarLink's render function does the per-page work.
//
// So we just call buildSidebarLeft with a sentinel value and rely on
// SidebarLink to do the right thing per page.
const sidebarLeft = buildSidebarLeft(undefined)

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
