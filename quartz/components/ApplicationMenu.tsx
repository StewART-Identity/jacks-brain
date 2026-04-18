import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"
// @ts-ignore
import readermodeScript from "./scripts/readermode.inline"

const ApplicationMenu: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  return (
    <div class={classNames(displayClass, "sidebar-nav")}>
      <button
        type="button"
        class="sidebar-nav-toggle collapsed"
        aria-expanded={false}
      >
        <h2>Application</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="5 8 14 8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="fold"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <ul class="sidebar-nav-list collapsed">
        <li>
          <a href="#" class="readermode app-toggle">Reading Mode</a>
        </li>
        <li>
          <a href="#" class="darkmode app-toggle">Light/Dark Mode</a>
        </li>
        <li>
          <a href={resolveRelative(fileData.slug!, "learn/nuke" as any)}>Nuke It from Orbit</a>
        </li>
      </ul>
    </div>
  )
}

ApplicationMenu.beforeDOMLoaded = darkmodeScript + "\n" + readermodeScript

ApplicationMenu.afterDOMLoaded = `
document.addEventListener("nav", () => {
  // Prevent app toggles from navigating
  for (const link of document.querySelectorAll(".app-toggle")) {
    link.addEventListener("click", (e) => {
      e.preventDefault()
    })
  }
})
`

export default (() => ApplicationMenu) satisfies QuartzComponentConstructor
