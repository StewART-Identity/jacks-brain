/**
 * Notes capture form — client behavior for /notes/write.
 *
 * Split half of the original notes.inline.ts. Handles only the form:
 * markdown preview, Edit/Preview tabs, and the POST /api/notes save
 * path. The list-and-edit side lives in notesList.inline.ts.
 *
 * Mounts under the "nav" event so SPA navigation re-binds handlers
 * when the user lands on /notes/write from elsewhere on the site.
 */
document.addEventListener("nav", () => {
  const root = document.getElementById("note-form-app")
  if (!root) return // Not on the form page.

  /* ───── DOM refs ────────────────────────────────────────────────── */
  const titleInput = document.getElementById("note-title") as HTMLInputElement | null
  const tagsInput = document.getElementById("note-tags") as HTMLInputElement | null
  const bodyInput = document.getElementById("note-body") as HTMLTextAreaElement | null
  const preview = document.getElementById("note-preview") as HTMLElement | null
  const saveBtn = document.getElementById("note-save-btn") as HTMLButtonElement | null
  const saveStatus = document.getElementById("note-save-status") as HTMLElement | null

  const tabEdit = document.getElementById("notes-tab-edit") as HTMLButtonElement | null
  const tabPreview = document.getElementById("notes-tab-preview") as HTMLButtonElement | null
  const paneEdit = document.getElementById("notes-pane-edit") as HTMLElement | null
  const panePreview = document.getElementById("notes-pane-preview") as HTMLElement | null

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
    !panePreview
  ) {
    return
  }

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

  /* ───── Save (create-only) ──────────────────────────────────────── */
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
    saveBtn!.textContent = "Saving…"
    showStatus(saveStatus!, "Committing to the repo…", "pending")

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tags, body }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        const detail = data.details ? " — " + data.details : ""
        showStatus(
          saveStatus!,
          "Save failed: " + (data.error || "Unknown error") + detail,
          "error",
        )
        saveBtn!.disabled = false
        saveBtn!.textContent = "Save note"
        return
      }

      // Success — clear the form so the next capture can start fresh.
      titleInput!.value = ""
      tagsInput!.value = ""
      bodyInput!.value = ""
      selectTab("edit")
      refreshPreview()

      showStatus(
        saveStatus!,
        'Note saved. Visit /notes/browse to see it once the page rebuilds (~30s).',
        "success",
      )

      saveBtn!.disabled = false
      saveBtn!.textContent = "Save note"
    } catch (err: any) {
      showStatus(saveStatus!, "Save failed: " + err.message, "error")
      saveBtn!.disabled = false
      saveBtn!.textContent = "Save note"
    }
  }
  saveBtn.addEventListener("click", saveNote)

  /* ───── Initial render ──────────────────────────────────────────── */
  refreshPreview()
})
