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
    return (
      <div class={classNames(displayClass, "sidebar-nav")}>
        <h2 class="sidebar-nav-heading">{opts.title}</h2>
        <ul class="sidebar-nav-list">
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
}

.sidebar-nav-heading {
  font-size: 1.1rem;
  margin: 0;
  color: var(--dark);
}

ul.sidebar-nav-list {
  list-style: none;
  padding: 0;
  margin: 0.3rem 0;
}
ul.sidebar-nav-list li {
  padding: 0.15rem 0;
}
ul.sidebar-nav-list a {
  color: var(--dark);
  opacity: 0.75;
  text-decoration: none;
  font-size: 1.05rem;
}
ul.sidebar-nav-list a:hover {
  color: var(--secondary);
  opacity: 1;
}
`

  return SidebarLink
}) satisfies QuartzComponentConstructor<Options>
