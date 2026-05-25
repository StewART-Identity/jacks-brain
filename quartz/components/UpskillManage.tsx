import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/upskillManage.inline"
import styles from "./styles/upskill.scss"

/**
 * Topic-management UI for /upskill/manage.
 *
 * Two sections, top to bottom:
 *
 *   1. New topic card — same visual shape as NoteForm. Inputs for
 *      Title, Slug, Order, Summary. Slug auto-derives from Title
 *      while you type; you can override it. The form posts to
 *      POST /api/upskill/topics.
 *
 *   2. Existing topics list — table-style block showing every topic
 *      currently in data/upskill/. Each row has inline Edit and
 *      Delete buttons (and a Hide / Unhide toggle for the sidebar-
 *      visibility flag). Edits go to PUT /api/upskill/topics/<slug>;
 *      deletes go to DELETE /api/upskill/topics/<slug>.
 *
 * Reuses notes.scss for visual consistency with the rest of the
 * capture-style pages (Notes, Journal). DOM ids are prefixed
 * `upskill-` so the inline script can scope cleanly. The outer
 * wrapper id is #upskill-manage-app — the layout's ConditionalRender
 * uses this slug to decide whether to mount the script.
 */
const UpskillManage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="upskill-manage-app">
      {/* ───── New topic card ───────────────────────────────── */}
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
          <button type="button" id="upskill-create-btn" class="search-page-btn">
            Create topic
          </button>
        </div>

        <div id="upskill-create-status" class="notes-status" style="display:none"></div>
      </div>

      {/* ───── Existing topics ───────────────────────────────── */}
      <div class="search-page-card" style="margin-top: 1.5rem;">
        <h3 class="search-page-label">Existing topics</h3>

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

UpskillManage.afterDOMLoaded = script
UpskillManage.css = styles

export default (() => UpskillManage) satisfies QuartzComponentConstructor
