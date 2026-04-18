import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir}>{title}</a>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 2.25rem;
  margin: 0;
  font-family: var(--titleFont);
}
`

PageTitle.afterDOMLoaded = `
document.addEventListener("nav", function() {
  var toggle = document.querySelector(".mobile-menu-toggle");
  var content = document.querySelector(".sidebar-content");
  if (!toggle || !content) return;
  toggle.addEventListener("click", function() {
    var open = content.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
});
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
