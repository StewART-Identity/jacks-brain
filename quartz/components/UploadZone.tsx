import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/uploadZone.inline"
import styles from "./styles/uploadZone.scss"

const UploadZone: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="upload-app">
      <div class="ingest-card">
        <h3 class="section-label">Upload File</h3>
        <div class="upload-zone" id="drop-zone">
          <div class="upload-icon">&#8693;</div>
          <p class="upload-label">Drop a file here</p>
          <p class="upload-sub">or click to browse — also supports paste (Ctrl+V) for images</p>
          <input
            type="file"
            id="file-input"
            accept=".md,.txt,.pdf,.html,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
          />
        </div>
      </div>

      <div class="ingest-card paste-section">
        <h3>Paste Text</h3>
        <input
          type="text"
          id="paste-title"
          class="paste-title-input"
          placeholder="Title (optional — used for filename)"
        />
        <textarea
          id="paste-input"
          placeholder="Paste or type text here..."
          rows={6}
        ></textarea>
        <div class="paste-row">
          <button id="paste-btn">Ingest</button>
        </div>
      </div>

      <div class="ingest-card youtube-section">
        <h3>Paste YouTube URL</h3>
        <div class="youtube-row">
          <input type="url" id="youtube-input" placeholder="https://www.youtube.com/watch?v=..." />
          <button id="youtube-btn">Ingest</button>
        </div>
      </div>

      <div id="status-area" class="status-area" style="display:none">
        <h3>Status</h3>
        <div id="status-messages"></div>
      </div>

      <div id="recent-runs" class="recent-runs">
        <div class="recent-runs-header">
          <h3>Document Processing</h3>
          <div class="recent-runs-actions">
            <button id="refresh-runs-btn" class="runs-action-btn" title="Refresh">&#8635;</button>
            <button id="clear-runs-btn" class="runs-action-btn" title="Clear">&times;</button>
          </div>
        </div>
        <div id="runs-list">
          <p class="muted">Loading...</p>
        </div>
      </div>
    </div>
  )
}

UploadZone.afterDOMLoaded = script
UploadZone.css = styles

export default (() => UploadZone) satisfies QuartzComponentConstructor
