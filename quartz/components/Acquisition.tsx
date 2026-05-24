import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/acquisition.inline"
import styles from "./styles/acquisition.scss"

const Acquisition: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="acquisition-app">
      <div class="recent-runs">
        <div class="recent-runs-header">
          <h3>Cataloging</h3>
          <div class="recent-runs-actions">
            <button id="refresh-runs-btn" class="runs-action-btn" title="Refresh">
              &#8635;
            </button>
          </div>
        </div>
        <div id="runs-list">
          <p class="muted">Loading...</p>
        </div>
      </div>
      {/* Floating selection bar — visibility controlled by acquisition.inline.ts.
          Sits at the bottom of the page when one or more PENDING checkboxes
          are selected. */}
      <div id="queue-selection-bar" class="queue-selection-bar" hidden>
        <span class="queue-selection-count">
          <span id="queue-selection-count-num">0</span> selected
        </span>
        <button id="queue-clear-selection-btn" class="queue-bar-btn-secondary">
          Clear
        </button>
        <button id="queue-remove-btn" class="queue-bar-btn-primary">
          Remove from queue
        </button>
      </div>
    </div>
  )
}

Acquisition.afterDOMLoaded = script
Acquisition.css = styles

export default (() => Acquisition) satisfies QuartzComponentConstructor
