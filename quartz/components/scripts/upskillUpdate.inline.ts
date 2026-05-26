/**
 * Upskill topic-update list — client behavior for /upskill/update.
 *
 * Renders the list of existing topics and handles inline edit /
 * hide / delete actions. Companion add form lives at /upskill/add
 * (script: upskillAdd.inline.ts). After every successful action
 * here, the list re-fetches from /api/upskill/topics so the page
 * stays consistent.
 *
 * Mounts under the SPA "nav" event so handlers re-bind when the
 * user lands on this page from elsewhere.
 *
 * Note on the rebuild lag: every API call returns a "next build
 * will pick this up in ~30s" message. The status banner reflects
 * that — users see the change reflected here immediately (this
 * page re-fetches), but the sidebar won't update until Cloudflare
 * Pages finishes the rebuild.
 */
document.addEventListener("nav", () => {
  const root = document.getElementById("upskill-update-app")
  if (!root) return

  /* ───── DOM refs ─────────────────────────────────────────────────── */
  const list = document.getElementById("upskill-list") as HTMLElement | null
  const listStatus = document.getElementById("upskill-list-status") as HTMLElement | null

  if (!list || !listStatus) return

  /* ───── Status helpers ───────────────────────────────────────────── */
  function showStatus(
    target: HTMLElement,
    msg: string,
    type: "pending" | "success" | "error",
  ) {
    target.style.display = "block"
    target.innerHTML = ""
    const div = document.createElement("div")
    div.className = "card-status-msg " + type
    div.textContent = msg
    target.appendChild(div)
  }

  /* ───── Topics list rendering ────────────────────────────────────── */

  interface Topic {
    slug: string
    title: string
    order: number
    summary: string
    hidden: boolean
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function renderList(topics: Topic[]) {
    list!.setAttribute("aria-busy", "false")
    if (topics.length === 0) {
      list!.innerHTML = '<p class="muted">No topics yet. Create one at <a href="/upskill/add">/upskill/add</a>.</p>'
      return
    }
    const rows = topics
      .map((t) => {
        const summary = t.summary ? escapeHtml(t.summary) : '<span class="muted">No summary.</span>'
        const hiddenBadge = t.hidden
          ? ' <span class="upskill-badge upskill-badge-hidden">hidden</span>'
          : ""
        return `
          <div class="upskill-row" data-slug="${escapeHtml(t.slug)}">
            <div class="upskill-row-main">
              <div class="upskill-row-title">
                <a href="/upskill/${escapeHtml(t.slug)}">${escapeHtml(t.title)}</a>
                <span class="upskill-row-order">order ${t.order}</span>${hiddenBadge}
              </div>
              <div class="upskill-row-summary">${summary}</div>
            </div>
            <div class="upskill-row-actions">
              <button type="button" class="jb-btn jb-btn-sm upskill-edit-btn" data-slug="${escapeHtml(t.slug)}">Edit</button>
              <button type="button" class="jb-btn jb-btn-sm upskill-toggle-btn" data-slug="${escapeHtml(t.slug)}">
                ${t.hidden ? "Unhide" : "Hide"}
              </button>
              <button type="button" class="jb-btn jb-btn-sm upskill-delete-btn" data-slug="${escapeHtml(t.slug)}">Delete</button>
            </div>
          </div>
        `
      })
      .join("")
    list!.innerHTML = rows
    bindRowHandlers()
  }

  async function loadTopics() {
    list!.setAttribute("aria-busy", "true")
    try {
      const res = await fetch("/api/upskill/topics", {
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (!res.ok) {
        list!.innerHTML = `<p class="muted">Failed to load topics: ${escapeHtml(data.error ?? "unknown")}</p>`
        return
      }
      renderList(data.topics ?? [])
    } catch (err: any) {
      list!.innerHTML = `<p class="muted">Failed to load topics: ${escapeHtml(err.message ?? "network error")}</p>`
    }
  }

  function bindRowHandlers() {
    list!.querySelectorAll<HTMLButtonElement>(".upskill-edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => editTopic(btn.dataset.slug!))
    })
    list!.querySelectorAll<HTMLButtonElement>(".upskill-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleHidden(btn.dataset.slug!))
    })
    list!.querySelectorAll<HTMLButtonElement>(".upskill-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteTopic(btn.dataset.slug!))
    })
  }

  /* ───── Edit (inline prompt-based, deliberately minimal) ─────────── */

  async function editTopic(slug: string) {
    let current: Topic | null = null
    try {
      const res = await fetch(`/api/upskill/topics/${encodeURIComponent(slug)}`, {
        headers: { Accept: "application/json" },
      })
      if (!res.ok) {
        showStatus(listStatus!, `Failed to load topic for edit: ${res.status}`, "error")
        return
      }
      current = (await res.json()) as Topic
    } catch (err: any) {
      showStatus(listStatus!, "Failed to load topic for edit: " + err.message, "error")
      return
    }
    if (!current) return

    const newTitle = window.prompt(`Title for "${slug}":`, current.title)
    if (newTitle === null) return
    const newOrderRaw = window.prompt(`Order for "${slug}" (lower = earlier in sidebar):`, String(current.order))
    if (newOrderRaw === null) return
    const newOrder = parseInt(newOrderRaw, 10)
    if (!Number.isFinite(newOrder)) {
      showStatus(listStatus!, "Order must be a number — edit cancelled.", "error")
      return
    }
    const newSummary = window.prompt(`Summary for "${slug}":`, current.summary)
    if (newSummary === null) return

    showStatus(listStatus!, `Saving "${slug}"…`, "pending")
    try {
      const res = await fetch(`/api/upskill/topics/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          order: newOrder,
          summary: newSummary.trim(),
          hidden: current.hidden,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        showStatus(listStatus!, "Save failed: " + (data.error ?? "unknown"), "error")
        return
      }
      showStatus(listStatus!, `Saved "${slug}". Sidebar updates after build (~30s).`, "success")
      loadTopics()
    } catch (err: any) {
      showStatus(listStatus!, "Save failed: " + err.message, "error")
    }
  }

  /* ───── Toggle hidden ────────────────────────────────────────────── */

  async function toggleHidden(slug: string) {
    let current: Topic | null = null
    try {
      const res = await fetch(`/api/upskill/topics/${encodeURIComponent(slug)}`)
      if (!res.ok) {
        showStatus(listStatus!, `Failed to load topic: ${res.status}`, "error")
        return
      }
      current = (await res.json()) as Topic
    } catch (err: any) {
      showStatus(listStatus!, "Failed to load topic: " + err.message, "error")
      return
    }
    if (!current) return

    const nextHidden = !current.hidden
    showStatus(listStatus!, `${nextHidden ? "Hiding" : "Unhiding"} "${slug}"…`, "pending")
    try {
      const res = await fetch(`/api/upskill/topics/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: current.title,
          order: current.order,
          summary: current.summary,
          hidden: nextHidden,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        showStatus(listStatus!, "Toggle failed: " + (data.error ?? "unknown"), "error")
        return
      }
      showStatus(
        listStatus!,
        `${nextHidden ? "Hid" : "Unhid"} "${slug}". Sidebar updates after build (~30s).`,
        "success",
      )
      loadTopics()
    } catch (err: any) {
      showStatus(listStatus!, "Toggle failed: " + err.message, "error")
    }
  }

  /* ───── Delete ───────────────────────────────────────────────────── */

  async function deleteTopic(slug: string) {
    const confirmed = window.confirm(
      `Delete topic "${slug}"?\n\nThis removes:\n  • data/upskill/${slug}/meta.json\n  • content/upskill/${slug}/index.md\n\nIt does NOT delete any study pages under content/upskill/${slug}/ other than index.md.\n\nYou can also Hide instead of Delete.`,
    )
    if (!confirmed) return

    showStatus(listStatus!, `Deleting "${slug}"…`, "pending")
    try {
      const res = await fetch(`/api/upskill/topics/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        showStatus(listStatus!, "Delete failed: " + (data.error ?? "unknown"), "error")
        return
      }
      showStatus(
        listStatus!,
        `Deleted "${slug}". Sidebar updates after build (~30s).`,
        "success",
      )
      loadTopics()
    } catch (err: any) {
      showStatus(listStatus!, "Delete failed: " + err.message, "error")
    }
  }

  /* ───── Initial load ─────────────────────────────────────────────── */
  loadTopics()
})
