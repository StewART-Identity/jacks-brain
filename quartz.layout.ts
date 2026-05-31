import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// Predicate: this page can host quiz questions. Used both by
// QuizSuggest (renders the "Generate questions" button) and matches
// the slug-allowlist that /api/quiz/suggest enforces server-side.
//
// Quiz questions are stored in each individual content page's
// `quiz:` frontmatter, then aggregated at runtime by QuizTake from
// /static/corpus.json. Subjects come from each page's `subjects:`
// frontmatter, so the dropdown on /quiz/take groups by subject
// across the whole wiki. Topic landings (e.g. upskill/git) don't
// need their own quiz buttons — they're curated intros, and the
// concept pages they link to are the ones that contribute to the
// subject's quiz pool.
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
// object-model) with UI shells (upskill/add, upskill/update,
// upskill/topics) — the prefix alone can't tell them apart, so we
// list the shells here explicitly. Kept in sync with the
// SHELL_EXCLUSIONS Sets in functions/api/quiz/suggest.ts and
// functions/api/quiz/status.ts.
const QUIZ_SHELL_EXCLUSIONS = new Set([
  "upskill/add",
  "upskill/update",
  "upskill/topics",
])
// Topic landings (upskill/git, upskill/web-styling) — single-segment
// slugs under upskill/ that act as curated intros pointing at the
// concept pages within. They don't carry their own quiz questions;
// the concept pages do, and Quiz Take aggregates them by subject.
function isUpskillTopicLanding(slug: string): boolean {
  if (!slug.startsWith("upskill/")) return false
  const rest = slug.slice("upskill/".length)
  return rest.length > 0 && !rest.includes("/") && !QUIZ_SHELL_EXCLUSIONS.has(slug)
}
function isQuizzablePage(slug: string | undefined): boolean {
  if (!slug) return false
  if (slug.endsWith("/index")) return false
  if (QUIZ_SHELL_EXCLUSIONS.has(slug)) return false
  if (isUpskillTopicLanding(slug)) return false
  for (const prefix of QUIZZABLE_PREFIXES) {
    if (slug.startsWith(prefix) && slug.length > prefix.length) return true
  }
  return false
}

/**
 * Compute the default open/closed state for a sidebar section based
 * on the current page's slug. A section is open iff the current page
 * belongs to it — e.g. on /notes/add, Notes is open and everything
 * else is collapsed.
 *
 * Implemented as a factory because Component.SidebarLink() is called
 * at module load, before any specific page is being rendered. The
 * actual defaultState resolution happens lazily when SidebarLink
 * itself renders — see SidebarLink.tsx. The defaultState passed in
 * here is just the baseline ("collapsed" for almost all sections);
 * SidebarLink's render function picks up the per-page override by
 * checking whether fileData.slug starts with opts.slug.
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
      condition: (page) => page.fileData.slug === "notes/add",
    }),
    Component.ConditionalRender({
      component: Component.NotesList(),
      condition: (page) => page.fileData.slug === "notes/update",
    }),
    Component.ConditionalRender({
      component: Component.JournalForm(),
      condition: (page) => page.fileData.slug === "journal/add",
    }),
    Component.ConditionalRender({
      component: Component.JournalList(),
      condition: (page) => page.fileData.slug === "journal/update",
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
      component: Component.UpskillAdd(),
      condition: (page) => page.fileData.slug === "upskill/add",
    }),
    Component.ConditionalRender({
      component: Component.UpskillUpdate(),
      condition: (page) => page.fileData.slug === "upskill/update",
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
      component: Component.LinksManager(),
      condition: (page) => page.fileData.slug === "application/links",
    }),
    Component.ConditionalRender({
      component: Component.LinksPreview(),
      condition: (page) => page.fileData.slug === "application/preview",
    }),
    Component.ConditionalRender({
      component: Component.PrivateContent(),
      condition: (page) => page.fileData.slug === "application/private",
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
// e.g. "notes/add" opens the "notes" section.
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

    // ─── DOING — capture and curate raw inputs ────────────────────
    Component.SidebarZoneHeader({ label: "Doing", first: true }),
    Component.SidebarLink({
      title: "Search",
      slug: "search",
      defaultState: sectionDefaultState(pageSlug, "search"),
      links: [
        { title: "Web", slug: "search/web" },
        { title: "Wiki", slug: "search/wiki" },
      ],
    }),
    Component.SidebarLink({
      title: "Notes",
      slug: "notes",
      defaultState: sectionDefaultState(pageSlug, "notes"),
      links: [
        { title: "Add", slug: "notes/add" },
        { title: "Update", slug: "notes/update" },
        { title: "Entries", slug: "notes/entries" },
      ],
    }),
    Component.SidebarLink({
      title: "Journal",
      slug: "journal",
      defaultState: sectionDefaultState(pageSlug, "journal"),
      links: [
        { title: "Add", slug: "journal/add" },
        { title: "Update", slug: "journal/update" },
        { title: "Entries", slug: "journal/entries" },
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

    // ─── SEEING — survey what's accumulated ─────────────────────
    Component.SidebarZoneHeader({ label: "Seeing" }),
    Component.SidebarLink({
      title: "Reflect",
      slug: "reflect",
      defaultState: sectionDefaultState(pageSlug, "reflect"),
      links: [
        { title: "Concepts", slug: "reflect/concepts" },
        { title: "Entities", slug: "reflect/entities" },
        { title: "Sources", slug: "reflect/sources" },
        { title: "Synthesis", slug: "reflect/synthesis" },
      ],
    }),
    Component.SidebarLink({
      title: "Visualize",
      slug: "visualize",
      defaultState: sectionDefaultState(pageSlug, "visualize"),
      links: [
        { title: "Confidence", slug: "visualize/confidence" },
        { title: "Graph", slug: "visualize/graph" },
        { title: "Subjects", slug: "visualize/subjects" },
        { title: "Tags", slug: "visualize/tags" },
        { title: "Timeline", slug: "visualize/timeline" },
        { title: "Help", slug: "visualize/help", icon: "help" },
      ],
    }),

    // ─── STUDYING — build and test your own knowledge ──────────────
    Component.SidebarZoneHeader({ label: "Studying" }),
    Component.SidebarLink({
      title: "Upskill",
      slug: "upskill",
      defaultState: sectionDefaultState(pageSlug, "upskill"),
      links: [
        { title: "Add", slug: "upskill/add" },
        { title: "Update", slug: "upskill/update" },
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

    // ─── META — the workshop itself ────────────────────────
    Component.SidebarZoneHeader({ label: "Meta" }),
    Component.SidebarLink({
      title: "Application",
      slug: "application",
      defaultState: sectionDefaultState(pageSlug, "application"),
      links: [
        { title: "About", slug: "application/about" },
        { title: "Nuke It From Orbit", slug: "application/nuke" },
      ],
    }),
    Component.SidebarLink({
      title: "Links",
      slug: "application/links",
      defaultState: sectionDefaultState(pageSlug, "application/links"),
      links: [
        { title: "Manage", slug: "application/links" },
        { title: "Preview", slug: "application/preview" },
        { title: "Private Content", slug: "application/private" },
        { title: "Public Content", slug: "application/public-content" },
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
