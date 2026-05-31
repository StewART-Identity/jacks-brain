import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * LinksPreview — the approval queue, mounted at links/preview.
 *
 * This is the staging area in the publishing pipeline. It shows ONLY
 * pending items (status === "pending") — the things you've created or
 * edited in Manage that haven't yet been approved onto a landing page.
 * Each pending item carries two actions:
 *
 *   Approve   → flips status pending -> approved and saves. The item
 *               leaves this queue and joins its destination landing page
 *               (Public Content or Private Content). If its destination
 *               is "public", an auto-publish to the public R2 bucket is
 *               triggered (best-effort: if it fails, the approval still
 *               stuck locally and the page says so).
 *   Send back → returns you to Manage to revise the item. The item stays
 *               pending (Manage is where pending items are edited), so
 *               "send back" is the triage gesture: approve the ready ones,
 *               send the rest back for work.
 *
 * Data path: reads and writes through /api/links (the same Access-gated
 * endpoint Manage uses), so approval is a real persisted state change,
 * not a view-only toggle. The blob SHA from the GET is held and echoed on
 * each approve-save; the POST hands back the new SHA so sequential
 * approvals work without a reload.
 */
const LinksPreview: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="links-preview-app">
      <div id="lp-status" class="lp-status" style="display:none"></div>
      <div id="links-preview-root">
        <p class="lp-state">Loading…</p>
      </div>
    </div>
  )
}

