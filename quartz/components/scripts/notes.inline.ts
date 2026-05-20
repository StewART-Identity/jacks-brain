/**
 * Notes capture form — client behavior.
 *
 * Mounts under the "nav" event so SPA navigation re-binds handlers when
 * the user lands on /reflect/notes from elsewhere on the site. The
 * pattern matches uploadZone.inline.ts and the rest of the codebase.
 *
 * State model (kept on closure variables rather than a global store —
 * the form has one editor and one modal at a time, no need for more):
 *   editingSlug   string | null   non-null = updating an existing note
 *   pendingDelete string | null   non-null = the modal is open for this slug
 */
document.addEventListener("nav", () => {
  const root = document.getElementById("notes-app")
  if (!root) return // Not on the notes page.

  /* ───── DOM refs ────────────────────────────────────────────────── */
  const titleInput = document.getElementById("note-title") as HTMLInputElement | null
  const tagsInput = document.getElementById("note-tags") as HTMLInputElement | null
  const bodyInput = document.getElementById("note-body") as HTMLTextAreaElement | null
  const preview = document.getElementById("note-preview") as HTMLElement | null
  const saveBtn = document.getElementById("note-save-btn") as HTMLButtonElement | null
  const saveStatus = document.getElementById("note-save-status") as HTMLElement | null
  const captureHeading = document.getElementById("notes-capture-heading") as HTMLElement | null

  const tabEdit = document.getElementById("notes-tab-edit") as HTMLButtonElement | null
  const tabPreview = document.getElementById("notes-tab-preview") as HTMLButtonElement | null
  const paneEdit = document.getElementById("notes-pane-edit") as HTMLElement | null
  const panePreview = document.getElementById("notes-pane-preview") as HTMLElement | null

  const list = document.getElementById("notes-list") as HTMLElement | null

  const modal = document.getElementById("notes-delete-modal") as HTMLElement | null
  const modalTarget = document.getElementById("notes-delete-modal-target") as HTMLElement | null
  const modalCancel = document.getElementById("notes-delete-cancel") as HTMLButtonElement | null
  const modalConfirm = document.getElementById("notes-delete-confirm") as HTMLButtonElement | null

  if (
    !titleInput ||
    !tagsInput ||
    !bodyInput ||
    !preview ||
    !saveBtn ||
    !saveStatus ||
    !tabEdit ||
    !tabPreview ||
    !paneEdit ||
    !panePreview ||
    !list ||
    !modal ||
    !modalTarget ||
    !modalCancel ||
    !modalConfirm
  ) {
    return
  }

  /* ───── State ──────────────────────────────────────────────────── */
  let editingSlug: string | null = null
  let pendingDelete: string | null = null

  /* ───── Status helpers (mirrors uploadZone pattern) ─────────────── */
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

  /* ───── Markdown preview ────────────────────────────────────────── */

  /**
   * Minimal markdown renderer. Handles the common shapes — headings,
   * paragraphs, bold/italic/code, unordered + ordered lists, blockquotes,
   * [[wikilinks]] (rendered as styled spans so they're visually distinct
   * even though they don't resolve in preview).
   *
   * NOT a substitute for the real Quartz pipeline at build time. The
   * goal is "does this look approximately right before I save" — Quartz
   * will apply the real transform once published.
   */
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
      // Wikilinks: [[Page Name]] → styled span
      out = out.replace(
        /\[\[([^\]]+)\]\]/g,
        (_m, p) => `<span class="notes-wikilink">${p}</span>`,
      )
      // Inline code
      out = out.replace(/`([^`]+)`/g, (_m, p) => `<code>${p}</code>`)
      // Bold
      out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // Italic
      out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      // #hashtags as styled inline spans
      out = out.replace(/(^|\s)(#[a-zA-Z][\w-]*)/g, '$1<span class="notes-hashtag">$2</span>')
      return out
    }

    for (const raw of lines) {
      const line = raw

      // Fenced code blocks ```
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

      // Headings
      const h = line.match(/^(#{1,6})\s+(.*)$/)
      if (h) {
        closeLists()
        const level = h[1].length
        out.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`)
        continue
      }

      // Blockquote
      if (line.startsWith("> ")) {
        if (!inBlockquote) {
          closeLists()
          out.push("<blockquote>")
          inBlockquote = true
        }
        out.push(`<p>${inlineFormat(line.slice(2))}</p>`)
        continue
      }

      // Unordered list
      if (line.match(/^[-*+]\s+/)) {
        if (!inUl) {
          closeLists()
          out.push("<ul>")
          inUl = true
        }
        out.push(`<li>${inlineFormat(line.replace(/^[-*+]\s+/, ""))}</li>`)
        continue
      }

      // Ordered list
      if (line.match(/^\d+\.\s+/)) {
        if (!inOl) {
          closeLists()
          out.push("<ol>")
          inOl = true
        }
        out.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ""))}</li>`)
        continue
      }

      // Plain paragraph
      closeLists()
      out.push(`<p>${inlineFormat(line)}</p>`)
    }

    closeLists()
    if (inCodeBlock && codeBuffer.length > 0) {
      out.push("<pre><code>" + codeBuffer.map(escapeHtml).join("\n") + "</code></pre>")
    }

    return out.join("\n")
  }

  function refreshPreview() {
    preview!.innerHTML = renderMarkdown(bodyInput!.value)
  }

  /* ───── Tab toggle ──────────────────────────────────────────────── */
  function selectTab(which: "edit" | "preview") {
    const editActive = which === "edit"
    tabEdit!.classList.toggle("active", editActive)
    tabPreview!.classList.toggle("active", !editActive)
    tabEdit!.setAttribute("aria-selected", editActive ? "true" : "false")
    tabPreview!.setAttribute("aria-selected", editActive ? "false" : "true")
    if (editActive) {
      paneEdit!.hidden = false
      panePreview!.hidden = true
      bodyInput!.focus()
    } else {
      paneEdit!.hidden = true
      panePreview!.hidden = false
      refreshPreview()
    }
  }
  tabEdit.addEventListener("click", () => selectTab("edit"))
  tabPreview.addEventListener("click", () => selectTab("preview"))
  // Arrow-key nav between tabs (ARIA tabs pattern).
  function tabKeydown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    if (e.target === tabEdit) {
      tabPreview!.focus()
      selectTab("preview")
    } else {
      tabEdit!.focus()
      selectTab("edit")
    }
  }
  tabEdit.addEventListener("keydown", tabKeydown)
  tabPreview.addEventListener("keydown", tabKeydown)

  /* ───── Form state helpers ─────────────────────────────────────── */
  function enterEditMode(note: {
    slug: string
    title: string
    tags: string[]
    body: string
  }) {
    editingSlug = note.slug
    titleInput!.value = note.title
    tagsInput!.value = note.tags.join(", ")
    bodyInput!.value = note.body
    if (captureHeading) {
      captureHeading.textContent = "Edit note"
    }
    saveBtn!.textContent = "Update note"
    selectTab("edit")
    clearStatus(saveStatus!)
    // Scroll to top of the editor so the user sees the title field.
    root!.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function exitEditMode() {
    editingSlug = null
    titleInput!.value = ""
    tagsInput!.value = ""
    bodyInput!.value = ""
    if (captureHeading) {
      captureHeading.textContent = "New note"
    }
    saveBtn!.textContent = "Save note"
    selectTab("edit")
  }

  /* ───── Save (create or update) ─────────────────────────────────── */
  async function saveNote() {
    const title = titleInput!.value.trim()
    const tagsRaw = tagsInput!.value.trim()
    const body = bodyInput!.value.trim()

    if (!title) {
      showStatus(saveStatus!, "Title is required.", "error")
      titleInput!.focus()
      return
    }
    if (!body) {
      showStatus(saveStatus!, "Note body is required.", "error")
      bodyInput!.focus()
      return
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    saveBtn!.disabled = true
    const originalLabel = saveBtn!.textContent
    saveBtn!.textContent = editingSlug ? "Updating…" : "Saving…"
    showStatus(saveStatus!, "Committing to the repo…", "pending")

    try {
      const url = editingSlug ? `/api/notes/${editingSlug}` : "/api/notes"
      const method = editingSlug ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tags, body }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        const detail = data.details ? " — " + data.details : ""
        showStatus(saveStatus!, "Save failed: " + (data.error || "Unknown error") + detail, "error")
        saveBtn!.disabled = false
        saveBtn!.textContent = originalLabel || (editingSlug ? "Update note" : "Save note")
        return
      }

      showStatus(
        saveStatus!,
        editingSlug
          ? "Note updated. Page rebuilds in ≈30s — refresh then to see the published version."
          : "Note saved. Page rebuilds in ≈30s — refresh then to see the published version.",
        "success",
      )

      // Optimistically refresh the recent list. Server reflects the
      // commit immediately even though the rendered page lags behind.
      await loadRecentNotes()
      exitEditMode()
      saveBtn!.disabled = false
      saveBtn!.textContent = "Save note"
    } catch (err: any) {
      showStatus(saveStatus!, "Save failed: " + err.message, "error")
      saveBtn!.disabled = false
      saveBtn!.textContent = originalLabel || (editingSlug ? "Update note" : "Save note")
    }
  }
  saveBtn.addEventListener("click", saveNote)

  /* ───── Recent notes list ──────────────────────────────────────── */
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

  function renderNoteCard(note: {
    slug: string
    title: string
    tags: string[]
    created: string
    modified: string
  }): HTMLElement {
    const card = document.createElement("div")
    card.className = "notes-list-item"
    card.dataset.slug = note.slug

    const header = document.createElement("div")
    header.className = "notes-list-item-header"

    const link = document.createElement("a")
    link.className = "notes-list-item-title"
    link.href = `/reflect/notes/${note.slug}`
    link.textContent = note.title || note.slug
    header.appendChild(link)

    const actions = document.createElement("div")
    actions.className = "notes-list-item-actions"

    const editBtn = document.createElement("button")
    editBtn.type = "button"
    editBtn.className = "notes-secondary-btn notes-icon-btn"
    editBtn.textContent = "Edit"
    editBtn.setAttribute("aria-label", `Edit note: ${note.title}`)
    editBtn.addEventListener("click", () => beginEdit(note.slug))
    actions.appendChild(editBtn)

    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.className = "notes-danger-btn notes-icon-btn"
    deleteBtn.textContent = "Delete"
    deleteBtn.setAttribute("aria-label", `Delete note: ${note.title}`)
    deleteBtn.addEventListener("click", () => openDeleteModal(note.slug, note.title))
    actions.appendChild(deleteBtn)

    header.appendChild(actions)
    card.appendChild(header)

    const meta = document.createElement("div")
    meta.className = "notes-list-item-meta"
    const dateText = formatDate(note.modified || note.created)
    if (dateText) {
      const time = document.createElement("time")
      time.dateTime = note.modified || note.created
      time.textContent = dateText
      meta.appendChild(time)
    }
    if (note.tags.length > 0) {
      const tagWrap = document.createElement("span")
      tagWrap.className = "notes-list-item-tags"
      for (const t of note.tags) {
        const pill = document.createElement("span")
        pill.className = "notes-tag-pill"
        pill.textContent = t
        tagWrap.appendChild(pill)
      }
      meta.appendChild(tagWrap)
    }
    card.appendChild(meta)

    return card
  }

  async function loadRecentNotes() {
    try {
      const res = await fetch("/api/notes")
      const data = await res.json()
      if (!res.ok) {
        list!.innerHTML =
          '<p class="muted notes-empty-state">Couldn\'t load notes — ' +
          (data.error || "unknown error") +
          "</p>"
        return
      }
      const notes: Array<{
        slug: string
        title: string
        tags: string[]
        created: string
        modified: string
      }> = data.notes || []
      if (notes.length === 0) {
        list!.innerHTML =
          '<p class="muted notes-empty-state">No notes yet. Capture your first one above.</p>'
        return
      }
      list!.innerHTML = ""
      for (const note of notes) {
        list!.appendChild(renderNoteCard(note))
      }
    } catch (err: any) {
      list!.innerHTML =
        '<p class="muted notes-empty-state">Couldn\'t load notes — ' + err.message + "</p>"
    }
  }

  /* ───── Edit flow ───────────────────────────────────────────────── */
  async function beginEdit(slug: string) {
    try {
      const res = await fetch(`/api/notes/${slug}`)
      const data = await res.json()
      if (!res.ok) {
        showStatus(saveStatus!, "Couldn't load note: " + (data.error || "unknown error"), "error")
        return
      }
      enterEditMode({
        slug: data.slug,
        title: data.title,
        tags: data.tags || [],
        body: data.body || "",
      })
    } catch (err: any) {
      showStatus(saveStatus!, "Couldn't load note: " + err.message, "error")
    }
  }

  /* ───── Delete modal ────────────────────────────────────────────── */
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
      const res = await fetch(`/api/notes/${slug}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        modalConfirm!.disabled = false
        modalConfirm!.textContent = "Delete note"
        showStatus(saveStatus!, "Delete failed: " + (data.error || "unknown error"), "error")
        closeDeleteModal()
        return
      }
      // Remove the card from the list immediately. The Pages rebuild
      // will remove the actual page in ≈30s, but the inbox view is
      // accurate right away.
      const card = list!.querySelector<HTMLElement>(`[data-slug="${slug}"]`)
      if (card) card.remove()
      if (list!.children.length === 0) {
        list!.innerHTML =
          '<p class="muted notes-empty-state">No notes yet. Capture your first one above.</p>'
      }
      // If we were editing this note when it got deleted, reset the form.
      if (editingSlug === slug) {
        exitEditMode()
      }
      modalConfirm!.disabled = false
      modalConfirm!.textContent = "Delete note"
      closeDeleteModal()
      showStatus(saveStatus!, "Note deleted. Page disappears on next build (≈30s).", "success")
    } catch (err: any) {
      modalConfirm!.disabled = false
      modalConfirm!.textContent = "Delete note"
      showStatus(saveStatus!, "Delete failed: " + err.message, "error")
      closeDeleteModal()
    }
  }
  modalCancel.addEventListener("click", closeDeleteModal)
  modalConfirm.addEventListener("click", confirmDelete)
  // Backdrop click dismisses.
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeDeleteModal()
  })
  // Esc dismisses.
  function escHandler(e: KeyboardEvent) {
    if (e.key === "Escape" && !modal!.hidden) closeDeleteModal()
  }
  document.addEventListener("keydown", escHandler)

  /* ───── Cleanup on SPA away-nav ────────────────────────────────── */
  // The "nav" event fires both on arrival and departure. Quartz's
  // convention is to register cleanup with addEventListener("nav",
  // …, { once: true }) — but for the notes page the heavy state
  // (modal, edit mode) is tied to DOM that gets torn down anyway,
  // so the only listener that *outlives* the page is the document-level
  // Esc handler. Remove it on departure.
  window.addCleanup?.(() => {
    document.removeEventListener("keydown", escHandler)
  })

  /* ───── Initial load ───────────────────────────────────────────── */
  refreshPreview()
  loadRecentNotes()
})
