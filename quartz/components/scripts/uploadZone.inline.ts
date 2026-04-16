document.addEventListener("nav", () => {
  const dropZone = document.getElementById("drop-zone")
  const fileInput = document.getElementById("file-input") as HTMLInputElement | null
  const statusArea = document.getElementById("status-area") as HTMLElement | null
  const statusMessages = document.getElementById("status-messages")
  const youtubeInput = document.getElementById("youtube-input") as HTMLInputElement | null
  const youtubeBtn = document.getElementById("youtube-btn") as HTMLButtonElement | null
  const pasteInput = document.getElementById("paste-input") as HTMLTextAreaElement | null
  const pasteTitle = document.getElementById("paste-title") as HTMLInputElement | null
  const pasteBtn = document.getElementById("paste-btn") as HTMLButtonElement | null
  const runsList = document.getElementById("runs-list")

  if (!dropZone || !fileInput) return

  function showStatus(msg: string, type: string) {
    if (!statusArea || !statusMessages) return
    statusArea.style.display = "block"
    const div = document.createElement("div")
    div.className = "status-msg " + type
    div.textContent = msg
    statusMessages.prepend(div)
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
          showStatus("Pasted image detected, uploading...", "pending")
          uploadFile(namedFile)
        }
        return
      }
    }
  })

  async function uploadFile(file: File) {
    showStatus("Uploading " + file.name + "...", "pending")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await response.json()
      if (data.success) {
        showStatus(data.message, "success")
        setTimeout(loadRuns, 3000)
      } else {
        showStatus("Upload failed: " + (data.error || "Unknown error"), "error")
      }
    } catch (err: any) {
      showStatus("Upload failed: " + err.message, "error")
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
      showStatus("Uploading pasted text as " + filename + "...", "pending")

      try {
        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await response.json()
        if (data.success) {
          showStatus(data.message, "success")
          pasteInput.value = ""
          if (pasteTitle) pasteTitle.value = ""
          setTimeout(loadRuns, 3000)
        } else {
          showStatus("Upload failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showStatus("Upload failed: " + err.message, "error")
      }

      pasteBtn.disabled = false
      pasteBtn.textContent = "Ingest"
    })
  }

  // YouTube ingest
  if (youtubeBtn && youtubeInput) {
    youtubeBtn.addEventListener("click", async () => {
      const url = youtubeInput.value.trim()
      if (!url) return
      youtubeBtn.disabled = true
      youtubeBtn.textContent = "Submitting..."
      showStatus("Submitting YouTube URL...", "pending")
      try {
        const response = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const data = await response.json()
        if (data.success) {
          showStatus(data.message, "success")
          youtubeInput.value = ""
          setTimeout(loadRuns, 3000)
        } else {
          showStatus("Failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showStatus("Failed: " + err.message, "error")
      }
      youtubeBtn.disabled = false
      youtubeBtn.textContent = "Ingest"
    })
  }

  // Refresh runs button — resets clear and reloads
  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  if (refreshRunsBtn) {
    refreshRunsBtn.addEventListener("click", () => {
      localStorage.removeItem("docProcessingHiddenIds")
      if (runsList) runsList.innerHTML = '<p class="muted">Loading...</p>'
      loadRuns()
    })
  }

  // Clear runs button — hides all currently visible runs by ID
  const clearRunsBtn = document.getElementById("clear-runs-btn") as HTMLButtonElement | null
  if (clearRunsBtn && runsList) {
    clearRunsBtn.addEventListener("click", () => {
      // Store IDs of all currently known runs to hide them
      const existing = JSON.parse(localStorage.getItem("docProcessingHiddenIds") || "[]")
      const currentIds = (window as any).__docProcessingRunIds || []
      const merged = [...new Set([...existing, ...currentIds])]
      localStorage.setItem("docProcessingHiddenIds", JSON.stringify(merged))
      runsList.innerHTML = '<p class="muted">No active processing.</p>'
    })
  }

  // Load runs — hides cleared runs, always shows in-progress
  async function loadRuns() {
    if (!runsList) return
    try {
      const response = await fetch("/api/status")
      const data = await response.json()
      const hiddenIds: number[] = JSON.parse(localStorage.getItem("docProcessingHiddenIds") || "[]")
      const hiddenSet = new Set(hiddenIds)

      if (data.runs && data.runs.length > 0) {
        // Store all run IDs so clear can reference them
        ;(window as any).__docProcessingRunIds = data.runs.map((r: any) => r.id)

        const filtered = data.runs.filter((run: any) => {
          // Always show in-progress/queued runs
          if (run.status === "in_progress" || run.status === "queued") return true
          // Hide runs that were explicitly cleared
          if (hiddenSet.has(run.id)) return false
          return true
        })

        if (filtered.length > 0) {
          runsList.innerHTML = filtered
            .map(
              (run: any) =>
                `<div class="run-item">
                  <span class="run-badge ${run.conclusion || run.status}">${run.conclusion || run.status}</span>
                  <span class="run-doc">${run.document || run.name}</span>
                  <span class="run-time">${new Date(run.created).toLocaleString()}</span>
                </div>`,
            )
            .join("")
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
