import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/notesList.inline"
import styles from "./styles/notes.scss"

/**
 * List-and-edit component for /notes/browse.
 *
 * Split half of the original Notes component — this is the side that
 * lists existing notes and lets the user edit or delete them inline.
 *
 * Renders an empty container plus the shared delete modal. The inline
 * script populates the list at runtime (GET /api/notes) and handles
 * all the per-card expand/collapse/edit/save/delete state machine.
 */
const NotesList: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="notes-list-app">
      <div class="catalog-card">
        <h3 class="section-label">All notes</h3>
        <div id="notes-list" class="notes-list">
          <p class="muted notes-empty-state">Loading notes…</p>
        </div>
      </div>

      {/* Delete confirmation modal, shared across all rows. */}
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

NotesList.afterDOMLoaded = script
NotesList.css = styles

export default (() => NotesList) satisfies QuartzComponentConstructor
