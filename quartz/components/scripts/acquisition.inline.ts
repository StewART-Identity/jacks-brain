document.addEventListener("nav", () => {
  const runsList = document.getElementById("runs-list")
  if (!runsList) return

  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  if (refreshRunsBtn) {
    refreshRunsBtn.addEventListener("click", () => {
      runsList.innerHTML = '<p class="muted">Loading...</p>'
      loadRuns()
    })
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null

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
