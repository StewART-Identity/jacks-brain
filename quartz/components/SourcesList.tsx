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

  async function loadSources() {
    try {
      const response = await fetch("/api/originals")
      const data = await response.json()
      if (data.files && data.files.length > 0) {
        container.innerHTML = '<table class="sources-table">' +
          '<thead><tr><th>File</th><th>Uploaded</th><th>Status</th></tr></thead>' +
          '<tbody>' +
          data.files.map(function(f) {
            const status = f.ingested
              ? '<span class="source-badge ingested">Ingested</span>'
              : '<span class="source-badge pending">Pending</span>'
            const date = f.uploaded || 'Unknown'
            return '<tr>' +
              '<td><a href="' + f.downloadUrl + '" target="_blank">' + f.name + '</a></td>' +
              '<td>' + date + '</td>' +
              '<td>' + status + '</td>' +
              '</tr>'
          }).join('') +
          '</tbody></table>'
      } else {
        container.innerHTML = '<p class="muted">No files uploaded yet.</p>'
      }
    } catch {
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
.source-badge.ingested {
  background: #EBF5EE;
  color: #2B5E3E;
}
.source-badge.pending {
  background: #FBF4E4;
  color: #6B4D1A;
}
:root[saved-theme="dark"] .source-badge.ingested {
  background: #1B3F29;
  color: #7BBF95;
}
:root[saved-theme="dark"] .source-badge.pending {
  background: #6B4D1A;
  color: #D4AD5A;
}
`

export default (() => SourcesList) satisfies QuartzComponentConstructor
