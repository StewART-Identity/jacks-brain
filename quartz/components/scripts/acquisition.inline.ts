// Acquisition page (/collect/acquisition) — interactive script.
//
// Renders a polling status table fed by /api/status, with a checkbox
// column for pending rows. Selected pending files can be removed from
// the queue via /api/queue/delete; a floating selection bar at the
// bottom of the page surfaces the action.
//
// Each row's Acquired cell shows the date on the first line and a
// state-appropriate relative-time string on the second line:
//   PENDING     → "waiting Nm"    (queue wait time, growing)
//   IN_PROGRESS → "processing Nm" (processing duration, growing)
//   CATALOGED   → "Nm ago"        (completion age, frozen)
//   FAILED      → "Nm ago"        (same as cataloged)
// The relative time is computed from acquiredAt (ISO timestamp from the
// most recent state-change commit) returned by /api/status.
//
// Column sorting:
//   Source, Acquired, and Status columns are clickable headers that
//   toggle ascending ↔ descending sort. Acquired column starts descending
//   (newest first); other columns start ascending. Active sort is shown
//   via filled triangles (▲▼) appended to the column header — same
//   convention as the Retention table (which set the precedent). Sort
//   state lives in module scope and survives polling re-renders; resets
//   to default order on SPA nav away.
//
//   Note: the internal sort-key identifier is "document" (matches the
//   underlying DocumentRow.document field). The visible column label
//   is "Source" — that's the user-facing vocabulary the rest of the
//   wiki uses for the filename of a thing being cataloged. Don't
//   rename the data-sort-col attribute or the SortColumn union type
//   without also touching the cycleSort/applySort branches.
//
// State:
//   selectedFilenames — in-memory Set<string>, lives for the current
//   navigation. Survives table re-renders by re-checking matching DOM
//   nodes after each rebuild, but resets to empty whenever the user
//   navigates away (Quartz SPA destroys the script frame).
//
//   sortColumn / sortDirection — current sort settings, applied during
//   render. null/null means "default order" (use /api/status order).
//   Note: the cycle is two-state (asc ↔ desc) once a column has been
//   clicked. The null/null state is only the initial state before any
//   click, and gets restored by the cleanup callback on SPA nav.
//
//   lastDocuments — most recent documents from /api/status. Cached so
//   header-click re-sorts don't require a network round-trip.
//
// Cleanup contract:
//   Every addEventListener registered here has a matching removal in a
//   window.addCleanup callback. The 10-second poll timer is cleared in
//   the same callback. Without this, repeated visits to the page stack
//   listeners (each click would fire N handlers after N visits) and
//   leak intervals.

interface DocumentRow {
  document: string
  filename: string
  location: "queue" | "in-flight" | "originals"
  acquired: string | null
  acquiredAt: string | null
  status: "pending" | "in_progress" | "cataloged" | "failed"
}

interface DeleteResult {
  filename: string
  success: boolean
  reason?: "already_promoted" | "invalid_filename" | "github_error"
  detail?: string
}

type SortColumn = "document" | "acquired" | "status" | null
type SortDirection = "asc" | "desc" | null

