import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/* SourcesList — the dynamic table on `reflect/sources` that lists
   raw uploaded files (acquired but not yet cataloged) by fetching from
   `/api/originals`.

   This component shares the unified `.jb-table` look with the four
   PageList collection tables. Because the markup is built at runtime
   from API JSON (not server-rendered), the `table-container jb-table`
   classes are applied to the host <div> instead of to a wrapping
   element inside the script. The script then writes a bare <table>
   into that container, and the styles in _jbtable.scss apply
   automatically. */

const SourcesList: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="sources-list-app">
      <div id="sources-list" class="table-container jb-table">
        <p class="muted">Loading...</p>
      </div>
    </div>
  )
}

SourcesList.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const container = document.getElementById("sources-list")
  if (!container) return

  // HTML-escape any string before interpolating it into innerHTML.
  // Covers ALL five HTML-significant characters (& must come first or
  // it would re-escape the others' replacement entities). Used for
  // filenames, dates, and URLs from /api/originals — none of which we
  // control directly. An unescaped URL containing a stray double-quote
  // would break out of the href attribute; an unescaped \`<\` in any
  // field would inject markup. Cheap defense.
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  // Defense against javascript: / data: URIs. HTML-entity escaping
  // doesn't neutralize a URL like \`javascript:alert(1)\` — escaping
  // only protects the attribute boundary, not the URL scheme itself.
  // We accept only http(s) absolute URLs and same-origin relative
  // paths; anything else gets replaced with "#" so the link
  // becomes inert.
  function safeUrl(u) {
    const s = String(u == null ? "" : u).trim()
    if (s === "") return "#"
    if (s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://")) {
      return esc(s)
    }
    return "#"
  }

  let allFiles = []

  // Default sort: pending first by cataloged status (ascending, since
  // pending = false = 0 sorts before cataloged = true = 1).
  let sortField = "status"
  let sortAsc = true

  function indicator(asc) {
    return asc ? "▲" : "▼"
  }

  function renderTable() {
    if (allFiles.length === 0) {
      container.innerHTML = '<p class="muted">No acquisitions yet.</p>'
      return
    }

    const sorted = [...allFiles].sort(function(a, b) {
      let valA, valB
      if (sortField === "name") {
        valA = (a.name || "").toLowerCase()
        valB = (b.name || "").toLowerCase()
      } else if (sortField === "acquired") {
        valA = a.acquired || ""
        valB = b.acquired || ""
      } else {
        // status: pending (false) = 0, cataloged (true) = 1
        valA = a.cataloged ? 1 : 0
        valB = b.cataloged ? 1 : 0
      }
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    function thFor(field, label) {
      const isActive = sortField === field
      const cls = isActive ? "sortable sort-active" : "sortable"
      const indText = isActive ? indicator(sortAsc) : "⇅"
      const colCls = "col-" + field
      return '<th class="' + cls + ' ' + colCls + '" data-sort="' + field + '">' +
             label +
             ' <span class="sort-indicator">' + indText + '</span>' +
             '</th>'
    }

    container.innerHTML = '<table>' +
      '<thead><tr>' +
      thFor("name", "Source") +
      thFor("acquired", "Acquired") +
      thFor("status", "Status") +
      '</tr></thead>' +
      '<tbody>' +
      sorted.map(function(f) {
        const status = f.cataloged
          ? '<span class="source-badge cataloged">Cataloged</span>'
          : '<span class="source-badge pending">Pending</span>'
        const safeName = esc(f.name)
        const url = safeUrl(f.downloadUrl)
        const safeDate = esc(f.acquired || "Unknown")
        return '<tr>' +
          '<td class="col-name"><a href="' + url + '" target="_blank" rel="noopener">' + safeName + '</a></td>' +
          '<td class="col-acquired">' + safeDate + '</td>' +
          '<td class="col-status">' + status + '</td>' +
          '</tr>'
      }).join("") +
      '</tbody></table>'

    container.querySelectorAll("th.sortable").forEach(function(th) {
      function onClick() {
        const field = th.getAttribute("data-sort")
        if (sortField === field) {
          sortAsc = !sortAsc
        } else {
          sortField = field
          // Sensible default direction per column when first clicked:
          // - name: A to Z (ascending)
          // - acquired: newest first (descending)
          // - status: pending first (ascending — pending=0 before cataloged=1)
          sortAsc = field !== "acquired"
        }
        renderTable()
      }
      th.addEventListener("click", onClick)
      window.addCleanup(function() {
        th.removeEventListener("click", onClick)
      })
    })
  }

  async function loadSources() {
    try {
      const response = await fetch("/api/originals")
      const data = await response.json()
      allFiles = data.files || []
      renderTable()
    } catch (e) {
      container.innerHTML = '<p class="muted">Could not load sources.</p>'
    }
  }

  loadSources()
})
`

SourcesList.css = `
#sources-list-app {
  margin-top: 1rem;
}

/* Column widths for the SourcesList dynamic table.
   Source: bulk of the row (filenames are long).
   Acquired: fixed timestamp width.
   Status: just enough for the badge. */
#sources-list.jb-table th.col-name,
#sources-list.jb-table td.col-name {
  width: 60%;
  font-weight: 500;
}
#sources-list.jb-table th.col-acquired,
#sources-list.jb-table td.col-acquired {
  width: 22%;
  white-space: nowrap;
}
#sources-list.jb-table th.col-status,
#sources-list.jb-table td.col-status {
  width: 18%;
  white-space: nowrap;
}

/* The link in the Source column inherits the site's --secondary color
   via base.scss's \`a\` rule, which on dark green rows reads as a
   muted green-on-green. Override to the warm sand (matches the
   header text) so filenames pop against the row backgrounds. */
#sources-list.jb-table td.col-name a {
  color: #F0DDB3;
  text-decoration: none;
}
#sources-list.jb-table td.col-name a:hover {
  text-decoration: underline;
}

/* Status badges — retuned for dark green rows.

   Cataloged: sage-green badge that reads as "approved" without
   screaming. Background is one step lighter than the row borders so
   it sits forward visually.

   Pending: warm sand/amber pill, ties to the existing palette
   (textHighlight = #F0DDB3, dark-mode textHighlight = #6B4D1A). */
.source-badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.source-badge.cataloged {
  background: #3A7D53;
  color: #EBF5EE;
}
.source-badge.pending {
  background: #6B4D1A;
  color: #F0DDB3;
}
`

export default (() => SourcesList) satisfies QuartzComponentConstructor
