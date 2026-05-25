import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/journalList.inline"
import styles from "./styles/notes.scss"

/**
 * List-and-edit component for /journal/browse.
 *
 * Visual twin of NotesList — same card chrome, same row layout, same
 * inline edit pattern, same delete modal. Differs only in: mount
 * selector, DOM ids (journal-* vs notes-*), API endpoint, and the
 * empty-state copy referring to /journal/write rather than /notes/write.
 */
const JournalList: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="journal-list-app">
      <div class="search-page-card">
        <h3 class="search-page-label">All entries</h3>
        <div id="journal-list" class="notes-list">
          <p class="muted notes-empty-state">Loading entries…</p>
        </div>
      </div>

      <div
        class="notes-modal-backdrop"
        id="journal-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-delete-modal-title"
        aria-describedby="journal-delete-modal-body"
        hidden
      >
        <div class="notes-modal">
          <h3 id="journal-delete-modal-title">Delete this journal entry?</h3>
          <p id="journal-delete-modal-body" class="notes-modal-body">
            <span id="journal-delete-modal-target"></span>
            This can't be undone from the form, though the commit history will preserve the
            content.
          </p>
          <div class="notes-modal-actions">
            <button type="button" id="journal-delete-cancel" class="notes-secondary-btn">
              Cancel
            </button>
            <button type="button" id="journal-delete-confirm" class="notes-danger-btn">
              Delete entry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

JournalList.afterDOMLoaded = script
JournalList.css = styles

export default (() => JournalList) satisfies QuartzComponentConstructor