LinksPreview.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("links-preview-root")
  const statusEl = document.getElementById("lp-status")
  if (!root) return

  // Full structure + SHA held in memory; approve mutates and re-saves it.
  let data = { sections: [] }
  let sha = null

  function safeUrl(u) {
    const s = String(u == null ? "" : u).trim()
    if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("/")) return s
    return null
  }

  function showStatus(msg, kind) {
    if (!statusEl) return
    statusEl.style.display = "block"
    statusEl.className = "lp-status " + kind
    statusEl.textContent = msg
  }
  function clearStatus() {
    if (!statusEl) return
    statusEl.style.display = "none"
    statusEl.textContent = ""
  }

  function findLink(id) {
    for (const s of data.sections) {
      for (const l of (s.links || [])) {
        if (l.id === id) return l
      }
    }
    return null
  }

  // Save the whole structure (with whatever mutation we just made) back
  // through /api/links. Returns the parsed response or throws.
  async function save() {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: sha, data: data }),
    })
    const j = await res.json()
    if (res.status === 409) throw new Error(j.error || "Conflict — reload and retry.")
    if (!j || !j.success) throw new Error((j && j.error) || "save failed")
    sha = j.sha
    return j
  }

  // Best-effort publish of the approved+public set to the R2 bucket.
  // Never throws to the caller — approval already persisted; this is the
  // downstream step and is allowed to fail with a retry hint.
  async function publishPublic() {
    try {
      const res = await fetch("/api/links-publish", { method: "POST" })
      if (!res.ok) return false
      const j = await res.json().catch(function () { return null })
      return !!(j && j.success)
    } catch (e) {
      return false
    }
  }

  async function approve(id) {
    clearStatus()
    const link = findLink(id)
    if (!link) return
    link.status = "approved"
    try {
      await save()
      if (link.destination === "public") {
        const ok = await publishPublic()
        showStatus(
          ok
            ? "Approved and published to the public page."
            : "Approved. Public page publish didn't complete — it'll retry on the next approval, or you can republish later.",
          ok ? "success" : "pending",
        )
      } else {
        showStatus("Approved — now on the Private Content page.", "success")
      }
      render()
    } catch (e) {
      // roll back the local flip so the queue still shows it as pending
      link.status = "pending"
      showStatus("Couldn't approve: " + e.message, "error")
      render()
    }
  }

  function sendBack(id) {
    // The item stays pending; we just take the user to Manage to edit it.
    // Manage is the editing surface for pending items, so this is the
    // "needs work" path that complements Approve.
    window.location.href = "/links/manage"
  }

  function render() {
    root.innerHTML = ""
    const sections = (data && Array.isArray(data.sections)) ? data.sections : []

    // collect pending items per section, in order
    let pendingTotal = 0
    const blocks = []
    sections.forEach(function (section) {
      const pending = (section.links || []).filter(function (l) { return l && l.status === "pending" })
      pendingTotal += pending.length
      if (pending.length > 0) blocks.push({ section: section, items: pending })
    })

    if (pendingTotal === 0) {
      const p = document.createElement("p")
      p.className = "lp-state"
      p.textContent = "Nothing pending — you're all caught up. New or edited links show up here for approval."
      root.appendChild(p)
      return
    }

    const intro = document.createElement("p")
    intro.className = "lp-intro"
    intro.textContent = pendingTotal + (pendingTotal === 1 ? " item" : " items") + " awaiting approval. Approve to publish to the chosen destination, or send back to revise."
    root.appendChild(intro)

    blocks.forEach(function (block) {
      const secEl = document.createElement("section")
      secEl.className = "lp-section"

      if (block.section.title) {
        const h2 = document.createElement("h2")
        h2.className = "lp-section-title"
        h2.textContent = block.section.title
        secEl.appendChild(h2)
      }

      block.items.forEach(function (link) {
        const row = document.createElement("div")
        row.className = "lp-item"

        const head = document.createElement("div")
        head.className = "lp-item-head"

        const url = safeUrl(link.url)
        let labelEl
        if (url) {
          labelEl = document.createElement("a")
          labelEl.setAttribute("href", url)
          labelEl.setAttribute("rel", "noopener noreferrer")
          if (url.indexOf("http") === 0) labelEl.setAttribute("target", "_blank")
        } else {
          labelEl = document.createElement("span")
        }
        labelEl.className = "lp-item-label"
        labelEl.textContent = link.label || url || "(no label)"
        head.appendChild(labelEl)

        const dest = document.createElement("span")
        const isPub = link.destination === "public"
        dest.className = "lp-dest " + (isPub ? "lp-dest-public" : "lp-dest-private")
        dest.textContent = isPub ? "→ Public" : "→ Private"
        head.appendChild(dest)

        row.appendChild(head)

        if (link.description) {
          const desc = document.createElement("div")
          desc.className = "lp-item-desc"
          desc.textContent = link.description
          row.appendChild(desc)
        }

        if (!url && link.url) {
          const warn = document.createElement("div")
          warn.className = "lp-item-warn"
          warn.textContent = "⚠ Unusable URL — fix it before approving: " + link.url
          row.appendChild(warn)
        }

        const actions = document.createElement("div")
        actions.className = "lp-actions"

        const approveBtn = document.createElement("button")
        approveBtn.type = "button"
        approveBtn.className = "lp-btn lp-btn-approve"
        approveBtn.textContent = "Approve"
        approveBtn.addEventListener("click", function () {
          approveBtn.disabled = true
          approveBtn.textContent = "Approving…"
          approve(link.id)
        })
        actions.appendChild(approveBtn)

        const backBtn = document.createElement("button")
        backBtn.type = "button"
        backBtn.className = "lp-btn lp-btn-back"
        backBtn.textContent = "Send back"
        backBtn.title = "Return to Manage to revise this item"
        backBtn.addEventListener("click", function () { sendBack(link.id) })
        actions.appendChild(backBtn)

        row.appendChild(actions)
        secEl.appendChild(row)
      })

      root.appendChild(secEl)
    })
  }

  fetch("/api/links", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json() })
    .then(function (j) {
      if (j && j.success) {
        data = j.data && Array.isArray(j.data.sections) ? j.data : { sections: [] }
        sha = j.sha
        render()
      } else {
        throw new Error((j && j.error) || "unknown error")
      }
    })
    .catch(function () {
      root.innerHTML = ""
      const p = document.createElement("p")
      p.className = "lp-state"
      p.textContent = "Couldn't load the approval queue. If you just saved, give it a moment and reload."
      root.appendChild(p)
    })
})
`

LinksPreview.css = `
#links-preview-app {
  max-width: 100%;
  padding-bottom: 2rem;
}
.lp-state {
  color: var(--gray);
  font-style: italic;
}
.lp-intro {
  color: var(--gray);
  font-size: 0.9rem;
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--lightgray);
}
.lp-status {
  margin-bottom: 1rem;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
}
.lp-status.pending { background: #6B4D1A; color: #D4AD5A; }
.lp-status.success { background: #1B3F29; color: #7BBF95; }
.lp-status.error { background: #6B2020; color: #C46B6B; }
.lp-section {
  margin-bottom: 1.75rem;
}
.lp-section-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gray);
  margin: 0 0 0.75rem;
  font-weight: 700;
}
.lp-item {
  padding: 0.85rem 1rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
  margin-bottom: 0.7rem;
}
.lp-item-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.lp-item-label {
  font-weight: 600;
  font-size: 1.02rem;
  color: var(--dark);
  text-decoration: none;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}
a.lp-item-label:hover {
  color: var(--secondary);
  text-decoration: underline;
}
.lp-dest {
  flex-shrink: 0;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
}
.lp-dest-public {
  background: color-mix(in srgb, var(--secondary) 16%, transparent);
  color: var(--secondary);
  border: 1px solid color-mix(in srgb, var(--secondary) 42%, transparent);
}
.lp-dest-private {
  background: transparent;
  color: var(--gray);
  border: 1px solid var(--lightgray);
}
.lp-item-desc {
  color: var(--gray);
  font-size: 0.9rem;
  margin-top: 0.3rem;
}
.lp-item-warn {
  color: #C46B6B;
  font-size: 0.82rem;
  margin-top: 0.35rem;
}
.lp-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.lp-btn {
  padding: 0.45rem 1rem;
  border-radius: 7px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.lp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.lp-btn-approve {
  background: var(--secondary);
  color: var(--light);
}
.lp-btn-approve:hover { opacity: 0.85; }
.lp-btn-back {
  background: transparent;
  color: var(--dark);
  border-color: var(--lightgray);
}
.lp-btn-back:hover { border-color: var(--gray); }
`

export default (() => LinksPreview) satisfies QuartzComponentConstructor
