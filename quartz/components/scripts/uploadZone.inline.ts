document.addEventListener("nav", () => {
  const dropZone = document.getElementById("drop-zone")
  const fileInput = document.getElementById("file-input") as HTMLInputElement | null
  const statusArea = document.getElementById("status-area") as HTMLElement | null
  const statusMessages = document.getElementById("status-messages")
  const youtubeInput = document.getElementById("youtube-input") as HTMLInputElement | null
  const youtubeBtn = document.getElementById("youtube-btn") as HTMLButtonElement | null
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

  // Load recent runs
  async function loadRuns() {
    if (!runsList) return
    try {
      const response = await fetch("/api/status")
      const data = await response.json()
      if (data.runs && data.runs.length > 0) {
        runsList.innerHTML = data.runs
          .map(
            (run: any) =>
              `<div class="run-item">
                <span class="run-badge ${run.conclusion || run.status}">${run.conclusion || run.status}</span>
                <span class="run-name"><a href="${run.url}" target="_blank">${run.name}</a></span>
                <span class="run-time">${new Date(run.created).toLocaleString()}</span>
              </div>`,
          )
          .join("")
      } else {
        runsList.innerHTML = '<p class="muted">No recent ingestion runs.</p>'
      }
    } catch {
      runsList.innerHTML = '<p class="muted">Could not load status.</p>'
    }
  }

  loadRuns()
})
