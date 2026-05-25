import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * SidebarExpand — floating EXPAND button.
 *
 * The companion to SidebarToggle. Renders a fixed-position button
 * at the top-left of the viewport, visible only when the sidebar
 * has been collapsed (html.jb-sidebar-collapsed is set). Click to
 * re-expand the sidebar.
 *
 * This component MUST be registered outside the sidebar in the
 * layout config (i.e. in afterBody, not in left or right) — see
 * the commit history of SidebarToggle for why. Briefly: putting
 * the expand button inside the sidebar made it unreachable once
 * the sidebar was collapsed via display:none.
 *
 * Uses the same panel-icon SVG as the collapse button, with the
 * vertical line on the right side rather than the left to suggest
 * "bring the panel back from the left."
 *
 * Hidden by default (CSS in custom.scss). Made visible only when
 * the html.jb-sidebar-collapsed class is present.
 *
 * Persistence: sessionStorage (not localStorage). Clearing the
 * key on expand mirrors the set-on-collapse in SidebarToggle.tsx.
 * Both must agree on which storage they're using; see the comment
 * in SidebarToggle.tsx for the rationale.
 *
 * Mobile: hidden entirely via media query, same as the collapse
 * button. Mobile keeps the existing hamburger pattern.
 */
const SidebarExpand: QuartzComponent = (_props: QuartzComponentProps) => {
  return (
    <button
      type="button"
      class="jb-sidebar-toggle floating"
      id="jb-sidebar-expand-btn"
      aria-label="Expand sidebar"
      title="Expand sidebar"
    >
      {/* Panel icon: rectangle with a vertical line on the right
          side, marking where the sidebar's right edge would be when
          expanded. Slight visual cue that clicking will "bring the
          panel out from the side." */}
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
        <line x1="15" y1="4" x2="15" y2="20" />
      </svg>
    </button>
  )
}

SidebarExpand.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const btn = document.getElementById("jb-sidebar-expand-btn")
  if (!btn) return

  function onClick() {
    try {
      sessionStorage.removeItem("jb-sidebar-collapsed")
    } catch (e) {
      // sessionStorage can throw; ignore. The class change below
      // still happens.
    }
    document.documentElement.classList.remove("jb-sidebar-collapsed")
  }

  btn.addEventListener("click", onClick)
  window.addCleanup(() => btn.removeEventListener("click", onClick))
})
`

export default (() => SidebarExpand) satisfies QuartzComponentConstructor
