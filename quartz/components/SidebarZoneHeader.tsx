import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface Options {
  label: string
  /**
   * If true, no top margin — used for the very first zone in the
   * sidebar so it sits flush under the PageTitle. Subsequent zones
   * get the default top margin that separates them visually from
   * the section above.
   */
  first?: boolean
}

/**
 * Non-clickable zone label for the sidebar.
 *
 * Renders as a small uppercase header that groups related
 * SidebarLink sections under a single banner — e.g. "DOING" sitting
 * above Search / Notes / Journal / Collect.
 *
 * The zone label itself is not a link or a click target; it's pure
 * organizational scaffolding. The user navigates by clicking the
 * section heading underneath ("Notes", "Journal", etc.) or by
 * expanding the section via its chevron.
 */
export default ((opts: Options) => {
  const SidebarZoneHeader: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    return (
      <div
        class={classNames(displayClass, "sidebar-zone-header")}
        data-zone-first={opts.first ? "true" : "false"}
      >
        {opts.label}
      </div>
    )
  }

  SidebarZoneHeader.css = `
.sidebar-zone-header {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gray);
  margin: 1.4rem 0 0.5rem 0;
  user-select: none;
}
.sidebar-zone-header[data-zone-first="true"] {
  margin-top: 0.6rem;
}
`

  return SidebarZoneHeader
}) satisfies QuartzComponentConstructor<Options>
