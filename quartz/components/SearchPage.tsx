import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import styles from "./styles/searchPage.scss"

/* SearchPage — the dedicated /learn/search route.
 *
 * Renders a Research-style card (rounded, semi-transparent dark fill,
 * roomy textarea-feel input) that hosts the EXACT DOM contract the
 * existing search engine in `scripts/search.inline.ts` looks for:
 *
 *   .search
 *     .search-button         (focuses the input via showSearch())
 *     .search-container
 *       .search-space
 *         input.search-bar   (the actual search input)
 *         .search-layout     (engine appends results-container here)
 *
 * The engine's `setupSearch` at the bottom of search.inline.ts runs on
 * every nav event and iterates over EVERY `.search` element on the
 * page, so this instance is bound automatically alongside the sidebar
 * Search component — no script changes required.
 *
 * The visual difference between this page-embedded copy and the
 * sidebar's modal version is purely CSS: searchPage.scss flattens the
 * `.search-container` (which the sidebar styles as a fixed-position
 * fullscreen modal) into an inline-flowing block inside our card. */
const SearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="search-page">
      <div class="search search-page-search">
        <div class="search-page-card">
          <h3 class="search-page-label">Search the wiki</h3>
          <input
            class="search-bar"
            type="text"
            autocomplete="off"
            placeholder="Title, content, or tag..."
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
            {/* The .search-bar above is the visible input. The engine
                reads it because it has class `search-bar` inside the
                same `.search` ancestor — no second input needed. The
                .search-layout below receives appended results. */}
            <div class="search-layout" data-preview="false"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

SearchPage.afterDOMLoaded = `
document.addEventListener("nav", () => {
  // The sidebar Search modal has a Cmd/Ctrl+K shortcut and a click-
  // outside-to-close behavior, neither of which makes sense on the
  // embedded SearchPage where the input is just part of the page. We
  // don't strip those — they fire harmlessly because the embedded
  // .search-container has no fixed positioning to toggle.
  //
  // What we DO want: typing in the embedded input should immediately
  // show results without requiring a click on the search button to
  // "open" the search. The engine's onType handler is wired to the
  // input on every .search-bar, but it only renders results into
  // .search-layout if the parent .search-container has the .active
  // class. Workaround: when the user focuses or types in the embedded
  // input, set .active on its container. From the engine's POV the
  // search is "open"; from the user's POV nothing visible changed
  // because the container is already inline-flowing and styled.
  const root = document.getElementById("search-page")
  if (!root) return
  const container = root.querySelector(".search-container")
  const bar = root.querySelector(".search-bar")
  if (!container || !bar) return

  // Mark active on first interaction so the engine renders results.
  const ensureActive = () => {
    container.classList.add("active")
  }
  bar.addEventListener("focus", ensureActive)
  bar.addEventListener("input", ensureActive)
  window.addCleanup(() => {
    bar.removeEventListener("focus", ensureActive)
    bar.removeEventListener("input", ensureActive)
  })
})
`

SearchPage.css = styles

export default (() => SearchPage) satisfies QuartzComponentConstructor
