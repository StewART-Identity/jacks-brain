import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const LinksManager: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="links-app">
      <div id="links-status" class="links-status" style="display:none"></div>
      <div id="links-root" class="links-root">
        <p class="links-loading">Loading links…</p>
      </div>
      <div class="links-toolbar">
        <button id="links-add-section" class="links-btn links-btn-secondary" type="button">
          + Add section
        </button>
        <button id="links-save" class="links-btn links-btn-primary" type="button" disabled>
          Save changes
        </button>
      </div>
    </div>
  )
}

// All editor logic is inline so it ships with the page (matching NukeButton /
// UploadZone). State lives in a single in-memory object; the DOM is re-rendered
// from it after every mutation. Save serializes the whole structure to
// /api/links via POST. The blob SHA from GET is held in memory and refreshed
// from each successful save, so repeated saves work without a reload.
LinksManager.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("links-root")
  const statusEl = document.getElementById("links-status")
  const addSectionBtn = document.getElementById("links-add-section")
  const saveBtn = document.getElementById("links-save")
  if (!root || !addSectionBtn || !saveBtn) return

  // ---- state ----
  let data = { sections: [] }
  let sha = null
  let dirty = false

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9)
  }

  function setDirty(v) {
    dirty = v
    saveBtn.disabled = !v
    saveBtn.textContent = v ? "Save changes" : "Saved"
  }

  function showStatus(msg, kind) {
    statusEl.style.display = "block"
    statusEl.className = "links-status " + kind
    statusEl.textContent = msg
  }
  function clearStatus() {
    statusEl.style.display = "none"
    statusEl.textContent = ""
  }

  // ---- mutations ----
  function addSection() {
    data.sections.push({ id: uid("sec"), title: "New section", links: [] })
    setDirty(true); render()
  }
  function deleteSection(si) {
    if (!confirm("Delete this section and all its links?")) return
    data.sections.splice(si, 1); setDirty(true); render()
  }
  function moveSection(si, delta) {
    const ni = si + delta
    if (ni < 0 || ni >= data.sections.length) return
    const [s] = data.sections.splice(si, 1)
    data.sections.splice(ni, 0, s); setDirty(true); render()
  }
  function addLink(si) {
    data.sections[si].links.push({ id: uid("lnk"), label: "", url: "", description: "" })
    setDirty(true); render()
  }
  function deleteLink(si, li) {
    data.sections[si].links.splice(li, 1); setDirty(true); render()
  }
  function moveLink(si, li, delta) {
    const links = data.sections[si].links
    const ni = li + delta
    if (ni < 0 || ni >= links.length) return
    const [l] = links.splice(li, 1)
    links.splice(ni, 0, l); setDirty(true); render()
  }

  // ---- render ----
  // Built entirely with createElement + textContent / .value assignment.
  // Never innerHTML with user data — labels, URLs, and descriptions are
  // arbitrary text and must not be parsed as markup.
  function field(labelText, value, oninput, opts) {
    opts = opts || {}
    const wrap = document.createElement("label")
    wrap.className = "links-field"
    const span = document.createElement("span")
    span.className = "links-field-label"
    span.textContent = labelText
    const input = document.createElement(opts.textarea ? "textarea" : "input")
    if (!opts.textarea) input.type = "text"
    input.value = value || ""
    if (opts.placeholder) input.placeholder = opts.placeholder
    input.addEventListener("input", function () { oninput(input.value) })
    wrap.appendChild(span)
    wrap.appendChild(input)
    return wrap
  }

  function iconBtn(label, title, onclick, extraClass) {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "links-icon-btn" + (extraClass ? " " + extraClass : "")
    b.textContent = label
    b.title = title
    b.setAttribute("aria-label", title)
    b.addEventListener("click", onclick)
    return b
  }

  function render() {
    root.innerHTML = ""
    if (data.sections.length === 0) {
      const empty = document.createElement("p")
      empty.className = "links-empty"
      empty.textContent = "No sections yet. Add one to get started."
      root.appendChild(empty)
      return
    }

    data.sections.forEach(function (section, si) {
      const secEl = document.createElement("div")
      secEl.className = "links-section"

      // section header: title field + section controls
      const head = document.createElement("div")
      head.className = "links-section-head"

      const titleField = field("Section title", section.title, function (v) { section.title = v; setDirty(true) })
      titleField.classList.add("links-section-title")
      head.appendChild(titleField)

      const secCtrls = document.createElement("div")
      secCtrls.className = "links-section-ctrls"
      secCtrls.appendChild(iconBtn("\u2191", "Move section up", function () { moveSection(si, -1) }))
      secCtrls.appendChild(iconBtn("\u2193", "Move section down", function () { moveSection(si, 1) }))
      secCtrls.appendChild(iconBtn("\u2715", "Delete section", function () { deleteSection(si) }, "links-icon-danger"))
      head.appendChild(secCtrls)
      secEl.appendChild(head)

      // links
      section.links.forEach(function (link, li) {
        const linkEl = document.createElement("div")
        linkEl.className = "links-item"

        const fields = document.createElement("div")
        fields.className = "links-item-fields"
        fields.appendChild(field("Label", link.label, function (v) { link.label = v; setDirty(true) }, { placeholder: "Resume (PDF)" }))
        fields.appendChild(field("URL", link.url, function (v) { link.url = v; setDirty(true) }, { placeholder: "https://files.stewart-identity.com/..." }))
        fields.appendChild(field("Description", link.description, function (v) { link.description = v; setDirty(true) }, { textarea: true, placeholder: "Optional context shown under the label" }))
        linkEl.appendChild(fields)

        const ctrls = document.createElement("div")
        ctrls.className = "links-item-ctrls"
        ctrls.appendChild(iconBtn("\u2191", "Move link up", function () { moveLink(si, li, -1) }))
        ctrls.appendChild(iconBtn("\u2193", "Move link down", function () { moveLink(si, li, 1) }))
        ctrls.appendChild(iconBtn("\u2715", "Delete link", function () { deleteLink(si, li) }, "links-icon-danger"))
        linkEl.appendChild(ctrls)

        secEl.appendChild(linkEl)
      })

      const addLinkBtn = document.createElement("button")
      addLinkBtn.type = "button"
      addLinkBtn.className = "links-btn links-btn-secondary links-add-link"
      addLinkBtn.textContent = "+ Add link"
      addLinkBtn.addEventListener("click", function () { addLink(si) })
      secEl.appendChild(addLinkBtn)

      root.appendChild(secEl)
    })
  }

  // ---- load ----
  async function load() {
    try {
      const res = await fetch("/api/links")
      const j = await res.json()
      if (j.success) {
        data = j.data && Array.isArray(j.data.sections) ? j.data : { sections: [] }
        sha = j.sha
        if (j.warning) showStatus("Loaded, but the stored file was flagged: " + j.warning, "pending")
        render()
        setDirty(false)
        saveBtn.textContent = "Saved"
      } else {
        root.innerHTML = ""
        showStatus("Couldn't load links: " + (j.error || "unknown error"), "error")
      }
    } catch (err) {
      root.innerHTML = ""
      showStatus("Couldn't load links: " + err.message, "error")
    }
  }

  // ---- save ----
  async function save() {
    clearStatus()
    saveBtn.disabled = true
    saveBtn.textContent = "Saving…"
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: sha, data: data }),
      })
      const j = await res.json()
      if (j.success) {
        sha = j.sha
        setDirty(false)
        showStatus("Saved. The site will redeploy shortly to publish the changes.", "success")
      } else if (res.status === 409) {
        showStatus(j.error || "Conflict — reload and retry.", "error")
        saveBtn.disabled = false
        saveBtn.textContent = "Save changes"
      } else {
        showStatus("Save failed: " + (j.error || "unknown error"), "error")
        saveBtn.disabled = false
        saveBtn.textContent = "Save changes"
      }
    } catch (err) {
      showStatus("Save failed: " + err.message, "error")
      saveBtn.disabled = false
      saveBtn.textContent = "Save changes"
    }
  }

  addSectionBtn.addEventListener("click", addSection)
  saveBtn.addEventListener("click", save)
  load()
})
`

LinksManager.css = `
#links-app {
  max-width: 720px;
  padding-bottom: 2rem;
}
.links-loading, .links-empty {
  color: var(--gray);
  font-style: italic;
}
.links-section {
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  padding: 1rem 1rem 1.25rem;
  background: color-mix(in srgb, var(--light) 92%, transparent);
  margin-bottom: 1rem;
}
.links-section-head {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.links-section-title {
  flex: 1;
}
.links-section-ctrls, .links-item-ctrls {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}
.links-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}
.links-field-label {
  font-size: 0.78rem;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.links-field input, .links-field textarea {
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  background: var(--light);
  color: var(--darkgray);
  font-size: 0.95rem;
  font-family: inherit;
  box-sizing: border-box;
  width: 100%;
}
.links-field textarea {
  resize: vertical;
  min-height: 2.4rem;
}
.links-field input:focus, .links-field textarea:focus {
  outline: none;
  border-color: var(--secondary);
}
.links-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  background: var(--light);
  margin-top: 0.6rem;
}
.links-item-fields {
  flex: 1;
  min-width: 0;
}
.links-item-fields .links-field:last-child {
  margin-bottom: 0;
}
.links-icon-btn {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  background: transparent;
  color: var(--dark);
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.links-icon-btn:hover {
  border-color: var(--secondary);
}
.links-icon-danger:hover {
  border-color: #c46b6b;
  color: #c46b6b;
}
.links-add-link {
  margin-top: 0.7rem;
}
.links-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 1rem;
}
.links-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s ease, border-color 0.15s ease;
}
.links-btn-primary {
  background: var(--secondary);
  color: var(--light);
}
.links-btn-primary:hover {
  opacity: 0.85;
}
.links-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.links-btn-secondary {
  background: transparent;
  color: var(--dark);
  border: 1px solid var(--lightgray);
}
.links-btn-secondary:hover {
  border-color: var(--secondary);
}
.links-status {
  margin-bottom: 1rem;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
}
.links-status.pending { background: #6B4D1A; color: #D4AD5A; }
.links-status.success { background: #1B3F29; color: #7BBF95; }
.links-status.error { background: #6B2020; color: #C46B6B; }
`

export default (() => LinksManager) satisfies QuartzComponentConstructor
