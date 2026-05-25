/**
 * SidebarLink — client-side collapse toggle.
 *
 * Each .sidebar-nav element has a chevron button (.sidebar-nav-toggle)
 * inside its heading. Clicking the chevron flips data-state on the
 * surrounding .sidebar-nav between "open" and "closed", and toggles
 * the [hidden] attribute on the matching <ul>. CSS reads data-state
 * to rotate the chevron icon.
 *
 * No persistence: defaults are computed per-page in the layout based
 * on whether the current page belongs to the section. Persisting open
 * state to localStorage would fight that default — every navigation
 * would overwrite whatever the user just clicked on the previous page.
 * We let the per-page defaults do the work and only honor explicit
 * user clicks for the duration of the current page.
 */
document.addEventListener("nav", () => {
  const toggles = document.querySelectorAll<HTMLButtonElement>(".sidebar-nav-toggle")

  for (const toggle of toggles) {
    const nav = toggle.closest<HTMLElement>(".sidebar-nav")
    if (!nav) continue
    const listId = toggle.getAttribute("aria-controls")
    if (!listId) continue
    const list = document.getElementById(listId)
    if (!list) continue

    const handler = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      const isOpen = nav.getAttribute("data-state") === "open"
      const next = isOpen ? "closed" : "open"
      nav.setAttribute("data-state", next)
      toggle.setAttribute("aria-expanded", next === "open" ? "true" : "false")
      if (next === "open") {
        list.removeAttribute("hidden")
      } else {
        list.setAttribute("hidden", "")
      }
    }

    toggle.addEventListener("click", handler)
    window.addCleanup(() => toggle.removeEventListener("click", handler))
  }
})
