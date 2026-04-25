document.addEventListener("nav", () => {
  const dropZone = document.getElementById("drop-zone")
  const fileInput = document.getElementById("file-input") as HTMLInputElement | null
  const fileTitle = document.getElementById("file-title") as HTMLInputElement | null
  const fileStatus = document.getElementById("file-status") as HTMLElement | null
  const pasteStatus = document.getElementById("paste-status") as HTMLElement | null
  const youtubeStatus = document.getElementById("youtube-status") as HTMLElement | null
  const youtubeInput = document.getElementById("youtube-input") as HTMLInputElement | null
  const youtubeBtn = document.getElementById("youtube-btn") as HTMLButtonElement | null
  const pasteInput = document.getElementById("paste-input") as HTMLTextAreaElement | null
  const pasteTitle = document.getElementById("paste-title") as HTMLInputElement | null
  const pasteBtn = document.getElementById("paste-btn") as HTMLButtonElement | null
  const urlInput = document.getElementById("url-input") as HTMLInputElement | null
  const urlBtn = document.getElementById("url-btn") as HTMLButtonElement | null
  const urlStatus = document.getElementById("url-status") as HTMLElement | null

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

  const ACQUISITION_HINT = "Uploaded. Check Acquisition for current status."

  // Clear file status when user initiates a new upload
  dropZone.addEventListener("click", () => clearCardStatus(fileStatus))
  dropZone.addEventListener("dragover", () => clearCardStatus(fileStatus))

  // Clear file status when user focuses the title field (new upload coming)
  if (fileTitle) {
    fileTitle.addEventListener("focus", () => clearCardStatus(fileStatus))
  }

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

  // Clear URL status and field when user clicks into it
  if (urlInput) {
    urlInput.addEventListener("focus", () => {
      clearCardStatus(urlStatus)
      urlInput.value = ""
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

  async function checkActiveCatalog(): Promise<boolean> {
    try {
      const res = await fetch("/api/status")
      const data = await res.json()
      return data.hasActive === true
    } catch {}
    return false
  }

  // Turn a user-provided title into a filename-safe slug.
  // Mirrors the paste card's slugify logic so that titles work the same
  // way regardless of which card the user is in.
  function slugify(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  // Derive a filename from a user title and the original file's extension.
  // If no title is given, returns null — caller falls back to file.name.
  function filenameFromTitle(title: string, originalName: string): string | null {
    const slug = slugify(title)
    if (!slug) return null
    // Preserve the original extension (".png", ".pdf", etc.)
    const extMatch = originalName.match(/\.[^.]+$/)
    const ext = extMatch ? extMatch[0].toLowerCase() : ""
    const today = new Date().toISOString().slice(0, 10)
    return `${today}-${slug}${ext}`
  }

  async function uploadFile(file: File) {
    const busy = await checkActiveCatalog()
    if (busy) {
      showCardStatus(
        fileStatus,
        "Another document is currently being processed. Your upload will be queued.",
        "pending",
      )
    }

    // If the user filled in a title, rename the file before uploading.
    // Empty or whitespace-only titles fall back to the original filename,
    // which gets date-prefixed server-side (see upload.ts).
    const title = fileTitle?.value.trim() || ""
    const renamedName = title ? filenameFromTitle(title, file.name) : null
    const fileToUpload = renamedName
      ? new File([file], renamedName, { type: file.type })
      : file

    showCardStatus(fileStatus, "Uploading " + fileToUpload.name + "...", "pending")
    try {
      const formData = new FormData()
      formData.append("file", fileToUpload)
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await response.json()
      if (data.success) {
        showCardStatus(fileStatus, ACQUISITION_HINT, "success")
        // Clear the title field on success so it doesn't accidentally apply
        // to the next upload. The paste card clears on focus; the file card
        // clears on successful completion.
        if (fileTitle) fileTitle.value = ""
      } else {
        showCardStatus(fileStatus, "Upload failed: " + (data.error || "Unknown error"), "error")
      }
    } catch (err: any) {
      showCardStatus(fileStatus, "Upload failed: " + err.message, "error")
    }
    fileInput.value = ""
  }

  // Text paste catalog
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
          showCardStatus(pasteStatus, ACQUISITION_HINT, "success")
          pasteInput.value = ""
          if (pasteTitle) pasteTitle.value = ""
        } else {
          showCardStatus(pasteStatus, "Upload failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showCardStatus(pasteStatus, "Upload failed: " + err.message, "error")
      }

      pasteBtn.disabled = false
      pasteBtn.textContent = "Upload Content"
    })
  }

  // URL catalog
  if (urlBtn && urlInput) {
    urlBtn.addEventListener("click", async () => {
      const url = urlInput.value.trim()
      if (!url) return
      urlBtn.disabled = true
      urlBtn.textContent = "Fetching..."
      showCardStatus(urlStatus, "Fetching " + url + "...", "pending")
      try {
        const response = await fetch("/api/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        const data = await response.json()
        if (data.success) {
          showCardStatus(urlStatus, ACQUISITION_HINT, "success")
          urlInput.value = ""
        } else {
          showCardStatus(urlStatus, "Failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showCardStatus(urlStatus, "Failed: " + err.message, "error")
      }
      urlBtn.disabled = false
      urlBtn.textContent = "Upload Content"
    })
  }

  // YouTube catalog
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
          showCardStatus(youtubeStatus, ACQUISITION_HINT, "success")
          youtubeInput.value = ""
        } else {
          showCardStatus(youtubeStatus, "Failed: " + (data.error || "Unknown error"), "error")
        }
      } catch (err: any) {
        showCardStatus(youtubeStatus, "Failed: " + err.message, "error")
      }
      youtubeBtn.disabled = false
      youtubeBtn.textContent = "Upload Content"
    })
  }
})
