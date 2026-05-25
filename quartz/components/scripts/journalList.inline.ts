/**
 * Journal browse-and-edit list — client behavior for /journal/browse.
 *
 * Mirror of notesList.inline.ts. Renders the list of all entries from
 * GET /api/journal, with each entry as an expandable card.
 *
 * Mounts under the "nav" event so SPA navigation re-binds handlers when
 * the user lands on /journal/browse from elsewhere on the site.
 */
document.addEventListener("nav", () => {
  const root = document.getElementById("journal-list-app")
  if (!root) return // Not on the journal browse page.

  /* ───── DOM refs ────────────────────────────────────────────────── */
  const list = document.getElementById("journal-list") as HTMLElement | null
  const modal = document.getElementById("journal-delete-modal") as HTMLElement | null
  const modalTarget = document.getElementById("journal-delete-modal-target") as HTMLElement | null
  const modalCancel = document.getElementById("journal-delete-cancel") as HTMLButtonElement | null
  const modalConfirm = document.getElementById("journal-delete-confirm") as HTMLButtonElement | null

  if (!list || !modal || !modalTarget || !modalCancel || !modalConfirm) {
    return
  }

  /* ───── Page-level state ───────────────────────────────────────── */
  let pendingDelete: string | null = null

  /* ───── Status helpers ─────────────────────────────────────────── */
  function showStatus(target: HTMLElement, msg: string, type: "pending" | "success" | "error") {
    target.style.display = "block"
    target.innerHTML = ""
    const div = document.createElement("div")
    div.className = "card-status-msg " + type
    div.textContent = msg
    target.appendChild(div)
  }
  function clearStatus(target: HTMLElement) {
    target.innerHTML = ""
    target.style.display = "none"
  }

  /* ───── Markdown preview ───────────────────────────────────────── */
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function renderMarkdown(src: string): string {
    if (!src.trim()) {
      return '<p class="muted">Nothing to preview yet.</p>'
    }
    const lines = src.split(/\r?\n/)
    const out: string[] = []
    let inUl = false
    let inOl = false
    let inBlockquote = false
    let inCodeBlock = false
    let codeBuffer: string[] = []

    function closeLists() {
      if (inUl) {
        out.push("</ul>")
        inUl = false
      }
      if (inOl) {
        out.push("</ol>")
        inOl = false
      }
      if (inBlockquote) {
        out.push("</blockquote>")
        inBlockquote = false
      }
    }

    function inlineFormat(s: string): string {
      let out = escapeHtml(s)
      out = out.replace(
        /\[\[([^\]]+)\]\]/g,
        (_m, p) => `<span class="notes-wikilink">${p}</span>`,
      )
      out = out.replace(/`([^`]+)`/g, (_m, p) => `<code>${p}</code>`)
      out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      out = out.replace(/(^|\s)(#[a-zA-Z][\w-]*)/g, '$1<span class="notes-hashtag">$2</span>')
      return out
    }

    for (const raw of lines) {
      const line = raw

      if (line.startsWith("```")) {
        if (inCodeBlock) {
          out.push("<pre><code>" + codeBuffer.map(escapeHtml).join("\n") + "</code></pre>")
          codeBuffer = []
          inCodeBlock = false
        } else {
          closeLists()
          inCodeBlock = true
        }
        continue
      }
      if (inCodeBlock) {
        codeBuffer.push(line)
        continue
      }

      if (!line.trim()) {
        closeLists()
        continue
      }

      const h = line.match(/^(#{1,6})\s+(.*)$/)
      if (h) {
        closeLists()
        const level = h[1].length
        out.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`)
        continue
      }

      if (line.startsWith("> ")) {
        if (!inBlockquote) {
          closeLists()
          out.push("<blockquote>")
          inBlockquote = true
        }
        out.push(`<p>${inlineFormat(line.slice(2))}</p>`)
        continue
      }

      if (line.match(/^[-*+]\s+/)) {
        if (!inUl) {
          closeLists()
          out.push("<ul>")
          inUl = true
        }
        out.push(`<li>${inlineFormat(line.replace(/^[-*+]\s+/, ""))}</li>`)
        continue
      }

      if (line.match(/^\d+\.\s+/)) {
        if (!inOl) {
          closeLists()
          out.push("<ol>")
          inOl = true
        }
        out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ""))}</li>`)
        continue
      }

      closeLists()
      out.push(`<p>${inlineFormat(line)}</p>`)
    }

    closeLists()
    if (inCodeBlock && codeBuffer.length > 0) {
      out.push("<pre><code>" + codeBuffer.map(escapeHtml).join("\n") + "</code></pre>")
    }

    return out.join("\n")
  }

  /* ───── Card rendering ─────────────────────────────────────────── */
  function formatDate(iso: string): string {
    if (!iso) return ""
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ""
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return ""
    }
  }

  interface JournalSummary {
    slug: string
    title: string
    tags: string[]
    created: string
    modified: string
  }

  function renderMetaRow(card: HTMLElement, entry: JournalSummary) {
    const meta = card.querySelector<HTMLElement>(".notes-list-item-meta")
    if (!meta) return
    meta.innerHTML = ""
    const dateText = formatDate(entry.modified || entry.created)
    if (dateText) {
      const time = document.createElement("time")
      time.dateTime = entry.modified || entry.created
      time.textContent = dateText
      meta.appendChild(time)
    }
    if (entry.tags.length > 0) {
      const tagWrap = document.createElement("span")
      tagWrap.className = "notes-list-item-tags"
      for (const t of entry.tags) {
        const pill = document.createElement("span")
        pill.className = "notes-tag-pill"
        pill.textContent = t
        tagWrap.appendChild(pill)
      }
      meta.appendChild(tagWrap)
    }
  }

  function renderEntryCard(entry: JournalSummary): HTMLElement {
    const card = document.createElement("div")
    card.className = "notes-list-item"
    card.dataset.slug = entry.slug
    card.dataset.editing = "false"

    const header = document.createElement("div")
    header.className = "notes-list-item-header"

    const link = document.createElement("a")
    link.className = "notes-list-item-title"
    link.href = `/journal/entries/${entry.slug}`
    link.textContent = entry.title || entry.slug
    header.appendChild(link)

    const actions = document.createElement("div")
    actions.className = "notes-list-item-actions"

    const editBtn = document.createElement("button")
    editBtn.type = "button"
    editBtn.className = "notes-secondary-btn notes-icon-btn"
    editBtn.textContent = "Edit"
    editBtn.setAttribute("aria-label", `Edit entry: ${entry.title}`)
    editBtn.addEventListener("click", () => beginEdit(card, entry.slug))
    actions.appendChild(editBtn)

    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.className = "notes-danger-btn notes-icon-btn"
    deleteBtn.textContent = "Delete"
    deleteBtn.setAttribute("aria-label", `Delete entry: ${entry.title}`)
    deleteBtn.addEventListener("click", () => openDeleteModal(entry.slug, entry.title))
    actions.appendChild(deleteBtn)

    header.appendChild(actions)
    card.appendChild(header)

    const meta = document.createElement("div")
    meta.className = "notes-list-item-meta"
    card.appendChild(meta)
    renderMetaRow(card, entry)

    const editor = document.createElement("div")
    editor.className = "notes-list-item-editor"
    editor.hidden = true
    card.appendChild(editor)

    return card
  }

  async function loadAllEntries() {
    try {
      const res = await fetch("/api/journal")
      const data = await res.json()
      if (!res.ok) {
        list!.innerHTML =
          '<p class="muted notes-empty-state">Couldn\'t load entries — ' +
          (data.error || "unknown error") +
          "</p>"
        return
      }
      const entries: JournalSummary[] = data.entries || []
      if (entries.length === 0) {
        list!.innerHTML =
          '<p class="muted notes-empty-state">No entries yet. Capture your first one in <a href="/journal/write">Write</a>.</p>'
        return
      }
      list!.innerHTML = ""
      for (const entry of entries) {
        list!.appendChild(renderEntryCard(entry))
      }
    } catch (err: any) {
      list!.innerHTML =
        '<p class="muted notes-empty-state">Couldn\'t load entries — ' + err.message + "</p>"
    }
  }

  /* ───── Per-card edit flow ─────────────────────────────────────── */
  async function beginEdit(card: HTMLElement, slug: string) {
    if (card.dataset.editing === "true") return

    const editor = card.querySelector<HTMLElement>(".notes-list-item-editor")
    const editBtn = card.querySelector<HTMLButtonElement>(".notes-list-item-actions .notes-secondary-btn")
    if (!editor || !editBtn) return

    editBtn.disabled = true
    editBtn.textContent = "Loading…"

    try {
      const res = await fetch(`/api/journal/${slug}`)
      const data = await res.json()
      if (!res.ok) {
        editBtn.disabled = false
        editBtn.textContent = "Edit"
        alert(`Couldn't load entry: ${data.error || "unknown error"}`)
        return
      }

      const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "_")
      editor.innerHTML = ""
      editor.dataset.slug = slug

      const titleInput = document.createElement("input")
      titleInput.type = "text"
      titleInput.className = "notes-text-input"
      titleInput.id = `journal-title-${safeSlug}`
      titleInput.placeholder = "Title"
      titleInput.setAttribute("aria-label", "Journal entry title")
      titleInput.value = data.title || ""

      const tagsInput = document.createElement("input")
      tagsInput.type = "text"
      tagsInput.className = "notes-text-input notes-tags-input"
      tagsInput.id = `journal-tags-${safeSlug}`
      tagsInput.placeholder = "Tags (comma-separated, optional)"
      tagsInput.setAttribute("aria-label", "Journal entry tags")
      tagsInput.value = (data.tags || []).join(", ")

      const tabs = document.createElement("div")
      tabs.className = "notes-tabs"
      tabs.setAttribute("role", "tablist")
      tabs.setAttribute("aria-label", "Editor mode")

      const tabEdit = document.createElement("button")
      tabEdit.type = "button"
      tabEdit.className = "notes-tab active"
      tabEdit.id = `journal-tab-edit-${safeSlug}`
      tabEdit.setAttribute("role", "tab")
      tabEdit.setAttribute("aria-selected", "true")
      tabEdit.setAttribute("aria-controls", `journal-pane-edit-${safeSlug}`)
      tabEdit.textContent = "Edit"

      const tabPreview = document.createElement("button")
      tabPreview.type = "button"
      tabPreview.className = "notes-tab"
      tabPreview.id = `journal-tab-preview-${safeSlug}`
      tabPreview.setAttribute("role", "tab")
      tabPreview.setAttribute("aria-selected", "false")
      tabPreview.setAttribute("aria-controls", `journal-pane-preview-${safeSlug}`)
      tabPreview.textContent = "Preview"

      tabs.appendChild(tabEdit)
      tabs.appendChild(tabPreview)

      const paneEdit = document.createElement("div")
      paneEdit.className = "notes-pane notes-pane-edit"
      paneEdit.id = `journal-pane-edit-${safeSlug}`
      paneEdit.setAttribute("role", "tabpanel")
      paneEdit.setAttribute("aria-labelledby", `journal-tab-edit-${safeSlug}`)

      const bodyInput = document.createElement("textarea")
      bodyInput.className = "notes-textarea"
      bodyInput.id = `journal-body-${safeSlug}`
      bodyInput.rows = 10
      bodyInput.placeholder = "Entry body"
      bodyInput.setAttribute("aria-label", "Journal entry body")
      bodyInput.value = data.body || ""
      paneEdit.appendChild(bodyInput)

      const panePreview = document.createElement("div")
      panePreview.className = "notes-pane notes-pane-preview"
      panePreview.id = `journal-pane-preview-${safeSlug}`
      panePreview.setAttribute("role", "tabpanel")
      panePreview.setAttribute("aria-labelledby", `journal-tab-preview-${safeSlug}`)
      panePreview.hidden = true

      const preview = document.createElement("div")
      preview.className = "notes-preview"
      preview.id = `journal-preview-${safeSlug}`
      preview.setAttribute("aria-live", "polite")
      preview.setAttribute("aria-atomic", "false")
      preview.innerHTML = renderMarkdown(bodyInput.value)
      panePreview.appendChild(preview)

      const actionsRow = document.createElement("div")
      actionsRow.className = "notes-controls notes-editor-actions"

      const saveBtn = document.createElement("button")
      saveBtn.type = "button"
      saveBtn.className = "notes-primary-btn"
      saveBtn.textContent = "Save changes"

      const cancelBtn = document.createElement("button")
      cancelBtn.type = "button"
      cancelBtn.className = "notes-secondary-btn"
      cancelBtn.textContent = "Cancel"

      actionsRow.appendChild(saveBtn)
      actionsRow.appendChild(cancelBtn)

      const statusDiv = document.createElement("div")
      statusDiv.id = `journal-edit-status-${safeSlug}`
      statusDiv.className = "card-status"
      statusDiv.style.display = "none"

      editor.appendChild(titleInput)
      editor.appendChild(tagsInput)
      editor.appendChild(tabs)
      editor.appendChild(paneEdit)
      editor.appendChild(panePreview)
      editor.appendChild(actionsRow)
      editor.appendChild(statusDiv)

      function selectTab(which: "edit" | "preview") {
        const editActive = which === "edit"
        tabEdit.classList.toggle("active", editActive)
        tabPreview.classList.toggle("active", !editActive)
        tabEdit.setAttribute("aria-selected", editActive ? "true" : "false")
        tabPreview.setAttribute("aria-selected", editActive ? "false" : "true")
        if (editActive) {
          paneEdit.hidden = false
          panePreview.hidden = true
          bodyInput.focus()
        } else {
          paneEdit.hidden = true
          panePreview.hidden = false
          preview.innerHTML = renderMarkdown(bodyInput.value)
        }
      }
      tabEdit.addEventListener("click", () => selectTab("edit"))
      tabPreview.addEventListener("click", () => selectTab("preview"))
      function tabKeydown(e: KeyboardEvent) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
        e.preventDefault()
        if (e.target === tabEdit) {
          tabPreview.focus()
          selectTab("preview")
        } else {
          tabEdit.focus()
          selectTab("edit")
        }
      }
      tabEdit.addEventListener("keydown", tabKeydown)
      tabPreview.addEventListener("keydown", tabKeydown)

      saveBtn.addEventListener("click", async () => {
        const title = titleInput.value.trim()
        const tagsRaw = tagsInput.value.trim()
        const body = bodyInput.value.trim()

        if (!title) {
          showStatus(statusDiv, "Title is required.", "error")
          titleInput.focus()
          return
        }
        if (!body) {
          showStatus(statusDiv, "Entry body is required.", "error")
          bodyInput.focus()
          return
        }

        const tags = tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)

        saveBtn.disabled = true
        cancelBtn.disabled = true
        saveBtn.textContent = "Saving…"
        showStatus(statusDiv, "Committing to the repo…", "pending")

        try {
          const res = await fetch(`/api/journal/${slug}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, tags, body }),
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            const detail = data.details ? " — " + data.details : ""
            showStatus(
              statusDiv,
              "Save failed: " + (data.error || "Unknown error") + detail,
              "error",
            )
            saveBtn.disabled = false
            cancelBtn.disabled = false
            saveBtn.textContent = "Save changes"
            return
          }

          const titleLink = card.querySelector<HTMLAnchorElement>(".notes-list-item-title")
          if (titleLink) titleLink.textContent = title || slug
          renderMetaRow(card, {
            slug,
            title,
            tags,
            created: data.created || "",
            modified: data.modified || "",
          })
          showStatus(statusDiv, "Saved. Rebuild ≈30s.", "success")
          setTimeout(() => collapseEditor(card), 700)
        } catch (err: any) {
          showStatus(statusDiv, "Save failed: " + err.message, "error")
          saveBtn.disabled = false
          cancelBtn.disabled = false
          saveBtn.textContent = "Save changes"
        }
      })

      cancelBtn.addEventListener("click", () => collapseEditor(card))

      editor.hidden = false
      card.dataset.editing = "true"
      editBtn.disabled = false
      editBtn.textContent = "Editing…"
      titleInput.focus()
      titleInput.select()
    } catch (err: any) {
      editBtn.disabled = false
      editBtn.textContent = "Edit"
      alert(`Couldn't load entry: ${err.message}`)
    }
  }

  function collapseEditor(card: HTMLElement) {
    const editor = card.querySelector<HTMLElement>(".notes-list-item-editor")
    const editBtn = card.querySelector<HTMLButtonElement>(".notes-list-item-actions .notes-secondary-btn")
    if (!editor) return
    editor.hidden = true
    editor.innerHTML = ""
    card.dataset.editing = "false"
    if (editBtn) {
      editBtn.disabled = false
      editBtn.textContent = "Edit"
    }
  }

  /* ───── Delete modal ───────────────────────────────────────────── */
  function openDeleteModal(slug: string, title: string) {
    pendingDelete = slug
    modalTarget!.textContent = `"${title}" `
    modal!.hidden = false
    document.body.classList.add("notes-modal-open")
    modalConfirm!.focus()
  }
  function closeDeleteModal() {
    pendingDelete = null
    modal!.hidden = true
    document.body.classList.remove("notes-modal-open")
  }
  async function confirmDelete() {
    if (!pendingDelete) return
    const slug = pendingDelete
    modalConfirm!.disabled = true
    modalConfirm!.textContent = "Deleting…"
    try {
      const res = await fetch(`/api/journal/${slug}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        modalConfirm!.disabled = false
        modalConfirm!.textContent = "Delete entry"
        alert(`Delete failed: ${data.error || "unknown error"}`)
        closeDeleteModal()
        return
      }
      const card = list!.querySelector<HTMLElement>(`[data-slug="${slug}"]`)
      if (card) card.remove()
      if (list!.children.length === 0) {
        list!.innerHTML =
          '<p class="muted notes-empty-state">No entries yet. Capture your first one in <a href="/journal/write">Write</a>.</p>'
      }
      modalConfirm!.disabled = false
      modalConfirm!.textContent = "Delete entry"
      closeDeleteModal()
    } catch (err: any) {
      modalConfirm!.disabled = false
      modalConfirm!.textContent = "Delete entry"
      alert(`Delete failed: ${err.message}`)
      closeDeleteModal()
    }
  }
  modalCancel.addEventListener("click", closeDeleteModal)
  modalConfirm.addEventListener("click", confirmDelete)
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeDeleteModal()
  })
  function escHandler(e: KeyboardEvent) {
    if (e.key === "Escape" && !modal!.hidden) closeDeleteModal()
  }
  document.addEventListener("keydown", escHandler)

  window.addCleanup?.(() => {
    document.removeEventListener("keydown", escHandler)
  })

  loadAllEntries()
})
