import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const RetentionList: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="retention-list-app">
      <div class="recent-runs">
        <div class="recent-runs-header">
          <h3>Retention Log</h3>
          <div class="recent-runs-actions">
            <button id="refresh-retention-btn" class="runs-action-btn" title="Refresh">
              &#8635;
            </button>
          </div>
        </div>
        <div id="retention-list">
          <p class="muted">Loading...</p>
        </div>
      </div>
    </div>
  )
}

RetentionList.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const container = document.getElementById("retention-list")
  if (!container) return
  const refreshBtn = document.getElementById("refresh-retention-btn")

  let allRows = []
  let sortField = "date"
  let sortAsc = false

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  function arrow(field) {
    if (sortField !== field) return ""
    return sortAsc ? " \\u25B2" : " \\u25BC"
  }

  // Normalize a retention action ("Cataloged", "Re-viewed", ...) into a
  // run-badge variant class. Mirrors the lowercase/underscore mapping the
  // shared .run-badge.{state} rules in custom.scss expect, so "Re-viewed"
  // -> "re_viewed" lands on the brass variant and "Cataloged" -> "cataloged"
  // on the green one. Unmapped actions fall through to the neutral base pill.
  function statusClass(action) {
    return String(action == null ? "" : action)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  }

  function renderTable() {
    if (allRows.length === 0) {
      container.innerHTML = '<p class="muted">No documents retained yet.</p>'
      return
    }

    const sorted = [...allRows].sort(function(a, b) {
      let valA, valB
      if (sortField === "filename") {
        valA = (a.filename || "").toLowerCase()
        valB = (b.filename || "").toLowerCase()
      } else if (sortField === "title") {
        valA = (a.title || "").toLowerCase()
        valB = (b.title || "").toLowerCase()
      } else if (sortField === "action") {
        valA = (a.action || "").toLowerCase()
        valB = (b.action || "").toLowerCase()
      } else {
        valA = a.date || ""
        valB = b.date || ""
      }
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    container.innerHTML = '<div class="table-container jb-table"><table>' +
      '<thead><tr>' +
      '<th class="col-date sortable" data-sort="date">Acquired' + arrow("date") + '</th>' +
      '<th class="col-status sortable" data-sort="action">Status' + arrow("action") + '</th>' +
      '<th class="sortable" data-sort="filename">Source' + arrow("filename") + '</th>' +
      '<th class="sortable" data-sort="title">Title' + arrow("title") + '</th>' +
      '</tr></thead>' +
      '<tbody>' +
      sorted.map(function(r) {
        const titleCell = r.sourcePresent
          ? '<span class="title-edit" data-slug="' + escapeHtml(r.slug) + '" data-original="' + escapeHtml(r.title) + '" tabindex="0" role="button" aria-label="Edit title">' + escapeHtml(r.title || "(untitled)") + '</span>'
          : '<span class="title-missing" title="Source page no longer exists \\u2014 read-only">\\u2014</span>'
        return '<tr>' +
          '<td class="col-date">' + escapeHtml(r.date) + '</td>' +
          '<td class="col-status"><span class="run-badge ' + statusClass(r.action) + '">' + escapeHtml(r.action) + '</span></td>' +
          '<td><code>' + escapeHtml(r.filename) + '</code></td>' +
          '<td>' + titleCell + '</td>' +
          '</tr>'
      }).join("") +
      '</tbody></table></div>'

    container.querySelectorAll("th.sortable").forEach(function(th) {
      th.addEventListener("click", function() {
        const field = th.getAttribute("data-sort")
        if (sortField === field) {
          sortAsc = !sortAsc
        } else {
          sortField = field
          sortAsc = field !== "date"
        }
        renderTable()
      })
    })

    container.querySelectorAll(".title-edit").forEach(function(span) {
      span.addEventListener("click", function() { startEdit(span) })
      span.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          startEdit(span)
        }
      })
    })
  }

  function startEdit(span) {
    if (span.classList.contains("editing") || span.classList.contains("saving")) return
    const original = span.dataset.original || ""
    span.classList.add("editing")
    span.contentEditable = "true"
    span.textContent = original
    span.focus()
    const range = document.createRange()
    range.selectNodeContents(span)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)

    let cancelled = false

    function finish(commit) {
      if (span.classList.contains("saving")) return
      span.contentEditable = "false"
      span.classList.remove("editing")
      const newTitle = span.textContent.trim()
      if (!commit || cancelled || newTitle === original || newTitle === "") {
        span.textContent = original
        return
      }
      saveTitle(span, original, newTitle)
    }

    function onKeydown(e) {
      if (e.key === "Enter") {
        e.preventDefault()
        span.blur()
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelled = true
        span.blur()
      }
    }

    span.addEventListener("blur", function onBlur() {
      span.removeEventListener("blur", onBlur)
      span.removeEventListener("keydown", onKeydown)
      finish(true)
    })
    span.addEventListener("keydown", onKeydown)
  }

  async function saveTitle(span, original, newTitle) {
    span.classList.add("saving")
    span.textContent = newTitle
    try {
      const response = await fetch("/api/source", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: span.dataset.slug, title: newTitle }),
      })
      if (!response.ok) {
        const err = await response.json().catch(function() { return {} })
        throw new Error(err.error || ("HTTP " + response.status))
      }
      span.dataset.original = newTitle
      span.classList.remove("saving")
      span.classList.add("saved")
      setTimeout(function() { span.classList.remove("saved") }, 1200)
      const slug = span.dataset.slug
      allRows.forEach(function(r) { if (r.slug === slug) r.title = newTitle })
    } catch (e) {
      span.classList.remove("saving")
      span.classList.add("error")
      span.textContent = original
      span.dataset.original = original
      const msg = (e && e.message) || "Save failed"
      span.title = msg
      setTimeout(function() {
        span.classList.remove("error")
        span.title = ""
      }, 2500)
    }
  }

  async function loadRetention() {
    container.innerHTML = '<p class="muted">Loading...</p>'
    try {
      const response = await fetch("/api/retention")
      if (!response.ok) throw new Error("HTTP " + response.status)
      const data = await response.json()
      allRows = data.rows || []
      renderTable()
    } catch (e) {
      container.innerHTML = '<p class="muted">Could not load retention log.</p>'
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadRetention)
  }

  // Remove the refresh-button click handler before the next SPA navigation.
  // Without this, every visit to /collect/retention stacks another listener on
  // the same button, so a single click later fires loadRetention() multiple
  // times. This is the canonical Quartz pattern -- see e.g.
  // checkbox.inline.ts and acquisition.inline.ts. The per-row listeners
  // attached inside renderTable() don't need cleanup -- renderTable() wipes
  // container.innerHTML on every call, which detaches the elements those
  // listeners were on, so they're garbage-collected naturally.
  if (typeof window !== "undefined" && window.addCleanup) {
    window.addCleanup(function() {
      if (refreshBtn) {
        refreshBtn.removeEventListener("click", loadRetention)
      }
    })
  }

  loadRetention()
})
`

RetentionList.css = `
#retention-list-app {
  max-width: 720px;
  padding-bottom: 2rem;
}

