import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/retention.inline"
import styles from "./styles/retention.scss"

const Retention: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="retention-app">
      <div class="recent-runs">
        <div class="recent-runs-header">
          <h3>Document Processing</h3>
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
    </div>
  )
}

Retention.afterDOMLoaded = script
Retention.css = styles

export default (() => Retention) satisfies QuartzComponentConstructor
