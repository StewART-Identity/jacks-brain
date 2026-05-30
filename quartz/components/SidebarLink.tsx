import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/sidebarLink.inline"

interface Options {
  title: string
  slug: string
  links: { title: string; slug: string; icon?: "help" }[]
  /**
   * Explicit-override initial state. SidebarLink also auto-opens the
   * section if the current page's slug belongs to it (see
   * isCurrentPageInSection in the render function); this option is
   * the fallback when that's not true.
   *
   * Most callers should pass "collapsed" — the per-page auto-expand
   * does the right thing for the section the user is currently in,
   * and a quiet sidebar is the better default for everything else.
   * Pass "open" only when you want a section open regardless of
   * which page is being rendered (rare).
   */
  defaultState: "collapsed" | "open"
}

/**
 * One collapsible section in the left sidebar.
 *
 * Per-page open/closed behavior: the section auto-opens if the
 * current page's slug belongs to it. Specifically, opens when
 * fileData.slug equals opts.slug OR starts with opts.slug + "/".
 * That covers both the section index page (e.g. /notes when opts.slug
 * is "notes") and any descendant page (e.g. /notes/write,
 * /notes/entries/20250524-093102).
 *
 * If neither matches, falls back to opts.defaultState.
 *
 * Anatomy:
 *
 *   <div class="sidebar-nav" data-state="open|closed">
 *     <h2 class="sidebar-nav-heading">
 *       <a class="sidebar-nav-heading-link" href="/section">Section</a>
 *       <button class="sidebar-nav-toggle" aria-expanded="…">▾</button>
 *     </h2>
 *     <ul class="sidebar-nav-list" id="…" hidden?>
 *       <li><a>Page</a></li>
 *     </ul>
 *   </div>
 *
 * The heading text is a real link to the section's index page; the
 * chevron is the collapse toggle. Two click targets, two meanings —
 * direct navigation to the section vs. revealing its sub-pages.
 */
export default ((opts: Options) => {
  const SidebarLink: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const pageSlug = fileData.slug ?? ""
    const sectionSlug = opts.slug
    const isCurrentPageInSection =
      pageSlug === sectionSlug ||
      pageSlug.startsWith(sectionSlug + "/")

    // Per-page open behavior takes precedence over the constructor
    // default. Pages outside the section fall back to opts.defaultState.
    const initiallyOpen = isCurrentPageInSection || opts.defaultState === "open"
    const initialState = initiallyOpen ? "open" : "closed"

    // Generated id for aria-controls. Slug is already a-z0-9- and
    // unique across the layout, so a deterministic id is fine.
    const listId = `sidebar-nav-list-${opts.slug.replace(/\//g, "-")}`

    return (
      <div
        class={classNames(displayClass, "sidebar-nav")}
        data-state={initialState}
        data-section-slug={opts.slug}
      >
        <h2 class="sidebar-nav-heading">
          <a
            href={resolveRelative(fileData.slug!, opts.slug as any)}
            class="sidebar-nav-heading-link"
          >
            {opts.title}
          </a>
          <button
            type="button"
            class="sidebar-nav-toggle"
            aria-expanded={initiallyOpen ? "true" : "false"}
            aria-controls={listId}
            aria-label={`Toggle ${opts.title}`}
          >
            <svg
              class="sidebar-nav-toggle-icon"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              aria-hidden="true"
            >
              <path d="M2 3 L5 7 L8 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </h2>
        <ul class="sidebar-nav-list" id={listId} hidden={!initiallyOpen}>
          {opts.links.map((link) => (
            <li>
              <a
                href={resolveRelative(fileData.slug!, link.slug as any)}
                class={link.icon ? "sidebar-nav-link-has-icon" : undefined}
              >
                {link.icon === "help" && (
                  <svg
                    class="sidebar-nav-link-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                )}
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  SidebarLink.afterDOMLoaded = script

  SidebarLink.css = `
.sidebar-nav {
  display: flex;
  flex-direction: column;
}

.sidebar-nav-heading {
  font-size: 1.1rem;
  margin: 0;
  color: var(--dark);
  /* The chevron sits to the right of the heading text. Flexbox row
     keeps the text on the left, the toggle button hugging the right
     edge of the sidebar column. */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-nav-heading a.sidebar-nav-heading-link {
  color: inherit;
  text-decoration: none;
  display: inline-block;
  transition: color 0.15s ease;
  /* Heading link grows to fill so clicking dead space next to the
     title still hits the link, not the toggle. */
  flex: 1 1 auto;
  min-width: 0;
}
.sidebar-nav-heading a.sidebar-nav-heading-link:hover {
  color: var(--secondary);
}

.sidebar-nav-toggle {
  appearance: none;
  background: transparent;
  border: none;
  padding: 0.2rem 0.3rem;
  margin: 0;
  cursor: pointer;
  color: var(--gray);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  flex-shrink: 0;
}
.sidebar-nav-toggle:hover {
  color: var(--secondary);
  background: color-mix(in srgb, var(--secondary) 10%, transparent);
}
.sidebar-nav-toggle:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 1px;
}
.sidebar-nav-toggle-icon {
  transition: transform 0.15s ease;
  /* Default: pointing down (caret-down). Rotates -90deg when closed
     so it points right. */
}
.sidebar-nav[data-state="closed"] .sidebar-nav-toggle-icon {
  transform: rotate(-90deg);
}

ul.sidebar-nav-list {
  list-style: none;
  padding: 0;
  margin: 0.3rem 0;
}
ul.sidebar-nav-list li {
  padding: 0.15rem 0;
}
ul.sidebar-nav-list a {
  color: var(--dark);
  opacity: 0.75;
  text-decoration: none;
  font-size: 1.05rem;
}
ul.sidebar-nav-list a:hover {
  color: var(--secondary);
  opacity: 1;
}
ul.sidebar-nav-list a.sidebar-nav-link-has-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sidebar-nav-link-icon {
  flex-shrink: 0;
  /* Inherits currentColor from the link, so it tracks the link's
     color and hover state. Slightly smaller than the text for a
     quiet, secondary feel. */
}
`

  return SidebarLink
}) satisfies QuartzComponentConstructor<Options>
