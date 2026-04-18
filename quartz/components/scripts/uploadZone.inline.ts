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
    const div = document.createElement("div")
    div.className = "card-status-msg " + type
    div.textContent = msg
    target.appendChild(div)
  }

  function clearCardStatus(target: HTMLElement | null) {
    if (!target) return
    target.innerHTML = ""
    target.style.display = "none"
  }

  // Clear file status when user initiates a new upload
  dropZone.addEventListener("click", () => clearCardStatus(fileStatus))
  dropZone.addEventListener("dragover", () => clearCardStatus(fileStatus))

  // Clear paste status and fields when user clicks into them
  if (pasteInput) {
    pasteInput.addEventListener("focus", () => {
      clearCardStatus(pasteStatus)
      pasteInput.value = ""
    })
  }
  if (pasteTitle) {
    pasteTitle.addEventListener("focus", () => {
      clearCardStatus(pasteStatus)
      pasteTitle.value = ""
    })
  }

  // Clear YouTube status and field when user clicks into it
  if (youtubeInput) {
    youtubeInput.addEventListener("focus", () => {
      clearCardStatus(youtubeStatus)
      youtubeInput.value = ""
    })
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

  async function checkActiveIngest(): Promise<boolean> {
    try {
      const res = await fetch("/api/status")
      const data = await res.json()
      return data.hasActive === true
    } catch {}
    return false
  }

  async function uploadFile(file: File) {
    // Show Document Processing section on new upload
    localStorage.removeItem("docProcessingCleared")
    const recentSection = document.getElementById("recent-runs")
    if (recentSection) recentSection.style.display = ""

    // Warn if another ingest is running
    const busy = await checkActiveIngest()
    if (busy) {
      showCardStatus(fileStatus, "Another document is currently being processed. Your upload will be queued.", "pending")
    }

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

  // Refresh runs button
  const refreshRunsBtn = document.getElementById("refresh-runs-btn") as HTMLButtonElement | null
  if (refreshRunsBtn) {
    refreshRunsBtn.addEventListener("click", () => {
      if (runsList) runsList.innerHTML = '<p class="muted">Loading...</p>'
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
          `<div class="table-container"><table>
            <thead><tr><th>Document</th><th>Uploaded</th><th>Status</th></tr></thead>
            <tbody>` +
          data.documents
            .map(
              (doc: any) =>
                `<tr>
                  <td>${doc.document}</td>
                  <td>${doc.uploaded || "Unknown"}</td>
                  <td><span class="run-badge ${doc.status}">${doc.status}</span></td>
                </tr>`,
            )
            .join("") +
          `</tbody></table></div>`
      } else {
        runsList.innerHTML = '<p class="muted">No documents uploaded.</p>'
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
