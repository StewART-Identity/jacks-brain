import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/upskillUpdate.inline"
import styles from "./styles/upskill.scss"

/**
 * Topic-update UI for /upskill/update.
 *
 * Renders the list of existing Upskill topics with inline Edit /
 * Hide / Delete buttons per row. Editing uses prompt-based inputs
 * (deliberately minimal — topics have a small fixed shape so a
 * modal would be heavier than the value it adds). Hide toggles the
 * `hidden` flag in data/upskill/<slug>/meta.json; Delete removes
 * the meta.json and the content/upskill/<slug>/index.md.
 *
 * Companion add page lives at /upskill/add (component: UpskillAdd).
 * The split mirrors the Notes/Journal Add+Update pattern.
 *
 * Reuses notes.scss vocabulary for visual consistency. DOM ids are
 * prefixed `upskill-` and the wrapper id is #upskill-update-app —
 * the layout's ConditionalRender mounts the script on slug match.
 */
const UpskillUpdate: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="upskill-update-app">
      <div class="search-page-card">
        <h3 class="search-page-label">Topics</h3>

        <div
          id="upskill-list"
          class="upskill-list"
          aria-live="polite"
          aria-busy="true"
        >
          <p class="muted">Loading topics…</p>
        </div>

        <div id="upskill-list-status" class="notes-status" style="display:none"></div>
      </div>
    </div>
  )
}

UpskillUpdate.afterDOMLoaded = script
UpskillUpdate.css = styles

export default (() => UpskillUpdate) satisfies QuartzComponentConstructor
