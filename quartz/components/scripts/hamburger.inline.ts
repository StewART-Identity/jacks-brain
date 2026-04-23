/**
 * hamburger.inline.ts
 *
 * Wires up the mobile hamburger menu toggle. Listens on Quartz's "nav"
 * event (fired both on initial load and after SPA navigations) so the
 * button keeps working after route changes.
 *
 * State lives on `document.body` via the `menu-open` class. The class is
 * the single source of truth — CSS reads it to show/hide the overlay,
 * and the button's `aria-expanded` attribute stays in sync with it.
 *
 * Closing triggers:
 *   - Tapping the hamburger button again
 *   - Tapping anywhere outside the sidebar (but not on the button itself)
 *   - Tapping any link inside the sidebar
 *   - Pressing Escape
 *   - Route change (nav event) — the menu closes so the new page starts clean
 */

const MENU_OPEN_CLASS = "menu-open"

document.addEventListener("nav", () => {
  const button = document.getElementById("hamburger-toggle")
  const sidebar = document.querySelector(".sidebar.left")

  if (!button || !sidebar) return

  // Close menu on any nav event — if the user just navigated, they don't
  // want to be looking at the menu overlay on the new page.
  closeMenu()

  function isMenuOpen(): boolean {
    return document.body.classList.contains(MENU_OPEN_CLASS)
  }

  function openMenu() {
    document.body.classList.add(MENU_OPEN_CLASS)
    button?.setAttribute("aria-expanded", "true")
  }

  function closeMenu() {
    document.body.classList.remove(MENU_OPEN_CLASS)
    button?.setAttribute("aria-expanded", "false")
  }

  function toggleMenu() {
    if (isMenuOpen()) closeMenu()
    else openMenu()
  }

  // Button click — toggle
  const onButtonClick = (e: Event) => {
    e.stopPropagation()
    toggleMenu()
  }

  // Outside click — close. We listen on document and filter out clicks
  // that landed on the sidebar or the button itself.
  const onOutsideClick = (e: MouseEvent) => {
    if (!isMenuOpen()) return
    const target = e.target as Node
    if (sidebar?.contains(target)) return
    if (button?.contains(target)) return
    closeMenu()
  }

  // Link click inside the sidebar — close (and let the nav event fire).
  // Delegated listener so we don't rewire on every link.
  const onSidebarClick = (e: Event) => {
    const target = e.target as HTMLElement
    if (target.closest("a")) {
      closeMenu()
    }
  }

  // Escape key — close
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isMenuOpen()) {
      closeMenu()
    }
  }

  button.addEventListener("click", onButtonClick)
  document.addEventListener("click", onOutsideClick)
  sidebar.addEventListener("click", onSidebarClick)
  document.addEventListener("keydown", onKeydown)

  // Quartz re-fires "nav" on SPA navigation. The old handlers attached
  // above would accumulate if we didn't tear them down. Register a
  // cleanup that runs on the next nav event.
  const cleanup = () => {
    button?.removeEventListener("click", onButtonClick)
    document.removeEventListener("click", onOutsideClick)
    sidebar?.removeEventListener("click", onSidebarClick)
    document.removeEventListener("keydown", onKeydown)
    document.removeEventListener("nav", cleanup)
  }
  document.addEventListener("nav", cleanup, { once: true })
})
