/**
 * Upskill topic-add form — client behavior for /upskill/add.
 *
 * Single-purpose form for creating a new Upskill topic. The
 * companion list/edit page lives at /upskill/update and gets its
 * own inline script (upskillUpdate.inline.ts). The two scripts
 * share no runtime state; each operates on its own page in
 * isolation.
 *
 * After a successful create, the form resets and shows a success
 * banner. The new topic appears on /upskill/update immediately
 * (that page re-fetches /api/upskill/topics on every load) and
 * appears in the sidebar after the next Cloudflare Pages rebuild
 * (~30s).
 */
document.addEventListener("nav", () => {
  const root = document.getElementById("upskill-add-app")
  if (!root) return

  /* ───── DOM refs ─────────────────────────────────────────────────── */
  const titleInput = document.getElementById("upskill-title") as HTMLInputElement | null
  const slugInput = document.getElementById("upskill-slug") as HTMLInputElement | null
  const orderInput = document.getElementById("upskill-order") as HTMLInputElement | null
  const summaryInput = document.getElementById("upskill-summary") as HTMLTextAreaElement | null
  const createBtn = document.getElementById("upskill-create-btn") as HTMLButtonElement | null
  const createStatus = document.getElementById("upskill-create-status") as HTMLElement | null

  if (
    !titleInput ||
    !slugInput ||
    !orderInput ||
    !summaryInput ||
    !createBtn ||
    !createStatus
  ) {
    return
  }

  /* ───── Slug auto-derivation ─────────────────────────────────────── */

  /**
   * Convert a free-form title to a kebab-case slug. Mirrors the
   * server-side validator in functions/api/upskill/topics.ts.
   */
  function deriveSlug(title: string): string {
    let s = title.toLowerCase()
    s = s.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-")
    s = s.replace(/^[^a-z]+/, "")
    s = s.replace(/-$/, "")
    return s
  }

  let slugIsAutoSynced = true
  titleInput.addEventListener("input", () => {
    if (slugIsAutoSynced) {
      slugInput!.value = deriveSlug(titleInput!.value)
    }
  })
  slugInput.addEventListener("input", () => {
    slugIsAutoSynced = slugInput!.value === deriveSlug(titleInput!.value)
  })

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

  /* ───── Create handler ───────────────────────────────────────────── */

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
        `Topic "${title}" created. Visit /upskill/update to see the full list; the sidebar updates after the next build (~30s).`,
        "success",
      )

      createBtn!.disabled = false
      createBtn!.textContent = "Create topic"
    } catch (err: any) {
      showStatus(createStatus!, "Create failed: " + err.message, "error")
      createBtn!.disabled = false
      createBtn!.textContent = "Create topic"
    }
  }
  createBtn.addEventListener("click", createTopic)
})
