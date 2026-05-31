import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * LinksPreview — the rendered, read-only view of the links collection,
 * mounted at application/preview inside the gated wiki.
 *
 * Purpose: a "review your changes" surface. After editing in the Links
 * manager (application/links) and saving, this page shows exactly how the
 * links render — grouped by section, in order — and crucially marks the
 * PRIVATE ones so you can see at a glance what will and won't reach the
 * public page.
 *
 * Data path: reads through the SAME /api/links GET endpoint the manager
 * uses (returns { success, sha, data: { sections } }). This is deliberate
 * — it's a proven, Access-gated route, and it avoids depending on
 * links-data.json being emitted as a static asset (Quartz does not
 * necessarily serve a bare .json from content/, and nothing else relies
 * on it being served, so we don't assume it is).
 *
 * Distinct from the eventual PUBLIC page (served from R2 at
 * files.stewart-identity.com), which renders ONLY public links on a clean
 * light theme. This preview lives inside the wiki, uses the dark house
 * style, and shows EVERYTHING with provenance — it's for the author.
 */
const LinksPreview: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="links-preview-app">
      <div id="links-preview-root">
        <p class="lp-state">Loading…</p>
      </div>
    </div>
  )
}

LinksPreview.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("links-preview-root")
  if (!root) return

  function safeUrl(u) {
    const s = String(u == null ? "" : u).trim()
    if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("/")) return s
    return null
  }

  function render(data) {
    root.innerHTML = ""
    const sections = (data && Array.isArray(data.sections)) ? data.sections : []

    if (sections.length === 0) {
      const p = document.createElement("p")
      p.className = "lp-state"
      p.textContent = "No links yet. Add some on the Links page."
      root.appendChild(p)
      return
    }

    let pubCount = 0, privCount = 0
    sections.forEach(function (s) {
      (s.links || []).forEach(function (l) {
        if (l && l.public === true) pubCount++; else privCount++
      })
    })
    const summary = document.createElement("p")
    summary.className = "lp-summary"
    summary.textContent = pubCount + " public · " + privCount + " private — only public links reach the public page."
    root.appendChild(summary)

    sections.forEach(function (section) {
      const links = Array.isArray(section.links) ? section.links : []
      if (links.length === 0) return

      const secEl = document.createElement("section")
      secEl.className = "lp-section"

      if (section.title) {
        const h2 = document.createElement("h2")
        h2.className = "lp-section-title"
        h2.textContent = section.title
        secEl.appendChild(h2)
      }

      links.forEach(function (link) {
        const isPublic = link && link.public === true
        const row = document.createElement("div")
        row.className = "lp-item" + (isPublic ? " is-public" : " is-private")

        const head = document.createElement("div")
        head.className = "lp-item-head"

        const url = safeUrl(link.url)
        let labelEl
        if (url) {
          labelEl = document.createElement("a")
          labelEl.setAttribute("href", url)
          labelEl.setAttribute("rel", "noopener noreferrer")
          if (url.indexOf("http") === 0) labelEl.setAttribute("target", "_blank")
        } else {
          labelEl = document.createElement("span")
        }
        labelEl.className = "lp-item-label"
        labelEl.textContent = link.label || url || "(no label)"
        head.appendChild(labelEl)

        const badge = document.createElement("span")
        badge.className = "lp-badge " + (isPublic ? "lp-badge-public" : "lp-badge-private")
        badge.textContent = isPublic ? "Public" : "Private"
        head.appendChild(badge)

        row.appendChild(head)

        if (link.description) {
          const desc = document.createElement("div")
          desc.className = "lp-item-desc"
          desc.textContent = link.description
          row.appendChild(desc)
        }

        if (!url && link.url) {
          const warn = document.createElement("div")
          warn.className = "lp-item-warn"
          warn.textContent = "⚠ Unusable URL — won't render on the public page: " + link.url
          row.appendChild(warn)
        }

        secEl.appendChild(row)
      })

      root.appendChild(secEl)
    })
  }

  // Read through the manager's GET endpoint: { success, sha, data:{sections} }
  fetch("/api/links", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json() })
    .then(function (j) {
      if (j && j.success) {
        render(j.data || { sections: [] })
      } else {
        throw new Error((j && j.error) || "unknown error")
      }
    })
    .catch(function () {
      root.innerHTML = ""
      const p = document.createElement("p")
      p.className = "lp-state"
      p.textContent = "Couldn't load the links. If you just saved, give it a moment and reload."
      root.appendChild(p)
    })
})
`

LinksPreview.css = `
#links-preview-app {
  max-width: 100%;
  padding-bottom: 2rem;
}
.lp-state {
  color: var(--gray);
  font-style: italic;
}
.lp-summary {
  color: var(--gray);
  font-size: 0.88rem;
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--lightgray);
}
.lp-section {
  margin-bottom: 1.75rem;
}
.lp-section-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gray);
  margin: 0 0 0.75rem;
  font-weight: 700;
}
.lp-item {
  padding: 0.8rem 1rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
  margin-bottom: 0.6rem;
  border-left-width: 3px;
}
.lp-item.is-public {
  border-left-color: var(--secondary);
}
.lp-item.is-private {
  border-left-color: var(--gray);
  opacity: 0.85;
}
.lp-item-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.lp-item-label {
  font-weight: 600;
  font-size: 1.02rem;
  color: var(--dark);
  text-decoration: none;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}
a.lp-item-label:hover {
  color: var(--secondary);
  text-decoration: underline;
}
.lp-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}
.lp-badge-public {
  background: color-mix(in srgb, var(--secondary) 18%, transparent);
  color: var(--secondary);
  border: 1px solid color-mix(in srgb, var(--secondary) 45%, transparent);
}
.lp-badge-private {
  background: transparent;
  color: var(--gray);
  border: 1px solid var(--lightgray);
}
.lp-item-desc {
  color: var(--gray);
  font-size: 0.9rem;
  margin-top: 0.3rem;
}
.lp-item-warn {
  color: #C46B6B;
  font-size: 0.82rem;
  margin-top: 0.35rem;
}
`

export default (() => LinksPreview) satisfies QuartzComponentConstructor
