import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const SourcesList: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="sources-list-app">
      <div id="sources-list">
        <p class="muted">Loading...</p>
      </div>
    </div>
  )
}

SourcesList.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const container = document.getElementById("sources-list")
  if (!container) return

  let allFiles = []
  let sortField = "uploaded"
  let sortAsc = false

  function renderTable() {
    if (allFiles.length === 0) {
      container.innerHTML = '<p class="muted">No acquisitions yet.</p>'
      return
    }

    const sorted = [...allFiles].sort(function(a, b) {
      let valA, valB
      if (sortField === "name") {
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
      } else if (sortField === "acquired") {
        valA = a.acquired || ""
        valB = b.acquired || ""
      } else {
        valA = a.cataloged ? 1 : 0
        valB = b.cataloged ? 1 : 0
      }
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    function arrow(field) {
      if (sortField !== field) return ""
      return sortAsc ? " \\u25B2" : " \\u25BC"
    }

    container.innerHTML = '<table class="sources-table">' +
      '<thead><tr>' +
      '<th class="sortable" data-sort="name">File' + arrow("name") + '</th>' +
      '<th class="sortable" data-sort="acquired">Acquired' + arrow("acquired") + '</th>' +
      '<th class="sortable" data-sort="status">Status' + arrow("status") + '</th>' +
      '</tr></thead>' +
      '<tbody>' +
      sorted.map(function(f) {
        var status = f.cataloged
          ? '<span class="source-badge cataloged">Cataloged</span>'
          : '<span class="source-badge pending">Pending</span>'
        var date = f.acquired || "Unknown"
        return '<tr>' +
          '<td><a href="' + f.downloadUrl + '" target="_blank">' + f.name + '</a></td>' +
          '<td>' + date + '</td>' +
          '<td>' + status + '</td>' +
          '</tr>'
      }).join("") +
      '</tbody></table>'

    container.querySelectorAll("th.sortable").forEach(function(th) {
      th.addEventListener("click", function() {
        var field = th.getAttribute("data-sort")
        if (sortField === field) {
          sortAsc = !sortAsc
        } else {
          sortField = field
          sortAsc = true
        }
        renderTable()
      })
    })
  }

  async function loadSources() {
    try {
      var response = await fetch("/api/originals")
      var data = await response.json()
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
.sources-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.sources-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 2px solid var(--lightgray);
  font-weight: 600;
  color: var(--dark);
}
.sources-table th.sortable {
  cursor: pointer;
  user-select: none;
}
.sources-table th.sortable:hover {
  color: var(--secondary);
}
.sources-table td {
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--lightgray);
}
.sources-table a {
  color: var(--secondary);
  text-decoration: none;
}
.sources-table a:hover {
  text-decoration: underline;
}
.source-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.source-badge.cataloged {
  background: #EBF5EE;
  color: #2B5E3E;
}
.source-badge.pending {
  background: #FBF4E4;
  color: #6B4D1A;
}
:root[saved-theme="dark"] .source-badge.cataloged {
  background: #1B3F29;
  color: #7BBF95;
}
:root[saved-theme="dark"] .source-badge.pending {
  background: #6B4D1A;
  color: #D4AD5A;
}
`

export default (() => SourcesList) satisfies QuartzComponentConstructor
