import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/upskillAdd.inline"
import styles from "./styles/upskill.scss"

/**
 * Topic-add UI for /upskill/add.
 *
 * Single-purpose form for creating a new Upskill topic. Inputs for
 * Title, Slug, Order, and Summary. The slug auto-derives from the
 * title while you type — kebab-case, lowercase, leading-letter
 * requirement matching the server-side validator — but is
 * overridable. The form posts to POST /api/upskill/topics.
 *
 * Companion list/edit page lives at /upskill/update (component:
 * UpskillUpdate). The split into two pages matches the Add/Update
 * pattern Notes and Journal use; the previous /upskill/manage
 * combined both on a single screen.
 *
 * Reuses notes.scss vocabulary for visual consistency with the
 * other capture-style pages. DOM ids are prefixed `upskill-` and
 * the wrapper id is #upskill-add-app — the layout's
 * ConditionalRender uses the slug to decide whether to mount the
 * script.
 */
const UpskillAdd: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="upskill-add-app">
      <div class="search-page-card">
        <h3 class="search-page-label">New topic</h3>

        <input
          type="text"
          id="upskill-title"
          class="notes-text-input"
          placeholder="Title (e.g. TypeScript)"
          aria-label="Topic title"
        />

        <input
          type="text"
          id="upskill-slug"
          class="notes-text-input"
          placeholder="Slug (auto-filled from title — override if you like)"
          aria-label="Topic slug"
          spellcheck={false}
        />

        <input
          type="number"
          id="upskill-order"
          class="notes-text-input"
          placeholder="Order (lower numbers come first; e.g. 10)"
          aria-label="Sort order"
          step={1}
        />

        <textarea
          id="upskill-summary"
          class="notes-textarea"
          rows={3}
          placeholder="Summary — one sentence describing what this topic covers."
          aria-label="Topic summary"
        ></textarea>

        <div class="notes-controls">
          <button type="button" id="upskill-create-btn" class="jb-btn">
            Create topic
          </button>
        </div>

        <div id="upskill-create-status" class="notes-status" style="display:none"></div>
      </div>
    </div>
  )
}

UpskillAdd.afterDOMLoaded = script
UpskillAdd.css = styles

export default (() => UpskillAdd) satisfies QuartzComponentConstructor
