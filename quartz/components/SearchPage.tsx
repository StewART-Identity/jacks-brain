import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import styles from "./styles/searchPage.scss"

/* SearchPage — the dedicated /learn/search route.
 *
 * Renders a Research-style card (rounded, semi-transparent dark fill,
 * roomy textarea) that hosts the EXACT DOM contract the existing
 * search engine in `scripts/search.inline.ts` looks for:
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
 * The engine's `setupSearch` at the bottom of search.inline.ts runs on
 * every nav event and iterates over EVERY `.search` element on the
 * page, so this instance is bound automatically alongside the sidebar
 * Search component — no script changes required. */
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
            <p class="search-page-hint">
              Type to search by title and content.
              Prefix with <code>#</code> to search by tag.
            </p>
            <button class="search-button search-page-btn" type="button">
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 19.9 19.7"
                aria-hidden="true"
              >
                <title>Search</title>
                <g class="search-path" fill="none">
                  <path stroke-linecap="square" d="M18.5 18.3l-5.4-5.4" />
                  <circle cx="8" cy="8" r="7" />
                </g>
              </svg>
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
  // highlighted result; without this, Enter would also insert a
  // literal newline into the textarea before the navigation fires.
  const suppressEnterNewline = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
    }
  }
  bar.addEventListener("keydown", suppressEnterNewline)

  window.addCleanup(() => {
    bar.removeEventListener("focus", ensureActive)
    bar.removeEventListener("input", ensureActive)
    bar.removeEventListener("keydown", suppressEnterNewline)
  })
})
`

SearchPage.css = styles

export default (() => SearchPage) satisfies QuartzComponentConstructor
