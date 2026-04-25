import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"

const ApplicationMenu: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  return (
    <div class={classNames(displayClass, "sidebar-nav")}>
      <h2 class="sidebar-nav-heading">Application</h2>
      <ul class="sidebar-nav-list">
        <li>
          <a href={resolveRelative(fileData.slug!, "application/help" as any)}>Help</a>
        </li>
        <li>
          <a href={resolveRelative(fileData.slug!, "application/nuke" as any)}>Nuke It From Orbit</a>
        </li>
      </ul>
    </div>
  )
}

ApplicationMenu.beforeDOMLoaded = darkmodeScript


export default (() => ApplicationMenu) satisfies QuartzComponentConstructor
