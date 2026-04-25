import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import styles from "./styles/searchPage.scss"

/* SearchPage — the dedicated /learn/search route.
 *
 * The card mirrors the Research card visually: rounded, semi-transparent
 * dark fill, label, textarea, and a controls row with a count input on
 * the left and a Search button on the right. No "Rank with Claude"
 * toggle (that's Research-specific).
 *
 * The card hosts the EXACT DOM contract the existing search engine in
 * `scripts/search.inline.ts` looks for:
 *
 *   .search
 *     .search-button         (focuses the input via showSearch())
 *     .search-container
 *       .search-space
 *         textarea.search-bar  (the actual search input — note that
 *                              the engine uses `.value` and `input`
 *                              events, both of which work identically
 *                              on textareas and inputs)
 *         .search-layout       (engine appends results-container here)
 *
 * The engine's `setupSearch` runs on every nav event and iterates over
 * EVERY `.search` element on the page, so this instance is bound
 * automatically alongside the sidebar Search component — no engine
 * changes required.
 *
 * Note on the count input: the engine caps results at 8 internally
 * (numSearchResults = 8 in search.inline.ts, defined at module scope).
 * This page can't ask for more than 8 — but it can ask for fewer.
 * Setting the input to e.g. 5 hides the 6th-8th result rows
 * client-side. The input is min=1 max=8 to be honest about that. */
const SearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="search-page">
      <div class="search search-page-search">
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
            <button class="search-button search-page-btn" type="button">
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
  // The engine's onType handler is wired to the textarea, but it only
  // appends results into .search-layout when the parent
  // .search-container has the .active class. Setting it manually on
  // focus/input means the user can just type — no need to click the
  // search button first to "open" the search.
  const ensureActive = () => {
    container.classList.add("active")
  }
  bar.addEventListener("focus", ensureActive)
  bar.addEventListener("input", ensureActive)

  // Suppress newline-on-Enter inside the search textarea. The engine's
  // document-level keydown handler captures Enter to navigate to the
  // highlighted result; without this, Enter would also insert a literal
  // newline into the textarea before the navigation fires.
  const suppressEnterNewline = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
    }
  }
  bar.addEventListener("keydown", suppressEnterNewline)

  // Apply the "Number of results" cap by hiding result cards beyond
  // the chosen N. The engine renders results into .results-container
  // asynchronously (input event -> debounced search -> appendChild),
  // so we can't trim just once — we have to re-trim whenever the
  // results list changes. A MutationObserver on the results container
  // (created lazily by the engine) watches for new .result-card
  // children and reapplies the cap.
  const applyCap = () => {
    const n = Math.max(1, Math.min(8, parseInt(countInput && countInput.value, 10) || 5))
    const cards = root.querySelectorAll(".search-layout .result-card")
    cards.forEach((card, i) => {
      // Don't hide the "no match" empty state (it's a single card and
      // hiding it would just leave a blank box).
      if (card.classList.contains("no-match")) return
      card.style.display = i < n ? "" : "none"
    })
  }

  // Watch the .search-layout for any DOM changes (the engine swaps the
  // results-container in and out, then appends/replaces result cards
  // inside it). Re-apply the cap on every mutation.
  const layout = root.querySelector(".search-layout")
  let observer = null
  if (layout) {
    observer = new MutationObserver(() => applyCap())
    observer.observe(layout, { childList: true, subtree: true })
  }

  // Re-apply when the user changes the count.
  if (countInput) {
    countInput.addEventListener("input", applyCap)
  }

  // The Search button on this page is a no-op for engine purposes
  // (the engine focuses the input via showSearch on click — useful in
  // the modal context, not here). Make it explicitly focus the input
  // so the user always lands in the textarea after clicking.
  const btn = root.querySelector(".search-page-btn")
  const focusBar = () => bar.focus()
  if (btn) btn.addEventListener("click", focusBar)

  window.addCleanup(() => {
    bar.removeEventListener("focus", ensureActive)
    bar.removeEventListener("input", ensureActive)
    bar.removeEventListener("keydown", suppressEnterNewline)
    if (countInput) countInput.removeEventListener("input", applyCap)
    if (btn) btn.removeEventListener("click", focusBar)
    if (observer) observer.disconnect()
  })
})
`

SearchPage.css = styles

export default (() => SearchPage) satisfies QuartzComponentConstructor
