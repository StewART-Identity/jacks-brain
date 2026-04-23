import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/hamburger.inline"
import styles from "./styles/hamburger.scss"

/**
 * Hamburger
 *
 * Fixed-position button that appears only on mobile (screens below the
 * $mobile breakpoint, 800px). Tapping it reveals the left sidebar as an
 * overlay from the left edge of the viewport. Tapping outside the sidebar,
 * or tapping any link inside it, closes the overlay.
 *
 * The button renders in the top-left corner and shows a three-line icon
 * when closed, an X when open.
 *
 * Mechanics:
 *   - The button toggles a `menu-open` class on the body
 *   - CSS in hamburger.scss styles the sidebar as an overlay when the
 *     body has `menu-open`
 *   - hamburger.inline.ts handles tap-outside and tap-link closing
 *
 * Only visible on mobile. Desktop and tablet layouts already show the
 * full sidebar, so the button is display:none at those widths.
 */
const Hamburger: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <button
      id="hamburger-toggle"
      class={displayClass}
      aria-label="Toggle navigation menu"
      aria-expanded="false"
      aria-controls="quartz-body"
    >
      <span class="hamburger-line" aria-hidden="true"></span>
      <span class="hamburger-line" aria-hidden="true"></span>
      <span class="hamburger-line" aria-hidden="true"></span>
    </button>
  )
}

Hamburger.afterDOMLoaded = script
Hamburger.css = styles

export default (() => Hamburger) satisfies QuartzComponentConstructor
