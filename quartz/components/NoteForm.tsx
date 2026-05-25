import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/noteForm.inline"
import styles from "./styles/notes.scss"

/**
 * Capture-only form for /notes/write.
 *
 * Visually mirrors the Search card (.search-page-card): rounded card,
 * semi-transparent dark fill, "New note" label, full-width inputs and
 * textarea, controls row with the Save button on the right. Sits at
 * the same 720px max-width as Search/Wiki and Search/Web.
 *
 * The DOM ids (note-title, note-tags, note-body, etc.) match the
 * original Notes component so the markdown-preview and tab-toggle
 * logic in the inline script ports over unchanged. The wrapping
 * element id (#note-form-app) scopes the inline script to this page
 * only.
 */
const NoteForm: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="note-form-app">
      <div class="search-page-card">
        <h3 class="search-page-label">New note</h3>

        <input
          type="text"
          id="note-title"
          class="notes-text-input"
          placeholder="Title"
          aria-label="Note title"
        />

        <input
          type="text"
          id="note-tags"
          class="notes-text-input notes-tags-input"
          placeholder="Tags (comma-separated, optional)"
          aria-label="Note tags"
        />

        {/* Tab toggle: Edit vs Preview. role/aria attributes follow
            the ARIA tabs pattern so keyboard nav works. */}
        <div class="notes-tabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            class="notes-tab active"
            id="notes-tab-edit"
            role="tab"
            aria-selected="true"
            aria-controls="notes-pane-edit"
          >
            Edit
          </button>
          <button
            type="button"
            class="notes-tab"
            id="notes-tab-preview"
            role="tab"
            aria-selected="false"
            aria-controls="notes-pane-preview"
          >
            Preview
          </button>
        </div>

        <div
          class="notes-pane notes-pane-edit"
          id="notes-pane-edit"
          role="tabpanel"
          aria-labelledby="notes-tab-edit"
        >
          <textarea
            id="note-body"
            class="notes-textarea"
            rows={10}
            placeholder="What's on your mind?  Supports markdown: **bold**, *italic*, `code`, lists, [[wikilinks]], #tags."
            aria-label="Note body"
          ></textarea>
        </div>

        <div
          class="notes-pane notes-pane-preview"
          id="notes-pane-preview"
          role="tabpanel"
          aria-labelledby="notes-tab-preview"
          hidden
        >
          <div
            class="notes-preview"
            id="note-preview"
            aria-live="polite"
            aria-atomic="false"
          >
            <p class="muted">Switch to Preview after typing to see how the markdown will render.</p>
          </div>
        </div>

        <div class="notes-controls">
          <button type="button" id="note-save-btn" class="jb-btn">
            Save note
          </button>
        </div>

        <div id="note-save-status" class="notes-status" style="display:none"></div>
      </div>
    </div>
  )
}

NoteForm.afterDOMLoaded = script
NoteForm.css = styles

export default (() => NoteForm) satisfies QuartzComponentConstructor
