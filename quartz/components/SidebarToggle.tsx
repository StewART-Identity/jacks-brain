import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * SidebarToggle — collapsible-sidebar toggle button.
 *
 * Renders two buttons:
 *   1. `.jb-sidebar-toggle.in-sidebar` — lives at the top-right of
 *      the left sidebar. Click to COLLAPSE the sidebar.
 *   2. `.jb-sidebar-toggle.floating` — fixed-position button at the
 *      top-left of the viewport, visible only when the sidebar is
 *      already collapsed. Click to EXPAND the sidebar.
 *
 * The toggle communicates state by setting / removing the
 * `jb-sidebar-collapsed` class on the document root element
 * (document.documentElement, the <html> tag). CSS rules in
 * custom.scss watch for that class and reshape the layout
 * accordingly:
 *   - With the class:   sidebar hidden, content area gets full width,
 *                       floating expand button visible.
 *   - Without:          sidebar visible at its normal 320px width,
 *                       floating button hidden.
 *
 * State persists in localStorage under the key `jb-sidebar-collapsed`
 * (string "true" when collapsed; absent otherwise). The persisted
 * state is applied BEFORE first paint via a tiny inline script
 * injected into the head — see addGlobalPageResources or the Head
 * component for that injection. Applying the class to
 * document.documentElement (the <html> tag) is what makes pre-paint
 * application possible: document.body doesn't exist when head
 * scripts execute, but documentElement does.
 *
 * Mobile: the sidebar is already off-screen on viewports below 800px
 * (the existing Quartz mobile layout uses a hamburger pattern), so
 * these toggle buttons are hidden via media query on mobile.
 *
 * The pattern mirrors the Claude.ai web app's left-sidebar collapse,
 * because the Claude.ai design works well and Jack uses it daily.
 */
const SidebarToggle: QuartzComponent = (_props: QuartzComponentProps) => {
  return (
    <>
      {/* In-sidebar collapse button — shown when sidebar is expanded. */}
      <button
        type="button"
        class="jb-sidebar-toggle in-sidebar"
        id="jb-sidebar-collapse-btn"
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        <span aria-hidden="true">‹</span>
      </button>
      {/* Floating expand button — shown when sidebar is collapsed.
          Rendered always but hidden via CSS in the expanded state. */}
      <button
        type="button"
        class="jb-sidebar-toggle floating"
        id="jb-sidebar-expand-btn"
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <span aria-hidden="true">›</span>
      </button>
    </>
  )
}

SidebarToggle.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const collapseBtn = document.getElementById("jb-sidebar-collapse-btn")
  const expandBtn = document.getElementById("jb-sidebar-expand-btn")
  if (!collapseBtn || !expandBtn) return

  const STORAGE_KEY = "jb-sidebar-collapsed"

  function isCollapsed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true"
    } catch (e) {
      return false
    }
  }

  function setCollapsed(collapsed) {
    try {
      if (collapsed) {
        localStorage.setItem(STORAGE_KEY, "true")
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      // localStorage can throw (private mode, quota); ignore — the
      // class on the html element still reflects the current-session
      // state.
    }
    if (collapsed) {
      document.documentElement.classList.add("jb-sidebar-collapsed")
    } else {
      document.documentElement.classList.remove("jb-sidebar-collapsed")
    }
  }

  // Apply current state on mount. The pre-paint script in the
  // <head> may have already done this, but reapply on SPA nav to
  // ensure consistency.
  setCollapsed(isCollapsed())

  function onCollapseClick() {
    setCollapsed(true)
  }
  function onExpandClick() {
    setCollapsed(false)
  }

  collapseBtn.addEventListener("click", onCollapseClick)
  expandBtn.addEventListener("click", onExpandClick)
  window.addCleanup(() => {
    collapseBtn.removeEventListener("click", onCollapseClick)
    expandBtn.removeEventListener("click", onExpandClick)
  })
})
`

// CSS lives in custom.scss because the rules need to interact with
// the grid layout in base.scss and the .sidebar styling already
// established elsewhere. Putting the collapse-state CSS here as
// component-scoped strings would be the wrong layering — it's a
// site-wide layout concern, not a component-internal one.

export default (() => SidebarToggle) satisfies QuartzComponentConstructor
