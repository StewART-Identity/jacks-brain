import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import styles from "./styles/searchPage.scss"

/* SearchPage — the dedicated /learn/search route.
 *
 * Visually mirrors the Research card exactly: rounded card, semi-
 * transparent dark fill, label, textarea, controls row with count
 * input on the left and Search button on the right (Research-button
 * sized, NOT compact-sidebar-button sized).
 *
 * Architecture note — this is a re-do of an earlier attempt that
 * failed because I put the engine's `.search-button` class on the
 * visible Search button. That made the sidebar's
 * `.search .search-button { width: 100%; height: 2rem; ... }` rules
 * leak onto the visible button, stretching it across the row and
 * compressing it vertically. Fix: the visible button now has NO
 * engine-relevant classes. A separate, hidden `<button class="search-button">`
 * exists solely to satisfy the engine's `setupSearch` lookup
 * (which bails early if it can't find a .search-button element).
 *
 * Engine DOM contract still met:
 *   .search                              (root, engine iterates these)
 *     button.search-button (display:none)  (engine binds click handler)
 *     .search-container
 *       .search-space
 *         textarea.search-bar              (the actual visible input)
 *         .search-layout                   (engine appends results here)
 */
const SearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="search-page">
      <div class="search">
        {/* Hidden button for the engine. The engine's setupSearch
            requires a .search-button element to exist; without one it
            bails early. We keep this element off-screen and render a
            separate visible Search button below. */}
        <button
          class="search-button"
          type="button"
          aria-hidden="true"
          tabIndex={-1}
        ></button>

        <div class="search-page-card">
          <h3 class="search-page-label">Search the wiki</h3>
          <textarea
            class="search-bar"
            rows={2}
            autocomplete="off"
            placeholder="Search by title, content, or tag. Prefix with # for tag search."
            aria-label="Search the wiki"
          />
          <div class="search-page-controls">
            <div class="search-page-count-group">
              <label class="search-page-count-label" for="search-page-count">
                Number of results
              </label>
              <input
                type="number"
                id="search-page-count"
                min="1"
                max="8"
                value="5"
                class="search-page-count-input"
              />
            </div>
            {/* The visible Search button. NO engine classes — fully
                styled by our own searchPage.scss with no leakage from
                the sidebar's .search-button rules. */}
            <button class="search-page-btn" type="button">
              Search
            </button>
          </div>
        </div>
        <div class="search-container">
          <div class="search-space">
            <div class="search-layout" data-preview="false"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

SearchPage.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("search-page")
  if (!root) return
  const container = root.querySelector(".search-container")
  const bar = root.querySelector(".search-bar")
  const countInput = document.getElementById("search-page-count")
  if (!container || !bar) return

  // Mark active on first interaction so the engine renders results.
  const ensureActive = () => {
    container.classList.add("active")
  }
  bar.addEventListener("focus", ensureActive)
  bar.addEventListener("input", ensureActive)

  // Suppress newline-on-Enter inside the search textarea.
  const suppressEnterNewline = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
    }
  }
  bar.addEventListener("keydown", suppressEnterNewline)

  // Apply the "Number of results" cap by setting a data-cap attribute
  // on the .search-layout element. The CSS in searchPage.scss handles
  // the actual hiding via :nth-child rules, so the cap is enforced
  // synchronously the moment the engine appends new result cards —
  // no MutationObserver, no flash of soon-to-be-hidden cards.
  const layout = root.querySelector(".search-layout")
  const applyCap = () => {
    if (!layout) return
    const n = Math.max(1, Math.min(8, parseInt(countInput && countInput.value, 10) || 5))
    layout.setAttribute("data-cap", String(n))
  }
  applyCap()

  if (countInput) {
    countInput.addEventListener("input", applyCap)
  }

  // The visible Search button focuses the input.
  const btn = root.querySelector(".search-page-btn")
  const focusBar = () => bar.focus()
  if (btn) btn.addEventListener("click", focusBar)

  window.addCleanup(() => {
    bar.removeEventListener("focus", ensureActive)
    bar.removeEventListener("input", ensureActive)
    bar.removeEventListener("keydown", suppressEnterNewline)
    if (countInput) countInput.removeEventListener("input", applyCap)
    if (btn) btn.removeEventListener("click", focusBar)
  })
})
`

SearchPage.css = styles

export default (() => SearchPage) satisfies QuartzComponentConstructor
