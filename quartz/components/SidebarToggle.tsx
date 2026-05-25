import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * SidebarToggle — in-sidebar COLLAPSE button only.
 *
 * Renders a single button at the top-right of the left sidebar.
 * Click to collapse the sidebar (sets the jb-sidebar-collapsed
 * class on <html> and persists to sessionStorage).
 *
 * The companion EXPAND button lives in a separate component
 * (SidebarExpand) registered in afterBody — outside the sidebar —
 * so that when the sidebar is hidden via `display: none`, the
 * expand button is still in the DOM and clickable. Putting both
 * buttons inside the sidebar made the expand button unreachable
 * once collapsed (display:none hides descendants regardless of
 * their position: fixed), which produced a "collapse works once,
 * then you can't recover" lockout bug.
 *
 * State is communicated via the `jb-sidebar-collapsed` class on
 * document.documentElement (the <html> tag). The class is applied
 * pre-paint by an inline script in Head.tsx so initial render
 * matches sessionStorage without a flash.
 *
 * Persistence: sessionStorage (not localStorage). The sidebar
 * resets to expanded when the user starts a new browser session
 * (close tab / new tab / new window), while still persisting
 * across SPA navigations and reloads within the same tab. If you
 * want to change this, swap sessionStorage for localStorage in
 * both this file and Head.tsx and SidebarExpand.tsx — all three
 * must agree.
 *
 * The button uses an inline SVG of a "panel" icon — a rectangle
 * with a vertical line at one edge marking the sidebar boundary.
 * Standard convention in modern app chrome and clearly readable
 * on dark backgrounds regardless of color settings.
 *
 * Mobile: hidden via media query on viewports below 800px (which
 * use the existing hamburger pattern instead).
 */
const SidebarToggle: QuartzComponent = (_props: QuartzComponentProps) => {
  return (
    <button
      type="button"
      class="jb-sidebar-toggle in-sidebar"
      id="jb-sidebar-collapse-btn"
      aria-label="Collapse sidebar"
      title="Collapse sidebar"
    >
      {/* Panel icon: rectangle with a vertical line marking the
          sidebar edge. The left-side vertical line maps to "hide
          the panel that's on the left." */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="9" y1="4" x2="9" y2="20" />
      </svg>
    </button>
  )
}

SidebarToggle.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const btn = document.getElementById("jb-sidebar-collapse-btn")
  if (!btn) return

  function onClick() {
    try {
      sessionStorage.setItem("jb-sidebar-collapsed", "true")
    } catch (e) {
      // sessionStorage can throw (private mode, quota); ignore — the
      // class change still happens and the in-session state is
      // correct, persistence just won't carry over.
    }
    document.documentElement.classList.add("jb-sidebar-collapsed")
  }

  btn.addEventListener("click", onClick)
  window.addCleanup(() => btn.removeEventListener("click", onClick))
})
`

export default (() => SidebarToggle) satisfies QuartzComponentConstructor
