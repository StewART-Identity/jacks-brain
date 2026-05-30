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
  const wikiInput = document.getElementById("wiki-input") as HTMLInputElement | null
  const wikiBtn = document.getElementById("wiki-btn") as HTMLButtonElement | null
  const wikiResults = document.getElementById("wiki-results") as HTMLElement | null
  const wikiStatus = document.getElementById("wiki-status") as HTMLElement | null

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

  // Clear Wikipedia status when the user refocuses the search box. We do NOT
  // clear the input or the rendered results here — the user often wants to
  // import several articles from one search, so the results persist until the
  // next explicit search.
  if (wikiInput) {
    wikiInput.addEventListener("focus", () => clearCardStatus(wikiStatus))
  }

  // Drag and drop. Multi-file drag is supported — pass the entire
  // FileList through to uploadFiles which iterates internally.
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
      uploadFiles(e.dataTransfer.files)
    }
  })

  // Click to browse. Multi-select is supported (input has `multiple`
  // attribute); the change handler hands the entire FileList to
  // uploadFiles.
  dropZone.addEventListener("click", (e) => {
    if (e.target !== fileInput) {
      fileInput.click()
    }
  })
  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) {
      uploadFiles(fileInput.files)
    }
  })

  // Global paste handler for images. Clipboard items can contain at
  // most one file in practice, so this stays single-file.
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

  // Single-file path. Used by the paste handler and as a thin wrapper
  // around uploadFiles when there's exactly one file. The title field
  // applies in this path.
  async function uploadFile(file: File) {
    return uploadFiles([file])
  }

  // Multi-file upload coordinator. Sequential — each file awaits the
  // previous so progress messages land in order and we don't race the
  // GitHub tree. Title field is honored only when there's exactly one
  // file (a single title across N files would collide on filenames).
  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files as ArrayLike<File>)
    if (fileArray.length === 0) return

    const isMulti = fileArray.length > 1
    const title = fileTitle?.value.trim() || ""

    if (isMulti && title) {
      showCardStatus(
        fileStatus,
        "Uploading " + fileArray.length + " files (title field ignored for multi-upload)...",
        "pending",
      )
    } else {
      const busy = await checkActiveCatalog()
      if (busy) {
        showCardStatus(
          fileStatus,
          isMulti
            ? "Another document is currently being processed. Your uploads will be queued."
            : "Another document is currently being processed. Your upload will be queued.",
          "pending",
        )
      }
    }

    let successes = 0
    let failures = 0

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]

      // Title rename only applies in single-file path. For multi-file,
      // skip the title and use the original filename (date-prefixed
      // server-side per upload.ts).
      const renamedName = !isMulti && title ? filenameFromTitle(title, file.name) : null
      const fileToUpload = renamedName
        ? new File([file], renamedName, { type: file.type })
        : file

      const progress = isMulti
        ? "Uploading " + (i + 1) + " of " + fileArray.length + ": " + fileToUpload.name + "..."
        : "Uploading " + fileToUpload.name + "..."
      showCardStatus(fileStatus, progress, "pending")

      try {
        const formData = new FormData()
        formData.append("file", fileToUpload)
        const response = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await response.json()
        if (data.success) {
          successes++
          if (isMulti) {
            showCardStatus(
              fileStatus,
              "Uploaded " + (i + 1) + " of " + fileArray.length + ": " + fileToUpload.name,
              "success",
            )
          }
        } else {
          failures++
          const errMsg = data.error || "Unknown error"
          const detail = data.detail ? " (" + data.detail + ")" : ""
          showCardStatus(
            fileStatus,
            "Failed " + fileToUpload.name + ": " + errMsg + detail,
            "error",
          )
        }
      } catch (err: any) {
        failures++
        showCardStatus(
          fileStatus,
          "Failed " + fileToUpload.name + ": " + err.message,
          "error",
        )
      }
    }

    // Final summary line.
    if (isMulti) {
      if (failures === 0) {
        showCardStatus(
          fileStatus,
          "Uploaded " + successes + " files. " + ACQUISITION_HINT,
          "success",
        )
      } else if (successes === 0) {
        showCardStatus(
          fileStatus,
          "All " + failures + " uploads failed.",
          "error",
        )
      } else {
        showCardStatus(
          fileStatus,
          "Uploaded " + successes + " of " + fileArray.length + "; " + failures + " failed. " + ACQUISITION_HINT,
          "success",
        )
      }
    } else if (successes > 0) {
      showCardStatus(fileStatus, ACQUISITION_HINT, "success")
    }

    // Clear the title field on success — same behavior as before.
    // For multi-uploads the title was ignored anyway, so clearing it
    // signals the field is reset for next time.
    if (fileTitle && successes > 0) fileTitle.value = ""

    // Reset the file input so the same file can be re-selected later.
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

  // YouTube catalog — POSTs to the unified /api/url endpoint, which
  // detects YouTube URLs and routes them through Supadata for transcript
  // fetching. The card stays as a separate UI affordance (helpful cue
  // that "yes, YouTube is supported"), but the backend is now unified.
  if (youtubeBtn && youtubeInput) {
    youtubeBtn.addEventListener("click", async () => {
      const url = youtubeInput.value.trim()
      if (!url) return
      youtubeBtn.disabled = true
      youtubeBtn.textContent = "Fetching transcript..."
      showCardStatus(youtubeStatus, "Fetching transcript for " + url + "...", "pending")
      try {
        const response = await fetch("/api/url", {
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

  // ─── Wikipedia search + preview + import ──────────────────────────────────
  // Three-step flow against /api/wikipedia:
  //   1. search  → render candidate articles, each with Preview + Import
  //   2. preview → server cleans the article (no commit) and returns a report;
  //                we show it inline under the row so the user can confirm the
  //                cleanup looks sane before committing
  //   3. import  → server cleans AND commits to the catalog queue
  // Function declarations (hoisted) so the listener bindings at the bottom can
  // reference them regardless of source order.

  interface WikiPreview {
    title: string
    url: string
    disambiguation: boolean
    tooShort: boolean
    charCount: number
    wordCount: number
    cutHeader: string | null
    sections: string[]
    taste: string
    markdown: string
  }

  function renderWikiResults(results: { title: string; snippet: string }[]) {
    if (!wikiResults) return
    wikiResults.innerHTML = ""
    if (results.length === 0) {
      const empty = document.createElement("div")
      empty.className = "muted"
      empty.textContent = "No articles found. Try a different search term."
      wikiResults.appendChild(empty)
      return
    }
    for (const r of results) {
      // Each candidate is an item containing a row (title/snippet + actions)
      // and a preview panel that fills in below the row on demand.
      const item = document.createElement("div")
      item.className = "wiki-result-item"

      const row = document.createElement("div")
      row.className = "wiki-result"

      const main = document.createElement("div")
      main.className = "wiki-result-main"

      const title = document.createElement("div")
      title.className = "wiki-result-title"
      // textContent, never innerHTML — result strings are remote data.
      title.textContent = r.title

      const snippet = document.createElement("div")
      snippet.className = "wiki-result-snippet"
      snippet.textContent = r.snippet

      main.appendChild(title)
      main.appendChild(snippet)

      const actions = document.createElement("div")
      actions.className = "wiki-result-actions"

      const previewBtn = document.createElement("button")
      previewBtn.className = "wiki-preview-btn"
      previewBtn.textContent = "Preview"

      const importBtn = document.createElement("button")
      importBtn.className = "wiki-import-btn"
      importBtn.textContent = "Import"

      actions.appendChild(previewBtn)
      actions.appendChild(importBtn)

      row.appendChild(main)
      row.appendChild(actions)

      const panel = document.createElement("div")
      panel.className = "wiki-preview-panel"
      panel.hidden = true

      previewBtn.addEventListener("click", () =>
        previewWikiArticle(r.title, previewBtn, importBtn, panel),
      )
      importBtn.addEventListener("click", () => importWikiArticle(r.title, importBtn))

      item.appendChild(row)
      item.appendChild(panel)
      wikiResults.appendChild(item)
    }
  }

  // Small flagged line (warnings) inside a preview panel.
  function appendPreviewFlag(panel: HTMLElement, msg: string) {
    const f = document.createElement("div")
    f.className = "wiki-preview-flag"
    f.textContent = msg
    panel.appendChild(f)
  }

  // Render the cleanup report into a result's panel. Built with DOM APIs +
  // textContent throughout — the taste and markdown are remote-derived.
  function renderPreviewPanel(panel: HTMLElement, data: WikiPreview, importBtn: HTMLButtonElement) {
    panel.innerHTML = ""

    // Disambiguation: there's no article body to preview, and import will
    // refuse — so say so and disable the row's Import button.
    if (data.disambiguation) {
      appendPreviewFlag(
        panel,
        "This is a disambiguation page, not an article. Import will be refused — search a more specific title.",
      )
      importBtn.disabled = true
      importBtn.textContent = "Can't import"
      return
    }

    const stats = document.createElement("div")
    stats.className = "wiki-preview-stats"
    stats.textContent =
      (data.wordCount || 0).toLocaleString() +
      " words \u00b7 " +
      (data.charCount || 0).toLocaleString() +
      " characters"
    panel.appendChild(stats)

    const trim = document.createElement("div")
    trim.className = "wiki-preview-line"
    trim.textContent = data.cutHeader
      ? 'Trimmed reference apparatus at "' + data.cutHeader + '".'
      : "No tail sections trimmed."
    panel.appendChild(trim)

    // The thin-content warning is the whole reason the preview exists: a low
    // char count usually means the article was mostly tables/infoboxes, which
    // the plaintext extract drops.
    if (data.tooShort) {
      appendPreviewFlag(
        panel,
        "Very short (" +
          (data.charCount || 0) +
          " chars) — likely a stub, or an article whose content lived in tables the plaintext extract drops.",
      )
    }

    const sec = document.createElement("div")
    sec.className = "wiki-preview-line"
    sec.textContent =
      data.sections && data.sections.length
        ? "Sections: " + data.sections.join(" \u00b7 ")
        : "Sections: none detected — single block, or content was mostly tabular."
    panel.appendChild(sec)

    if (data.taste) {
      const taste = document.createElement("p")
      taste.className = "wiki-preview-taste"
      taste.textContent = data.taste + "\u2026"
      panel.appendChild(taste)
    }

    // Full committed markdown, behind a toggle — most of the time the summary
    // above is enough and you never expand this.
    if (data.markdown) {
      const toggle = document.createElement("button")
      toggle.className = "wiki-preview-toggle"
      toggle.textContent = "Show full markdown"
      const pre = document.createElement("pre")
      pre.className = "wiki-preview-full"
      pre.hidden = true
      pre.textContent = data.markdown
      toggle.addEventListener("click", () => {
        pre.hidden = !pre.hidden
        toggle.textContent = pre.hidden ? "Show full markdown" : "Hide full markdown"
      })
      panel.appendChild(toggle)
      panel.appendChild(pre)
    }
  }

  async function previewWikiArticle(
    title: string,
    previewBtn: HTMLButtonElement,
    importBtn: HTMLButtonElement,
    panel: HTMLElement,
  ) {
    // Already fetched once → just toggle visibility, no re-fetch.
    if (panel.dataset.loaded === "true") {
      panel.hidden = !panel.hidden
      previewBtn.textContent = panel.hidden ? "Preview" : "Hide"
      return
    }
    previewBtn.disabled = true
    previewBtn.textContent = "Previewing..."
    try {
      const res = await fetch("/api/wikipedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", title }),
      })
      const data = await res.json()
      if (data.success) {
        renderPreviewPanel(panel, data as WikiPreview, importBtn)
        panel.dataset.loaded = "true"
        panel.hidden = false
        previewBtn.textContent = "Hide"
      } else {
        panel.innerHTML = ""
        appendPreviewFlag(panel, "Preview failed: " + (data.error || "Unknown error"))
        panel.hidden = false
        previewBtn.textContent = "Preview"
      }
    } catch (err: any) {
      panel.innerHTML = ""
      appendPreviewFlag(panel, "Preview failed: " + err.message)
      panel.hidden = false
      previewBtn.textContent = "Preview"
    }
    previewBtn.disabled = false
  }

  async function searchWiki() {
    if (!wikiInput || !wikiBtn) return
    const query = wikiInput.value.trim()
    if (!query) return
    wikiBtn.disabled = true
    wikiBtn.textContent = "Searching..."
    clearCardStatus(wikiStatus)
    if (wikiResults) wikiResults.innerHTML = ""
    try {
      const res = await fetch("/api/wikipedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query }),
      })
      const data = await res.json()
      if (data.success) {
        renderWikiResults(data.results || [])
      } else {
        showCardStatus(wikiStatus, "Search failed: " + (data.error || "Unknown error"), "error")
      }
    } catch (err: any) {
      showCardStatus(wikiStatus, "Search failed: " + err.message, "error")
    }
    wikiBtn.disabled = false
    wikiBtn.textContent = "Search"
  }

  async function importWikiArticle(title: string, btn: HTMLButtonElement) {
    btn.disabled = true
    btn.textContent = "Importing..."
    clearCardStatus(wikiStatus)
    showCardStatus(wikiStatus, 'Importing "' + title + '"...', "pending")
    try {
      const res = await fetch("/api/wikipedia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", title }),
      })
      const data = await res.json()
      if (data.success) {
        showCardStatus(
          wikiStatus,
          '"' + (data.title || title) + '" imported. ' + ACQUISITION_HINT,
          "success",
        )
        // Leave the button disabled — the article is already queued. Relabel
        // so the row reads as done rather than clickable.
        btn.textContent = "Imported \u2713"
      } else {
        showCardStatus(wikiStatus, "Import failed: " + (data.error || "Unknown error"), "error")
        btn.disabled = false
        btn.textContent = "Import"
      }
    } catch (err: any) {
      showCardStatus(wikiStatus, "Import failed: " + err.message, "error")
      btn.disabled = false
      btn.textContent = "Import"
    }
  }

  if (wikiBtn) {
    wikiBtn.addEventListener("click", searchWiki)
  }
  if (wikiInput) {
    wikiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        searchWiki()
      }
    })
  }
})
