import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/researchPage.inline"
import styles from "./styles/researchPage.scss"

const ResearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="research-app">
      <div class="research-card">
        <h3 class="section-label">Ask Claude to find sources</h3>
        <textarea
          id="research-query"
          placeholder="What do you want to learn? Ask a question or describe what you're looking for..."
          rows={4}
        ></textarea>
        <label class="research-rank-toggle">
          <input type="checkbox" id="research-rank" checked />
          Rank with Claude
        </label>
        <div class="research-controls">
          <div class="research-count-group">
            <label class="research-count-label" for="research-count">
              Number of results
            </label>
            <input
              type="number"
              id="research-count"
              min="1"
              max="25"
              value="10"
              class="research-count-input"
            />
          </div>
          <button id="research-btn" class="research-btn">
            Search
          </button>
        </div>
        <div id="research-status" class="card-status" style="display:none"></div>
      </div>

      <div id="research-results" class="research-results" style="display:none">
        <div class="research-results-header">
          <h3>
            Results <span id="research-provider" class="research-provider"></span>
          </h3>
          <button id="ingest-selected-btn" class="ingest-selected-btn" disabled>
            Ingest selected
          </button>
        </div>
        <div id="research-results-list"></div>
        <div id="research-ingest-status" class="card-status" style="display:none"></div>
      </div>
    </div>
  )
}

ResearchPage.afterDOMLoaded = script
ResearchPage.css = styles

export default (() => ResearchPage) satisfies QuartzComponentConstructor
