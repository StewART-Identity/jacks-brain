document.addEventListener("nav", () => {
  const dropZone = document.getElementById("drop-zone")
  const fileInput = document.getElementById("file-input") as HTMLInputElement | null
  const fileStatus = document.getElementById("file-status") as HTMLElement | null
  const pasteStatus = document.getElementById("paste-status") as HTMLElement | null
  const youtubeStatus = document.getElementById("youtube-status") as HTMLElement | null
  const youtubeInput = document.getElementById("youtube-input") as HTMLInputElement | null
  const youtubeBtn = document.getElementById("youtube-btn") as HTMLButtonElement | null
  const pasteInput = document.getElementById("paste-input") as HTMLTextAreaElement | null
  const pasteTitle = document.getElementById("paste-title") as HTMLInputElement | null
  const pasteBtn = document.getElementById("paste-btn") as HTMLButtonElement | null
  const runsList = document.getElementById("runs-list")

  if (!dropZone || !fileInput) return

  function showCardStatus(target: HTMLElement | null, msg: string, type: string) {
    if (!target) return
    target.style.display = "block"
    target.className = "card-status " + type
    target.textContent = msg
  }

  // Drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault()
    dropZone.classList.add("drag-over")
  })
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over")
  })
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault()
    dropZone.classList.remove("drag-over")
    if (e.dataTransfer?.files.length) {
      uploadFile(e.dataTransfer.files[0])
    }
  })

  // Click to browse
  dropZone.addEventListener("click", (e) => {
    if (e.target !== fileInput) {
      fileInput.click()
    }
  })
  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) {
      uploadFile(fileInput.files[0])
    }
  })

  // Global paste handler for images
  document.addEventListener("paste", (e) => {
    // Only handle if we're on the upload page (drop zone exists)
    if (!dropZone) return

    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          // Generate a meaningful filename
          const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1]
          const today = new Date().toISOString().slice(0, 10)
          const timestamp = Date.now()
          const namedFile = new File([file], `${today}-pasted-image-${timestamp}.${ext}`, {
            type: file.type,
          })
          showCardStatus(fileStatus, "Pasted image detected, uploading...", "pending")
          uploadFile(namedFile)
        }
        return
      }
    }
  })

  async function uploadFile(file: File) {
    // Show Document Processing section on new upload
    localStorage.removeItem("docProcessingCleared")
    const recentSection = document.getElementById("recent-runs")
    if (recentSection) recentSection.style.display = ""
    showCardStatus(fileStatus, "Uploading " + file.name + "...", "pending")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await response.json()
      if (data.success) {
        showCardStatus(fileStatus, "Uploaded. Check Document Processing for current status.", "success")
        setTimeout(loadRuns, 3000)
      } else {
        showCardStatus(fileStatus, "Upload failed: " + (data.error || "Unknown error"), "error")
      }
    } catch (err: any) {
      showCardStatus(fileStatus, "Upload failed: " + err.message, "error")
    }
    fileInput.value = ""
  }

  // Text paste ingest
  if (pasteBtn && pasteInput) {
    pasteBtn.addEventListener("click", async () => {
      const text = pasteInput.value.trim()
      if (!text) return

      pasteBtn.disabled = true
      pasteBtn.textContent = "Uploading..."

      // Build a markdown file from the pasted text
      const today = new Date().toISOString().slice(0, 10)
      const title = pasteTitle?.value.trim() || "pasted-text"
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      const filename = `${today}-${slug}.md`
      const content = `# ${pasteTitle?.value.trim() || "Pasted Text"}\n\n${text}`

      const file = new File([content], filename, { type: "text/markdown" })
      showCardStatus(pasteStatus, "Uploading pasted text as " + filename + "...", "pending")

      try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await response.json()
        if (data.success) {
          showCardStatus(pasteStatus, "Uploaded. Check Document Processing for current status.", "success")
          pasteInput.value = ""
          if (pasteTitle) pasteTitle.value = ""
          setTimeout(loadRuns, 3000)
        } else {
          showCardStatus(pasteStatus, "Upload failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showCardStatus(pasteStatus, "Upload failed: " + err.message, "error")
      }

      pasteBtn.disabled = false
      pasteBtn.textContent = "Upload"
    })
  }

  // YouTube ingest
  if (youtubeBtn && youtubeInput) {
    youtubeBtn.addEventListener("click", async () => {
      const url = youtubeInput.value.trim()
      if (!url) return
      youtubeBtn.disabled = true
      youtubeBtn.textContent = "Submitting..."
      showCardStatus(youtubeStatus, "Submitting YouTube URL...", "pending")
      try {
        const response = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const data = await response.json()
        if (data.success) {
          showCardStatus(youtubeStatus, "Uploaded. Check Document Processing for current status.", "success")
          youtubeInput.value = ""
          setTimeout(loadRuns, 3000)
        } else {
          showCardStatus(youtubeStatus, "Failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showCardStatus(youtubeStatus, "Failed: " + err.message, "error")
      }
      youtubeBtn.disabled = false
      youtubeBtn.textContent = "Upload"
    })
  }

  const recentRunsSection = document.getElementById("recent-runs") as HTMLElement | null

  // Refresh runs button — shows the section and reloads
  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  if (refreshRunsBtn) {
    refreshRunsBtn.addEventListener("click", () => {
      localStorage.removeItem("docProcessingCleared")
      if (recentRunsSection) recentRunsSection.style.display = ""
      if (runsList) runsList.innerHTML = '<p class="muted">Loading...</p>'
      loadRuns()
    })
  }

  // Clear runs button — hides the entire section
  const clearRunsBtn = document.getElementById("clear-runs-btn") as HTMLButtonElement | null
  if (clearRunsBtn) {
    clearRunsBtn.addEventListener("click", () => {
      localStorage.setItem("docProcessingCleared", "true")
      if (recentRunsSection) recentRunsSection.style.display = "none"
    })
  }

  // Load runs — skip if cleared
  async function loadRuns() {
    if (!runsList) return
    if (localStorage.getItem("docProcessingCleared") === "true") {
      if (recentRunsSection) recentRunsSection.style.display = "none"
      return
    }
    try {
      const response = await fetch("/api/status")
      const data = await response.json()

      if (data.runs && data.runs.length > 0) {
        // Only show in-progress/queued, or runs from the last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000
        const filtered = data.runs.filter((run: any) => {
          if (run.status === "in_progress" || run.status === "queued") return true
          return new Date(run.created).getTime() > cutoff
        })

        if (filtered.length > 0) {
          runsList.innerHTML =
            `<div class="table-container"><table>
              <thead><tr><th>Document</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>` +
            filtered
              .map(
                (run: any) =>
                  `<tr>
                    <td>${run.document || run.name}</td>
                    <td>${new Date(run.created).toLocaleString()}</td>
                    <td><span class="run-badge ${run.conclusion || run.status}">${run.conclusion || run.status}</span></td>
                  </tr>`,
              )
              .join("") +
            `</tbody></table></div>`
        } else {
          runsList.innerHTML = '<p class="muted">No active processing.</p>'
        }
      } else {
        runsList.innerHTML = '<p class="muted">No active processing.</p>'
      }
    } catch {
      runsList.innerHTML = '<p class="muted">Could not load status.</p>'
    }
  }

  loadRuns()
})
