document.addEventListener("nav", () => {
  const queryInput = document.getElementById("research-query") as HTMLTextAreaElement | null
  const countInput = document.getElementById("research-count") as HTMLInputElement | null
  const rankInput = document.getElementById("research-rank") as HTMLInputElement | null
  const searchBtn = document.getElementById("research-btn") as HTMLButtonElement | null
  const statusEl = document.getElementById("research-status") as HTMLElement | null
  const resultsSection = document.getElementById("research-results") as HTMLElement | null
  const resultsList = document.getElementById("research-results-list") as HTMLElement | null
  const providerEl = document.getElementById("research-provider") as HTMLElement | null
  const ingestBtn = document.getElementById("ingest-selected-btn") as HTMLButtonElement | null
  const ingestStatus = document.getElementById("research-ingest-status") as HTMLElement | null

  if (!queryInput || !countInput || !searchBtn || !resultsList || !ingestBtn) return

  const PROVIDER_LABELS: Record<string, string> = {
    brave: "via Brave Search",
    "brave+claude": "via Brave, ranked by Claude",
    "claude-web-search": "via Claude web search",
  }

  function showStatus(target: HTMLElement | null, msg: string, type: string) {
    if (!target) return
    target.style.display = "block"
    const div = document.createElement("div")
    div.className = "card-status-msg " + type
    div.textContent = msg
    target.appendChild(div)
  }

  function clearStatus(target: HTMLElement | null) {
    if (!target) return
    target.innerHTML = ""
    target.style.display = "none"
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function updateIngestBtn() {
    if (!ingestBtn) return
    const checked = resultsList!.querySelectorAll<HTMLInputElement>(
      ".research-select:checked",
    ).length
    ingestBtn.disabled = checked === 0
    ingestBtn.textContent = checked === 0 ? "Ingest selected" : `Ingest selected (${checked})`
  }

  function renderResults(results: Array<{ url: string; title: string; summary: string }>) {
    if (!resultsList || !resultsSection) return
    if (results.length === 0) {
      resultsList.innerHTML = '<p class="muted">No results returned.</p>'
      resultsSection.style.display = ""
      return
    }
    resultsList.innerHTML = results
      .map((r, i) => {
        let host = ""
        try {
          host = new URL(r.url).hostname
        } catch {}
        return `<div class="research-result">
          <label class="research-result-check">
            <input type="checkbox" class="research-select" data-url="${escapeHtml(r.url)}" data-title="${escapeHtml(r.title)}" />
          </label>
          <div class="research-result-body">
            <div class="research-result-title">
              <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>
            </div>
            ${host ? `<div class="research-result-host">${escapeHtml(host)}</div>` : ""}
            <div class="research-result-summary">${escapeHtml(r.summary || "")}</div>
            <div class="research-result-actions">
              <a class="research-result-view" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">View</a>
              <span class="research-row-status" data-idx="${i}"></span>
            </div>
          </div>
        </div>`
      })
      .join("")
    resultsSection.style.display = ""
    resultsList
      .querySelectorAll<HTMLInputElement>(".research-select")
      .forEach((cb) => cb.addEventListener("change", updateIngestBtn))
    updateIngestBtn()
  }

  searchBtn.addEventListener("click", async () => {
    const query = queryInput.value.trim()
    if (!query) return

    const count = Math.max(1, Math.min(25, parseInt(countInput.value, 10) || 10))
    const rank = rankInput ? rankInput.checked : true

    clearStatus(statusEl)
    clearStatus(ingestStatus)
    if (resultsSection) resultsSection.style.display = "none"
    if (providerEl) providerEl.textContent = ""
    resultsList.innerHTML = ""

    searchBtn.disabled = true
    searchBtn.textContent = "Searching..."
    showStatus(statusEl, "Searching for the best " + count + " sources...", "pending")

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, count, rank }),
      })
      const data = await response.json()
      if (data.success) {
        clearStatus(statusEl)
        if (providerEl && data.provider) {
          providerEl.textContent = PROVIDER_LABELS[data.provider] || ""
        }
        if (data.rankingError) {
          showStatus(statusEl, data.rankingError + " — showing Brave results.", "pending")
        }
        renderResults(data.results || [])
      } else {
        showStatus(statusEl, "Search failed: " + (data.error || "Unknown error"), "error")
      }
    } catch (err: any) {
      showStatus(statusEl, "Search failed: " + err.message, "error")
    }

    searchBtn.disabled = false
    searchBtn.textContent = "Search"
  })

  ingestBtn.addEventListener("click", async () => {
    if (!ingestBtn || !resultsList) return
    const selected = Array.from(
      resultsList.querySelectorAll<HTMLInputElement>(".research-select:checked"),
    )
    if (selected.length === 0) return

    ingestBtn.disabled = true
    ingestBtn.textContent = "Ingesting..."
    clearStatus(ingestStatus)
    showStatus(
      ingestStatus,
      `Submitting ${selected.length} URL${selected.length === 1 ? "" : "s"} for ingestion...`,
      "pending",
    )

    let succeeded = 0
    let failed = 0

    for (const cb of selected) {
      const url = cb.dataset.url || ""
      const row = cb.closest(".research-result") as HTMLElement | null
      const rowStatus = row?.querySelector(".research-row-status") as HTMLElement | null
      if (rowStatus) rowStatus.textContent = "Fetching..."
      try {
        const response = await fetch("/api/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const data = await response.json()
        if (data.success) {
          succeeded++
          if (rowStatus) {
            rowStatus.textContent = "Queued for ingestion"
            rowStatus.className = "research-row-status ok"
          }
          cb.checked = false
          cb.disabled = true
        } else {
          failed++
          if (rowStatus) {
            rowStatus.textContent = "Failed: " + (data.error || "Unknown error")
            rowStatus.className = "research-row-status err"
          }
        }
      } catch (err: any) {
        failed++
        if (rowStatus) {
          rowStatus.textContent = "Failed: " + err.message
          rowStatus.className = "research-row-status err"
        }
      }
    }

    clearStatus(ingestStatus)
    const summary =
      `${succeeded} submitted` +
      (failed > 0 ? `, ${failed} failed` : "") +
      ". Check Retention for ingestion status."
    showStatus(ingestStatus, summary, failed === 0 ? "success" : "error")

    updateIngestBtn()
    ingestBtn.disabled = false
  })
})
