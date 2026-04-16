import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { classNames } from "../util/lang"

interface Options {
  title: string
  slug: string
  links: { title: string; slug: string }[]
  defaultState: "collapsed" | "open"
}

export default ((opts: Options) => {
  const SidebarLink: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const isOpen = opts.defaultState === "open"
    return (
      <div class={classNames(displayClass, "sidebar-nav")}>
        <button
          type="button"
          class={`sidebar-nav-toggle${isOpen ? "" : " collapsed"}`}
          aria-expanded={isOpen}
        >
          <h2>{opts.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <ul class={`sidebar-nav-list${isOpen ? "" : " collapsed"}`}>
          {opts.links.map((link) => (
            <li>
              <a href={resolveRelative(fileData.slug!, link.slug as any)}>{link.title}</a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  SidebarLink.css = `
.sidebar-nav {
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
}

.sidebar-nav-toggle {
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  padding: 0;
  color: var(--dark);
  display: flex;
  align-items: center;
}
.sidebar-nav-toggle h2 {
  font-size: 1rem;
  margin: 0;
}
.sidebar-nav-toggle .fold {
  margin-left: 0.5rem;
  transition: transform 0.3s ease;
  opacity: 0.8;
}
.sidebar-nav-toggle.collapsed .fold {
  transform: rotateZ(-90deg);
}

ul.sidebar-nav-list {
  list-style: none;
  padding: 0;
  margin: 0.3rem 0;
  overflow: hidden;
  transition: max-height 0.35s ease;
  max-height: 500px;
}
ul.sidebar-nav-list.collapsed {
  max-height: 0;
}
ul.sidebar-nav-list li {
  padding: 0.15rem 0;
}
ul.sidebar-nav-list a {
  color: var(--dark);
  opacity: 0.75;
  text-decoration: none;
  font-size: 0.95rem;
}
ul.sidebar-nav-list a:hover {
  color: var(--secondary);
  opacity: 1;
}
`

  SidebarLink.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const toggles = document.querySelectorAll(".sidebar-nav-toggle")
  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("collapsed")
      const list = toggle.nextElementSibling
      if (list) list.classList.toggle("collapsed")
      toggle.setAttribute("aria-expanded",
        toggle.getAttribute("aria-expanded") === "true" ? "false" : "true"
      )
    })
  }
})
`

  return SidebarLink
}) satisfies QuartzComponentConstructor<Options>
