import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * PrivateContent — the private landing page, mounted at
 * links/private inside the gated wiki.
 *
 * The private counterpart to the public R2 page: it renders the
 * APPROVED + PRIVATE set — links you've approved but chosen to keep off
 * the public internet. It lives in the wiki (behind Cloudflare Access),
 * reads live via /api/links, and uses the dark house style. No publish
 * step is involved; because it's gated and same-origin, it just reads the
 * current approved+private items each load.
 *
 * Pipeline placement:
 *   Preview         = pending items (the queue)
 *   Public Content  = approved + public  (R2, files.stewart-identity.com)
 *   Private Content = approved + private (here)
 */
const PrivateContent: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="private-content-app">
      <div id="pc-root">
        <p class="pc-state">Loading…</p>
      </div>
    </div>
  )
}

PrivateContent.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("pc-root")
  if (!root) return

  function safeUrl(u) {
    const s = String(u == null ? "" : u).trim()
    if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("/")) return s
    return null
  }

  function render(data) {
    root.innerHTML = ""
    const sections = (data && Array.isArray(data.sections)) ? data.sections : []

    const blocks = []
    let total = 0
    sections.forEach(function (section) {
      const items = (section.links || []).filter(function (l) {
        return l && l.status === "approved" && l.destination === "private"
      })
      total += items.length
      if (items.length > 0) blocks.push({ section: section, items: items })
    })

    if (total === 0) {
      const p = document.createElement("p")
      p.className = "pc-state"
      p.textContent = "No private links yet. Approve a link with the Private destination to see it here."
      root.appendChild(p)
      return
    }

    blocks.forEach(function (block) {
      const secEl = document.createElement("section")
      secEl.className = "pc-section"
      if (block.section.title) {
        const h2 = document.createElement("h2")
        h2.className = "pc-section-title"
        h2.textContent = block.section.title
        secEl.appendChild(h2)
      }
      const list = document.createElement("div")
      list.className = "pc-links"
      block.items.forEach(function (link) {
        const url = safeUrl(link.url)
        const card = document.createElement(url ? "a" : "div")
        card.className = "pc-card"
        if (url) {
          card.setAttribute("href", url)
          card.setAttribute("rel", "noopener noreferrer")
          if (url.indexOf("http") === 0) card.setAttribute("target", "_blank")
        }
        const label = document.createElement("div")
        label.className = "pc-label"
        label.textContent = link.label || url || "(no label)"
        card.appendChild(label)
        if (link.description) {
          const desc = document.createElement("div")
          desc.className = "pc-desc"
          desc.textContent = link.description
          card.appendChild(desc)
        }
        list.appendChild(card)
      })
      secEl.appendChild(list)
      root.appendChild(secEl)
    })
  }

  fetch("/api/links", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json() })
    .then(function (j) {
      if (j && j.success) render(j.data || { sections: [] })
      else throw new Error((j && j.error) || "unknown error")
    })
    .catch(function () {
      root.innerHTML = ""
      const p = document.createElement("p")
      p.className = "pc-state"
      p.textContent = "Couldn't load private links. If you just approved something, give it a moment and reload."
      root.appendChild(p)
    })
})
`

PrivateContent.css = `
#private-content-app {
  max-width: 100%;
  padding-bottom: 2rem;
}
.pc-state {
  color: var(--gray);
  font-style: italic;
}
.pc-section { margin-bottom: 1.75rem; }
.pc-section-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gray);
  margin: 0 0 0.75rem;
  font-weight: 700;
}
.pc-links { display: flex; flex-direction: column; gap: 0.6rem; }
.pc-card {
  display: block;
  text-decoration: none;
  color: inherit;
  padding: 0.85rem 1rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
  border-left: 3px solid var(--gray);
  transition: border-color 0.15s ease, background 0.15s ease;
}
a.pc-card:hover {
  border-color: var(--secondary);
  border-left-color: var(--secondary);
  background: color-mix(in srgb, var(--secondary) 6%, var(--light));
}
.pc-label {
  font-weight: 600;
  font-size: 1.02rem;
  color: var(--dark);
  overflow-wrap: anywhere;
}
a.pc-card:hover .pc-label { color: var(--secondary); }
.pc-desc {
  color: var(--gray);
  font-size: 0.9rem;
  margin-top: 0.3rem;
}
`

export default (() => PrivateContent) satisfies QuartzComponentConstructor