document.addEventListener("nav", () => {
  const runsList = document.getElementById("runs-list")
  if (!runsList) return

  let pollTimer: ReturnType<typeof setInterval> | null = null
  const selectedFilenames = new Set<string>()

  // Sort state. Lives across renders; resets on SPA nav (the cleanup
  // callback resets it explicitly so a re-mount starts fresh).
  let sortColumn: SortColumn = null
  let sortDirection: SortDirection = null

  // Cache of the most recent documents array, so column header clicks
  // can re-sort without a network round-trip.
  let lastDocuments: DocumentRow[] = []

  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  const selectionBar = document.getElementById("queue-selection-bar") as HTMLDivElement | null
  const selectionCountSpan = document.getElementById("queue-selection-count-num") as HTMLSpanElement | null
  const clearSelectionBtn = document.getElementById("queue-clear-selection-btn") as HTMLButtonElement | null
  const removeBtn = document.getElementById("queue-remove-btn") as HTMLButtonElement | null

  // ------------------------------------------------------------------
  // Relative-time formatting
  // ------------------------------------------------------------------

  // Format a duration in milliseconds as a short human-readable string.
  // Granularity is matched to operational scale: seconds under a minute,
  // minutes under an hour, hours under a day, days beyond. Always returns
  // something readable; never throws or returns null.
  function formatDuration(ms: number): string {
    if (ms < 0) ms = 0
    const sec = Math.floor(ms / 1000)
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m`
    const hr = Math.floor(min / 60)
    if (hr < 24) {
      const remMin = min % 60
      return remMin === 0 ? `${hr}h` : `${hr}h ${remMin}m`
    }
    const days = Math.floor(hr / 24)
    return `${days}d`
  }

  // Build the second line of the Acquired cell — the state-appropriate
  // phrasing of acquiredAt. Returns "" if no timestamp is available.
  function relativeTimeLine(doc: DocumentRow): string {
    if (!doc.acquiredAt) return ""
    const ts = Date.parse(doc.acquiredAt)
    if (Number.isNaN(ts)) return ""
    const elapsed = Date.now() - ts
    const dur = formatDuration(elapsed)
    switch (doc.status) {
      case "pending":     return `waiting ${dur}`
      case "in_progress": return `processing ${dur}`
      case "cataloged":
      case "failed":      return `${dur} ago`
      default:            return `${dur} ago`
    }
  }

  // ------------------------------------------------------------------
  // Sorting
  // ------------------------------------------------------------------

  // Lifecycle order for status sort. Lower value = earlier in lifecycle.
  // Cataloged and failed share an order rank because they're both
  // terminal states; tiebreak below falls to document name.
  const STATUS_RANK: Record<DocumentRow["status"], number> = {
    pending: 0,
    in_progress: 1,
    cataloged: 2,
    failed: 2,
  }

  // Apply the current sort settings to a documents array. Returns a new
  // array; doesn't mutate. When sortColumn/sortDirection are null, the
  // input order is preserved (which is the /api/status default order).
  function applySort(docs: DocumentRow[]): DocumentRow[] {
    if (sortColumn === null || sortDirection === null) {
      return docs.slice()
    }
    const sign = sortDirection === "asc" ? 1 : -1
    const sorted = docs.slice()
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case "document":
          cmp = a.document.localeCompare(b.document, undefined, { sensitivity: "base" })
          break
        case "acquired":
          // Prefer acquiredAt (ISO timestamp) when available, fall back
          // to acquired (date string). Empty/missing values sort last
          // regardless of direction so they don't drift to the top in
          // descending sort.
          const aKey = a.acquiredAt || a.acquired || ""
          const bKey = b.acquiredAt || b.acquired || ""
          if (!aKey && !bKey) cmp = 0
          else if (!aKey) return 1
          else if (!bKey) return -1
          else cmp = aKey.localeCompare(bKey)
          break
        case "status":
          cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status]
          // Tiebreak by document name so siblings within a status group
          // appear in a stable, useful order rather than whatever the
          // input array gave us.
          if (cmp === 0) {
            cmp = a.document.localeCompare(b.document, undefined, { sensitivity: "base" })
          }
          break
      }
      return cmp * sign
    })
    return sorted
  }

  // Cycle the sort state when a column header is clicked.
  // Same column: toggle direction (asc ↔ desc).
  // Different column: switch to the new column. Acquired starts desc
  // (newest first); other columns start asc.
  function cycleSort(col: SortColumn) {
    if (col === null) return
    if (sortColumn !== col) {
      sortColumn = col
      sortDirection = col === "acquired" ? "desc" : "asc"
    } else {
      sortDirection = sortDirection === "asc" ? "desc" : "asc"
    }
    // Re-render the table from cached docs without re-fetching.
    renderTable(lastDocuments)
  }

  // Build the arrow indicator for a column header. Uses filled triangles
  // (▲▼) — same convention as the Retention table. No glyph on inactive
  // columns: cleaner than a faint placeholder, and the click target is
  // still discoverable via cursor-pointer styling on hover.
  function sortIndicator(col: SortColumn): string {
    if (sortColumn !== col || sortDirection === null) {
      return ""
    }
    const arrow = sortDirection === "asc" ? "\u25B2" : "\u25BC"
    return ` <span class="queue-sort-arrow" aria-hidden="true">${arrow}</span>`
  }

  // ------------------------------------------------------------------
  // Selection state — UI helpers
  // ------------------------------------------------------------------

  function updateSelectionBar() {
    const count = selectedFilenames.size
    if (selectionCountSpan) {
      selectionCountSpan.textContent = String(count)
    }
    if (selectionBar) {
      if (count > 0) {
        selectionBar.removeAttribute("hidden")
      } else {
        selectionBar.setAttribute("hidden", "")
      }
    }
  }

  function clearSelection() {
    selectedFilenames.clear()
    // Uncheck any checkboxes currently in the DOM. The set is the
    // source of truth, but we want the DOM to reflect it.
    const boxes = document.querySelectorAll(
      "input.queue-row-checkbox",
    ) as NodeListOf<HTMLInputElement>
    boxes.forEach(b => {
      b.checked = false
    })
    updateSelectionBar()
  }

  // ------------------------------------------------------------------
  // Table rendering
  // ------------------------------------------------------------------

  // Build one <tr> for a document row. Pending rows include a checkbox
  // in the first column; other rows have an empty cell so columns line
  // up. Filename goes on the checkbox via data-filename — the row's
  // visible "document" string is for display only and doesn't always
  // match the underlying file path (status.ts strips date prefixes
  // and matches against source-page slugs).
  //
  // The Acquired cell carries both `queue-acquired-cell` (queue-specific
  // two-line layout) and `col-date` (global centering rule from
  // _jbtable.scss). The two-line block-level children inherit the
  // centered text-align from the td so both lines center as a unit.
  //
  // The Status cell carries `col-status` so the badge centers under
  // the same global rule. The inline-block run-badge inside the td
  // centers naturally within the centered td.
  function rowHTML(doc: DocumentRow): string {
    const checkboxCell = doc.status === "pending"
      ? `<td class="queue-checkbox-cell">
           <input
             type="checkbox"
             class="queue-row-checkbox"
             data-filename="${escapeAttr(doc.filename)}"
             aria-label="Select for removal" />
         </td>`
      : `<td class="queue-checkbox-cell"></td>`
    const dateText = escapeText(doc.acquired || "Unknown")
    const relText = escapeText(relativeTimeLine(doc))
    const acquiredCell = relText
      ? `<td class="col-date queue-acquired-cell">
           <div class="queue-acquired-date">${dateText}</div>
           <div class="queue-acquired-relative">${relText}</div>
         </td>`
      : `<td class="col-date queue-acquired-cell">
           <div class="queue-acquired-date">${dateText}</div>
         </td>`
    return `<tr>
      ${checkboxCell}
      <td>${escapeText(doc.document)}</td>
      ${acquiredCell}
      <td class="col-status"><span class="run-badge ${doc.status}">${doc.status}</span></td>
    </tr>`
  }

  function escapeText(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  }
  function escapeAttr(s: string): string {
    return escapeText(s).replace(/"/g, "&quot;")
  }

  function renderTable(documents: DocumentRow[]) {
    if (!runsList) return
    if (documents.length === 0) {
      runsList.innerHTML = '<p class="muted">No acquisitions yet.</p>'
      return
    }

    const sortedDocs = applySort(documents)

    runsList.innerHTML =
      `<div class="table-container jb-table"><table>
        <thead><tr>
          <th class="queue-checkbox-cell" aria-label="Select"></th>
          <th class="sortable" data-sort-col="document" tabindex="0" role="button" aria-label="Sort by source">Source${sortIndicator("document")}</th>
          <th class="col-date sortable" data-sort-col="acquired" tabindex="0" role="button" aria-label="Sort by acquired date">Acquired${sortIndicator("acquired")}</th>
          <th class="col-status sortable" data-sort-col="status" tabindex="0" role="button" aria-label="Sort by status">Status${sortIndicator("status")}</th>
        </tr></thead>
        <tbody>` +
      sortedDocs.map(rowHTML).join("") +
      `</tbody></table></div>`

    // After the rebuild, re-check any boxes whose filenames are still
    // selected, and wire up change listeners. The previous DOM nodes
    // (and their listeners) are gone with the innerHTML replacement.
    const boxes = runsList.querySelectorAll(
      "input.queue-row-checkbox",
    ) as NodeListOf<HTMLInputElement>
    boxes.forEach(box => {
      const fn = box.dataset.filename || ""
      if (fn && selectedFilenames.has(fn)) {
        box.checked = true
      }
      box.addEventListener("change", onCheckboxChange)
    })

    // Wire up sort handlers on the column headers. Same as the row
    // checkboxes — these get GC'd when innerHTML is next replaced.
    const sortableHeaders = runsList.querySelectorAll(
      "th.sortable",
    ) as NodeListOf<HTMLTableCellElement>
    sortableHeaders.forEach(th => {
      th.addEventListener("click", onSortHeaderClick)
      th.addEventListener("keydown", onSortHeaderKeydown)
    })

    // Drop any selections whose filenames are no longer pending. (E.g.
    // a selected file was promoted to in-flight between polls.)
    const stillPending = new Set<string>()
    documents.forEach(d => {
      if (d.status === "pending") stillPending.add(d.filename)
    })
    for (const fn of selectedFilenames) {
      if (!stillPending.has(fn)) {
        selectedFilenames.delete(fn)
      }
    }
    updateSelectionBar()
  }

  function onCheckboxChange(e: Event) {
    const box = e.target as HTMLInputElement
    const fn = box.dataset.filename || ""
    if (!fn) return
    if (box.checked) {
      selectedFilenames.add(fn)
    } else {
      selectedFilenames.delete(fn)
    }
    updateSelectionBar()
  }

  function onSortHeaderClick(e: Event) {
    const th = e.currentTarget as HTMLTableCellElement
    const col = th.dataset.sortCol as SortColumn
    cycleSort(col)
  }

  // Keyboard support: Enter and Space activate the sort header. The
  // tabindex="0" + role="button" attributes make the headers focusable
  // and announce them to screen readers as buttons.
  function onSortHeaderKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const th = e.currentTarget as HTMLTableCellElement
      const col = th.dataset.sortCol as SortColumn
      cycleSort(col)
    }
  }

  // ------------------------------------------------------------------
  // Toast
  // ------------------------------------------------------------------

  // Self-contained transient message at the bottom of the screen. Used
  // for "Removed N file(s)" feedback. Lives 3 seconds, then fades out.
  function showToast(message: string, kind: "success" | "info" | "error" = "success") {
    const toast = document.createElement("div")
    toast.className = `queue-toast queue-toast-${kind}`
    toast.textContent = message
    document.body.appendChild(toast)
    // Trigger CSS fade-in after a frame.
    requestAnimationFrame(() => {
      toast.classList.add("queue-toast-visible")
    })
    window.setTimeout(() => {
      toast.classList.remove("queue-toast-visible")
      window.setTimeout(() => toast.remove(), 250)
    }, 3000)
  }

  // ------------------------------------------------------------------
  // Delete action
  // ------------------------------------------------------------------

  async function performRemoval() {
    if (selectedFilenames.size === 0) return
    const filenames = Array.from(selectedFilenames)
    if (removeBtn) removeBtn.disabled = true
    if (clearSelectionBtn) clearSelectionBtn.disabled = true
    try {
      const res = await fetch("/api/queue/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames }),
      })
      if (!res.ok) {
        const detail = await res.text()
        showToast(`Could not remove files (HTTP ${res.status}). ${detail.slice(0, 120)}`, "error")
        return
      }
      const data = await res.json() as { results: DeleteResult[] }
      const removed = data.results.filter(r => r.success).length
      const promoted = data.results.filter(r => r.reason === "already_promoted").length
      const errored = data.results.filter(
        r => !r.success && r.reason !== "already_promoted",
      ).length

      let message: string
      if (removed === filenames.length) {
        message = removed === 1
          ? "Removed 1 file from queue."
          : `Removed ${removed} files from queue.`
      } else if (removed > 0 && promoted > 0 && errored === 0) {
        message = `Removed ${removed} of ${filenames.length}; ${promoted} ${promoted === 1 ? "was" : "were"} already being cataloged.`
      } else if (removed === 0 && promoted === filenames.length) {
        message = filenames.length === 1
          ? "File was already being cataloged."
          : `All ${filenames.length} files were already being cataloged.`
      } else if (errored > 0) {
        message = `Removed ${removed}; ${errored} could not be removed.`
      } else {
        message = "Done."
      }
      showToast(message, errored > 0 ? "error" : "success")

      // Clear selection and refresh.
      selectedFilenames.clear()
      updateSelectionBar()
      await loadRuns()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      showToast(`Could not remove files: ${msg}`, "error")
    } finally {
      if (removeBtn) removeBtn.disabled = false
      if (clearSelectionBtn) clearSelectionBtn.disabled = false
    }
  }

  // ------------------------------------------------------------------
  // Status polling
  // ------------------------------------------------------------------

  async function loadRuns() {
    if (!runsList) return
    try {
      const response = await fetch("/api/status")
      const data = await response.json() as { documents?: DocumentRow[]; hasActive?: boolean }
      const documents = data.documents || []
      lastDocuments = documents
      renderTable(documents)

      if (data.hasActive && !pollTimer) {
        pollTimer = setInterval(loadRuns, 10000)
      } else if (!data.hasActive && pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    } catch {
      runsList.innerHTML = '<p class="muted">Could not load status.</p>'
    }
  }

  // ------------------------------------------------------------------
  // Listeners + cleanup
  // ------------------------------------------------------------------

  const onRefreshClick = () => {
    if (runsList) runsList.innerHTML = '<p class="muted">Loading...</p>'
    loadRuns()
  }
  const onClearClick = () => {
    clearSelection()
  }
  const onRemoveClick = () => {
    performRemoval()
  }

  if (refreshRunsBtn) refreshRunsBtn.addEventListener("click", onRefreshClick)
  if (clearSelectionBtn) clearSelectionBtn.addEventListener("click", onClearClick)
  if (removeBtn) removeBtn.addEventListener("click", onRemoveClick)

  // Register cleanup with the SPA router. Three reasons:
  //   1. The 10-second poll timer must not outlive the page it belongs to.
  //   2. The button click handlers must be removed before the next SPA
  //      navigation, otherwise every visit to /collect/acquisition stacks
  //      another listener on the same button.
  //   3. The per-row checkbox change handlers and per-render header
  //      click handlers are attached during renderTable; since
  //      renderTable replaces innerHTML, those nodes are GC'd along
  //      with their listeners on every rebuild — but on SPA navigation
  //      the LATEST set is still in the DOM and would leak if not for
  //      the SPA's whole-frame teardown.
  if (typeof window !== "undefined" && (window as any).addCleanup) {
    ;(window as any).addCleanup(() => {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (refreshRunsBtn) refreshRunsBtn.removeEventListener("click", onRefreshClick)
      if (clearSelectionBtn) clearSelectionBtn.removeEventListener("click", onClearClick)
      if (removeBtn) removeBtn.removeEventListener("click", onRemoveClick)
      // Also clear the selection bar on navigation, in case the page is
      // navigated-away mid-selection. The bar would be hidden by the
      // SPA frame teardown anyway, but explicit is better.
      selectedFilenames.clear()
      updateSelectionBar()
      // Reset sort state so a re-mount starts fresh.
      sortColumn = null
      sortDirection = null
      lastDocuments = []
    })
  }

  // Initial load.
  loadRuns()
})
