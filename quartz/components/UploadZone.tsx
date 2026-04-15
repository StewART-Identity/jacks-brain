import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/uploadZone.inline"
import styles from "./styles/uploadZone.scss"

const UploadZone: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="upload-app">
      <div class="upload-zone" id="drop-zone">
        <div class="upload-icon">&#8693;</div>
        <p class="upload-label">Drop a file here to ingest</p>
        <p class="upload-sub">or click to browse</p>
        <input type="file" id="file-input" accept=".md,.txt,.pdf,.html,.doc,.docx" />
      </div>

      <div class="divider-row">
        <hr class="divider-line" />
        <span class="divider-text">or</span>
        <hr class="divider-line" />
      </div>

      <div class="youtube-section">
        <h3>Ingest a YouTube video</h3>
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
        <h3>Recent ingestions</h3>
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
