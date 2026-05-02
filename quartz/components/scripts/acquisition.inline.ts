// Acquisition page (/learn/acquisition) — interactive script.
//
// Renders a polling status table fed by /api/status, with a checkbox
// column for pending rows. Selected pending files can be removed from
// the queue via /api/queue/delete; a floating selection bar at the
// bottom of the page surfaces the action.
//
// State:
//   selectedFilenames — in-memory Set<string>, lives for the current
//   navigation. Survives table re-renders by re-checking matching DOM
//   nodes after each rebuild, but resets to empty whenever the user
//   navigates away (Quartz SPA destroys the script frame).
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

document.addEventListener("nav", () => {
  const runsList = document.getElementById("runs-list")
  if (!runsList) return

  let pollTimer: ReturnType<typeof setInterval> | null = null
  const selectedFilenames = new Set<string>()

  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  const selectionBar = document.getElementById("queue-selection-bar") as HTMLDivElement | null
  const selectionCountSpan = document.getElementById("queue-selection-count-num") as HTMLSpanElement | null
  const clearSelectionBtn = document.getElementById("queue-clear-selection-btn") as HTMLButtonElement | null
  const removeBtn = document.getElementById("queue-remove-btn") as HTMLButtonElement | null

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
    return `<tr>
      ${checkboxCell}
      <td>${escapeText(doc.document)}</td>
      <td>${escapeText(doc.acquired || "Unknown")}</td>
      <td><span class="run-badge ${doc.status}">${doc.status}</span></td>
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
    runsList.innerHTML =
      `<div class="table-container jb-table"><table>
        <thead><tr>
          <th class="queue-checkbox-cell" aria-label="Select"></th>
          <th>Document</th>
          <th>Acquired</th>
          <th>Status</th>
        </tr></thead>
        <tbody>` +
      documents.map(rowHTML).join("") +
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
  //      navigation, otherwise every visit to /learn/acquisition stacks
  //      another listener on the same button.
  //   3. The per-row checkbox change handlers are attached during
  //      renderTable; since renderTable replaces innerHTML, those nodes
  //      are GC'd along with their listeners on every rebuild — but on
  //      SPA navigation the LATEST set of checkboxes is still in the DOM
  //      and would leak if not for the SPA's whole-frame teardown. The
  //      change-listener cleanup happens implicitly via the innerHTML
  //      replacement and the SPA frame teardown; we don't need to track
  //      those individually.
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
    })
  }

  // Initial load.
  loadRuns()
})
