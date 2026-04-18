import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const SearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return <div class={displayClass} id="search-page"></div>
}

SearchPage.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const searchPage = document.getElementById("search-page")
  if (!searchPage) return

  // Auto-open the search overlay
  setTimeout(() => {
    const searchBtn = document.querySelector(".search-button")
    if (searchBtn) searchBtn.click()
  }, 100)
})
`

export default (() => SearchPage) satisfies QuartzComponentConstructor
