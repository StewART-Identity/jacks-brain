/**
 * Upskill topic management — client behavior for /upskill/manage.
 *
 * Two halves: a create form (top) and an existing-topics list
 * (bottom). The list re-fetches after every successful create / edit
 * / delete so the view stays consistent.
 *
 * Mounts under the SPA "nav" event so handlers re-bind when the user
 * lands on this page from elsewhere. Same convention as
 * noteForm.inline.ts.
 *
 * Note on the rebuild lag: every API call returns a "next build will
 * pick this up in ~30s" message. The form's status banner reflects
 * that — users see "Topic created" immediately, but the sidebar won't
 * update until Cloudflare Pages finishes the rebuild. We re-fetch the
 * topics list from /api/upskill/topics on success so the in-page list
 * shows the change right away even though the sidebar lags.
 */
document.addEventListener("nav", () => {
  const root = document.getElementById("upskill-manage-app")
  if (!root) return

  /* ───── DOM refs — create form ──────────────────────────────────── */
  const titleInput = document.getElementById("upskill-title") as HTMLInputElement | null
  const slugInput = document.getElementById("upskill-slug") as HTMLInputElement | null
  const orderInput = document.getElementById("upskill-order") as HTMLInputElement | null
  const summaryInput = document.getElementById("upskill-summary") as HTMLTextAreaElement | null
  const createBtn = document.getElementById("upskill-create-btn") as HTMLButtonElement | null
  const createStatus = document.getElementById("upskill-create-status") as HTMLElement | null

  /* ───── DOM refs — existing-topics list ─────────────────────────── */
  const list = document.getElementById("upskill-list") as HTMLElement | null
  const listStatus = document.getElementById("upskill-list-status") as HTMLElement | null

  if (
    !titleInput ||
    !slugInput ||
    !orderInput ||
    !summaryInput ||
    !createBtn ||
    !createStatus ||
    !list ||
    !listStatus
  ) {
    return
  }

  /* ───── Slug auto-derivation ────────────────────────────────────── */

  /**
   * Convert a free-form title to a kebab-case slug. Mirrors the
   * server-side validation in functions/api/upskill/topics.ts:
   *   - lowercase
   *   - only [a-z0-9-]
   *   - leading character must be a letter (numbers and dashes are
   *     stripped from the front)
   *   - consecutive dashes collapse to one
   *   - trailing dash stripped
   */
  function deriveSlug(title: string): string {
    let s = title.toLowerCase()
    // Replace non-alphanumeric with dashes, then collapse runs of dashes.
    s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-")
    // Strip leading non-letters (digits and dashes).
    s = s.replace(/^[^a-z]+/, "")
    // Strip trailing dash.
    s = s.replace(/-$/, "")
    return s
  }

  // Track whether the user has manually edited the slug. Once they
  // have, stop auto-syncing — they took ownership.
  let slugIsAutoSynced = true
  titleInput.addEventListener("input", () => {
    if (slugIsAutoSynced) {
      slugInput!.value = deriveSlug(titleInput!.value)
    }
  })
  slugInput.addEventListener("input", () => {
    // User typed in slug → stop syncing from title.
    slugIsAutoSynced = slugInput!.value === deriveSlug(titleInput!.value)
  })

  /* ───── Status helpers (mirrors noteForm.inline.ts) ─────────────── */
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
  function clearStatus(target: HTMLElement) {
    target.innerHTML = ""
    target.style.display = "none"
  }

  /* ───── Topics list rendering ───────────────────────────────────── */

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
      list!.innerHTML = '<p class="muted">No topics yet. Use the form above to create the first one.</p>'
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

  /* ───── Create ──────────────────────────────────────────────────── */

  async function createTopic() {
    const title = titleInput!.value.trim()
    const slug = slugInput!.value.trim()
    const orderRaw = orderInput!.value.trim()
    const summary = summaryInput!.value.trim()

    if (!title) {
      showStatus(createStatus!, "Title is required.", "error")
      titleInput!.focus()
      return
    }
    if (!slug) {
      showStatus(createStatus!, "Slug is required (it auto-fills from title).", "error")
      slugInput!.focus()
      return
    }
    const order = parseInt(orderRaw, 10)
    if (!Number.isFinite(order)) {
      showStatus(createStatus!, "Order must be a number.", "error")
      orderInput!.focus()
      return
    }

    createBtn!.disabled = true
    createBtn!.textContent = "Creating…"
    showStatus(createStatus!, "Committing to the repo…", "pending")

    try {
      const res = await fetch("/api/upskill/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, order, summary }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        showStatus(
          createStatus!,
          "Create failed: " + (data.error ?? "Unknown error"),
          "error",
        )
        createBtn!.disabled = false
        createBtn!.textContent = "Create topic"
        return
      }

      // Reset form for the next capture.
      titleInput!.value = ""
      slugInput!.value = ""
      orderInput!.value = ""
      summaryInput!.value = ""
      slugIsAutoSynced = true

      showStatus(
        createStatus!,
        `Topic "${title}" created. Sidebar updates after the next build (~30s).`,
        "success",
      )

      createBtn!.disabled = false
      createBtn!.textContent = "Create topic"

      // Refresh the existing-topics list — the new one shows up
      // immediately in-page even though the sidebar lags.
      loadTopics()
    } catch (err: any) {
      showStatus(createStatus!, "Create failed: " + err.message, "error")
      createBtn!.disabled = false
      createBtn!.textContent = "Create topic"
    }
  }
  createBtn.addEventListener("click", createTopic)

  /* ───── Edit (inline prompt-based, deliberately minimal) ────────── */

  /**
   * Inline editing uses window.prompt() for now. The shape of a topic
   * is small enough (title, order, summary) that a modal would be
   * heavier than the value it adds at this stage. If editing turns
   * out to be frequent and the prompts feel clunky, we can swap in
   * a row-level edit-in-place pattern later.
   */
  async function editTopic(slug: string) {
    // Pull the current topic state so the prompt defaults make sense.
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
    if (newTitle === null) return // Cancelled.
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

  /* ───── Toggle hidden ──────────────────────────────────────────── */

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

  /* ───── Delete ──────────────────────────────────────────────────── */

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

  /* ───── Initial load ────────────────────────────────────────────── */
  loadTopics()
})
