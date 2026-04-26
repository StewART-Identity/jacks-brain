document.addEventListener("nav", () => {
  const runsList = document.getElementById("runs-list")
  if (!runsList) return

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  const onRefreshClick = () => {
    runsList.innerHTML = '<p class="muted">Loading...</p>'
    loadRuns()
  }
  if (refreshRunsBtn) {
    refreshRunsBtn.addEventListener("click", onRefreshClick)
  }

  // Register cleanup with the SPA router. Two reasons:
  //   1. The 10-second poll timer must not outlive the page it belongs to.
  //   2. The refresh-button click handler must be removed before the next
  //      SPA navigation, otherwise every visit to /learn/acquisition stacks
  //      another listener on the same button (and on a return visit, every
  //      previous handler still fires on a single click). This is the
  //      canonical Quartz pattern -- see e.g. checkbox.inline.ts.
  if (typeof window !== "undefined" && (window as any).addCleanup) {
    ;(window as any).addCleanup(() => {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (refreshRunsBtn) {
        refreshRunsBtn.removeEventListener("click", onRefreshClick)
      }
    })
  }

  async function loadRuns() {
    if (!runsList) return
    try {
      const response = await fetch("/api/status")
      const data = await response.json()

      if (data.documents && data.documents.length > 0) {
        runsList.innerHTML =
          `<div class="table-container jb-table"><table>
            <thead><tr><th>Document</th><th>Acquired</th><th>Status</th></tr></thead>
            <tbody>` +
          data.documents
            .map(
              (doc: any) =>
                `<tr>
                  <td>${doc.document}</td>
                  <td>${doc.acquired || "Unknown"}</td>
                  <td><span class="run-badge ${doc.status}">${doc.status}</span></td>
                </tr>`,
            )
            .join("") +
          `</tbody></table></div>`
      } else {
        runsList.innerHTML = '<p class="muted">No acquisitions yet.</p>'
      }

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

  loadRuns()
})
