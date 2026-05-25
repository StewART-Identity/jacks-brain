import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/journalForm.inline"
import styles from "./styles/notes.scss"

/**
 * Capture-only form for /journal/write.
 *
 * Visual twin of NoteForm — same card chrome, same Edit/Preview tabs,
 * same markdown preview. Differs only in: mount selector, DOM ids
 * (journal-* vs note-*), and the API endpoint (POST /api/journal vs
 * POST /api/notes). Copy is tuned for journal — "entry" rather than
 * "note", capture prompt that nudges toward internal reflection.
 *
 * Distinct DOM ids matter because the SPA may have both this page
 * and /notes/write in its lifetime cache; collision-free ids let the
 * two scripts coexist without stepping on each other.
 */
const JournalForm: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="journal-form-app">
      <div class="search-page-card">
        <h3 class="search-page-label">New journal entry</h3>

        <input
          type="text"
          id="journal-title"
          class="notes-text-input"
          placeholder="Title"
          aria-label="Journal entry title"
        />

        <input
          type="text"
          id="journal-tags"
          class="notes-text-input notes-tags-input"
          placeholder="Tags (comma-separated, optional)"
          aria-label="Journal entry tags"
        />

        <div class="notes-tabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            class="notes-tab active"
            id="journal-tab-edit"
            role="tab"
            aria-selected="true"
            aria-controls="journal-pane-edit"
          >
            Edit
          </button>
          <button
            type="button"
            class="notes-tab"
            id="journal-tab-preview"
            role="tab"
            aria-selected="false"
            aria-controls="journal-pane-preview"
          >
            Preview
          </button>
        </div>

        <div
          class="notes-pane notes-pane-edit"
          id="journal-pane-edit"
          role="tabpanel"
          aria-labelledby="journal-tab-edit"
        >
          <textarea
            id="journal-body"
            class="notes-textarea"
            rows={10}
            placeholder="What's going on inside? Supports markdown: **bold**, *italic*, `code`, lists, [[wikilinks]], #tags."
            aria-label="Journal entry body"
          ></textarea>
        </div>

        <div
          class="notes-pane notes-pane-preview"
          id="journal-pane-preview"
          role="tabpanel"
          aria-labelledby="journal-tab-preview"
          hidden
        >
          <div
            class="notes-preview"
            id="journal-preview"
            aria-live="polite"
            aria-atomic="false"
          >
            <p class="muted">Switch to Preview after typing to see how the markdown will render.</p>
          </div>
        </div>

        <div class="notes-controls">
          <button type="button" id="journal-save-btn" class="search-page-btn">
            Save entry
          </button>
        </div>

        <div id="journal-save-status" class="notes-status" style="display:none"></div>
      </div>
    </div>
  )
}

JournalForm.afterDOMLoaded = script
JournalForm.css = styles

export default (() => JournalForm) satisfies QuartzComponentConstructor