/* Retention table: column widths and inline-edit interaction states.
   The unified table look (header band, alternating rows, cell borders,
   flush-left, centered headers, centered date cells, centered status
   cells) comes from quartz/styles/_jbtable.scss via the .jb-table
   class on the wrapping <div>. */

/* Acquired — fits "2026-04-23" plus padding. Selector anchored on
   .col-date (instead of nth-child(1)) so this column's styling stays
   attached to its semantics, not its position. */
#retention-list-app thead th.col-date,
#retention-list-app tbody td.col-date {
  width: 7rem;
  white-space: nowrap;
}
/* Status — fits "Re-viewed". Anchored on .col-status (matching the
   global centering rule from _jbtable.scss) rather than nth-child(2). */
#retention-list-app thead th.col-status,
#retention-list-app tbody td.col-status {
  width: 6.5rem;
  white-space: nowrap;
}
/* Source — fixed width so Title can grow */
#retention-list-app thead th:nth-child(3),
#retention-list-app tbody td:nth-child(3) {
  width: 13rem;
}
#retention-list-app tbody td:nth-child(3) code {
  font-size: 0.85em;
  overflow-wrap: anywhere;
  background: transparent;
  padding: 0;
  color: var(--gray);
}
/* Title — takes whatever's left */
#retention-list-app thead th:nth-child(4),
#retention-list-app tbody td:nth-child(4) {
  width: auto;
  overflow-wrap: anywhere;
}

#retention-list-app th.sortable {
  cursor: pointer;
  user-select: none;
}
#retention-list-app th.sortable:hover {
  color: var(--secondary);
}

.title-edit {
  display: inline-block;
  min-width: 4rem;
  padding: 1px 6px;
  margin: -1px -6px;
  border-radius: 4px;
  cursor: text;
  outline: none;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.title-edit:hover {
  background: var(--lightgray);
}
.title-edit:focus,
.title-edit.editing {
  background: var(--light);
  box-shadow: 0 0 0 2px var(--secondary);
  cursor: text;
}
.title-edit.saving {
  opacity: 0.55;
  cursor: wait;
}
.title-edit.saved {
  background: var(--lightgray);
  box-shadow: 0 0 0 2px #4ade80;
}
.title-edit.error {
  background: var(--lightgray);
  box-shadow: 0 0 0 2px #f87171;
}
.title-missing {
  color: var(--gray);
  font-style: italic;
  cursor: not-allowed;
}

#retention-list-app .muted {
  color: var(--gray);
  font-style: italic;
}
`

export default (() => RetentionList) satisfies QuartzComponentConstructor
