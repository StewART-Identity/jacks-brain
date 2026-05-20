import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/notes.inline"
import styles from "./styles/notes.scss"

const Notes: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="notes-app">
      {/* ───── Capture card ─────────────────────────────────────────── */}
      <div class="catalog-card">
        <h3 class="section-label" id="notes-capture-heading">
          New note
        </h3>

        <input
          type="text"
          id="note-title"
          class="paste-title-input"
          placeholder="Title"
          aria-label="Note title"
        />

        <input
          type="text"
          id="note-tags"
          class="paste-title-input notes-tags-input"
          placeholder="Tags (comma-separated, optional)"
          aria-label="Note tags"
        />

        {/* Tab toggle: Edit vs Preview. role/aria attributes follow the
            ARIA tabs pattern so keyboard nav works. */}
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

        <div class="paste-row">
          <button type="button" id="note-save-btn" class="notes-primary-btn">
            Save note
          </button>
        </div>

        <div id="note-save-status" class="card-status" style="display:none"></div>
      </div>

      {/* ───── Recent notes card ────────────────────────────────────── */}
      <div class="catalog-card notes-recent-section">
        <h3 class="section-label">Recent notes</h3>
        <div id="notes-list" class="notes-list">
          <p class="muted notes-empty-state">Loading recent notes…</p>
        </div>
      </div>

      {/* ───── Delete confirmation modal (hidden by default) ───────── */}
      <div
        class="notes-modal-backdrop"
        id="notes-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-delete-modal-title"
        aria-describedby="notes-delete-modal-body"
        hidden
      >
        <div class="notes-modal">
          <h3 id="notes-delete-modal-title">Delete this note?</h3>
          <p id="notes-delete-modal-body" class="notes-modal-body">
            <span id="notes-delete-modal-target"></span>
            This can't be undone from the form, though the commit history will preserve the
            content.
          </p>
          <div class="notes-modal-actions">
            <button type="button" id="notes-delete-cancel" class="notes-secondary-btn">
              Cancel
            </button>
            <button type="button" id="notes-delete-confirm" class="notes-danger-btn">
              Delete note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

Notes.afterDOMLoaded = script
Notes.css = styles

export default (() => Notes) satisfies QuartzComponentConstructor
