import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const SearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="search-page">
      <div class="search-page-cta">
        <button id="begin-search-btn" class="begin-search-btn">Begin Search</button>
      </div>
    </div>
  )
}

SearchPage.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const btn = document.getElementById("begin-search-btn")
  if (!btn) return

  btn.addEventListener("click", () => {
    const searchBtn = document.querySelector(".search-button")
    if (searchBtn) searchBtn.click()
  })
})
`

SearchPage.css = `
.search-page-cta {
  text-align: center;
  margin-top: 2rem;
}
.begin-search-btn {
  padding: 0.8rem 2rem;
  background: var(--secondary);
  color: var(--light);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.begin-search-btn:hover {
  opacity: 0.85;
}
`

export default (() => SearchPage) satisfies QuartzComponentConstructor
