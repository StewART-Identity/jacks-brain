import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/graph.inline"
import style from "./styles/graph.scss"

const FullGraph: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const graphConfig = {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.5,
    // Repulsion strength between nodes. Reduced from 1.2 to 0.8 to take
    // some of the agitation out of the simulation — at 1.2 nodes were
    // shoving each other strongly enough that any disturbance propagated
    // visibly across the whole graph.
    repelForce: 0.8,
    centerForce: 0.3,
    linkDistance: 60,
    // Label text size multiplier. 0.6 matches Quartz's default for
    // local/global graphs. Earlier we used 0.3 to compensate for a
    // bug where renderLabels rendered hovered labels too large at
    // zoom; now that renderLabels is zoom-aware, we can use the
    // standard size.
    fontSize: 0.6,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: true,
    enableRadial: true,
    // Cool the simulation down to rest. D3's default 0.0228 keeps the
    // layout in perpetual motion on graphs of any complexity. 0.05 lets
    // it settle in a few seconds, eliminating the "moving in water"
    // feel where every disturbance ripples forever.
    alphaDecay: 0.05,
  }

  return (
    <div class={displayClass} id="full-graph">
      <div class="graph-layouts" id="graph-layouts-toolbar">
        {/*
          Top-left mirror of the zoom/fullscreen toolbar on the right.
          Tier 2 saved-layouts UI: dropdown of saved layouts (active
          name visible, click to open), plus icon buttons for new/save/
          rename/delete. PageTitle.tsx wires up the click handlers in
          its nav callback so the bindings survive SPA navigation
          correctly.

          Button order is deliberate: the dropdown anchors the toolbar,
          then "+" creates a new layout, save and rename act on the
          active layout, delete removes it. Icons stay monochrome and
          monoline; we don't want a floppy emoji shouting against the
          rest of the muted icon language.
        */}
        <button
          type="button"
          id="graph-layouts-current"
          class="graph-ctrl-btn graph-layouts-current"
          title="Switch layout"
        >
          <span class="graph-layouts-current-name">No layout</span>
          <span class="graph-layouts-caret" aria-hidden="true">▾</span>
        </button>
        <button
          type="button"
          id="graph-layouts-new"
          class="graph-ctrl-btn graph-layouts-icon-btn"
          title="New layout"
          aria-label="New layout"
        >
          +
        </button>
        <button
          type="button"
          id="graph-layouts-save"
          class="graph-ctrl-btn graph-layouts-icon-btn"
          title="Save layout (no unsaved changes)"
          aria-label="Save layout"
          disabled
        >
          ⤓
        </button>
        <button
          type="button"
          id="graph-layouts-rename"
          class="graph-ctrl-btn graph-layouts-icon-btn"
          title="Rename layout"
          aria-label="Rename layout"
          disabled
        >
          ✎
        </button>
        <button
          type="button"
          id="graph-layouts-delete"
          class="graph-ctrl-btn graph-layouts-icon-btn graph-layouts-danger"
          title="Delete layout"
          aria-label="Delete layout"
          disabled
        >
          ✕
        </button>
        <div
          id="graph-layouts-menu"
          class="graph-layouts-menu"
          role="menu"
          hidden
        ></div>
      </div>
      <div class="graph-controls">
        <button type="button" id="graph-freeze-btn" class="graph-ctrl-btn" title="Freeze layout (no physics)" aria-pressed="false">❄</button>
        <button type="button" id="graph-filter-btn" class="graph-ctrl-btn" title="Filter by synthesis" aria-pressed="false">⚏</button>
        <button type="button" id="graph-zoom-in" class="graph-ctrl-btn" title="Zoom in">+</button>
        <button type="button" id="graph-zoom-out" class="graph-ctrl-btn" title="Zoom out">&minus;</button>
        <button type="button" id="graph-fullscreen-btn" class="graph-ctrl-btn" title="Full screen">&#x26F6;</button>
      </div>
      <div class="graph-filter-panel" id="graph-filter-panel" hidden>
        <div class="graph-filter-header">
          <h4>Filter by synthesis</h4>
          <p class="graph-filter-hint">
            Uncheck a synthesis to hide its nodes. Pages not part of any synthesis
            are always visible.
          </p>
        </div>
        <div class="graph-filter-body" id="graph-filter-body">
          {/* Filled in by PageTitle's nav handler from window.graphFilter */}
        </div>
      </div>
      <div class="graph-container" data-cfg={JSON.stringify(graphConfig)}></div>
    </div>
  )
}

FullGraph.css =
  style +
  `
#full-graph {
  width: 100%;
  margin: 1rem 0;
  position: relative;
}
#full-graph > .graph-container {
  border-radius: 8px;
  border: 1px solid var(--lightgray);
  background-color: var(--light);
  box-sizing: border-box;
  height: 70vh;
  width: 100%;
  overflow: hidden;
  touch-action: none;
}
#full-graph > .graph-container canvas {
  touch-action: none;
  display: block;
}
#full-graph:fullscreen > .graph-container canvas,
#full-graph:-webkit-full-screen > .graph-container canvas {
  width: 100% !important;
  height: 100% !important;
}
#full-graph:fullscreen,
#full-graph:-webkit-full-screen {
  background: var(--light);
  width: 100vw;
  height: 100vh;
  padding: 0;
  margin: 0;
}
#full-graph:fullscreen > .graph-container,
#full-graph:-webkit-full-screen > .graph-container {
  height: 100%;
  width: 100%;
  border: none;
  border-radius: 0;
}
#full-graph:fullscreen > .graph-controls,
#full-graph:-webkit-full-screen > .graph-controls {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 100;
}
.graph-controls {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.graph-ctrl-btn {
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  color: var(--dark);
  font-size: 1.5rem;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  line-height: 1;
  width: 2.8rem;
  height: 2.8rem;
  text-align: center;
}
.graph-ctrl-btn:hover {
  opacity: 1;
}
.graph-ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.graph-ctrl-btn[aria-pressed="true"] {
  /* Active toggle state — distinguish from a momentary click. The
     freeze button uses this when physics is paused. Border + opacity
     change so it reads as "engaged" without inventing a new color
     that fights the existing palette. */
  opacity: 1;
  border-color: var(--secondary);
  color: var(--secondary);
}

/* ─── Saved layouts toolbar (top-left mirror) ──────────────────────── */
.graph-layouts {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 5;
  display: flex;
  flex-direction: row;
  gap: 0.4rem;
  align-items: flex-start;
}
.graph-layouts-current {
  /* Override .graph-ctrl-btn's fixed-square sizing so the active layout
     name has room. Keeps the same height for visual alignment with the
     icon buttons next to it. */
  width: auto;
  min-width: 9rem;
  max-width: 18rem;
  font-size: 0.9rem;
  padding: 0.4rem 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  text-align: left;
}
.graph-layouts-current .graph-layouts-current-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.graph-layouts-current .graph-layouts-caret {
  font-size: 0.75rem;
  opacity: 0.7;
}
.graph-layouts-icon-btn {
  font-size: 1rem;
  /* Icon buttons inherit the .graph-ctrl-btn 2.8rem square — we keep
     that for visual symmetry with the right-side toolbar. */
}
.graph-layouts-danger:hover:not(:disabled) {
  color: #b00;
}
.graph-layouts-menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  min-width: 12rem;
  max-width: 22rem;
  max-height: 60vh;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 0.3rem;
  font-size: 0.9rem;
}
.graph-layouts-menu[hidden] {
  display: none;
}
.graph-layouts-menu-item {
  display: block;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: none;
  background: transparent;
  color: var(--dark);
  text-align: left;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.graph-layouts-menu-item:hover {
  background: var(--lightgray);
}
.graph-layouts-menu-item.active {
  font-weight: 600;
  color: var(--secondary);
}
.graph-layouts-menu-empty {
  padding: 0.5rem 0.6rem;
  color: var(--gray);
  font-style: italic;
}

#full-graph:fullscreen .graph-layouts,
#full-graph:-webkit-full-screen .graph-layouts {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 100;
}

/* ─── Synthesis filter panel ─────────────────────────────────────────
   Anchored to the right edge of #full-graph, just inside the right
   toolbar's column. Hidden by default via the [hidden] attribute; the
   filter button toggles it. The panel scrolls if the synthesis list
   gets long. */
.graph-filter-panel {
  position: absolute;
  top: 0.5rem;
  right: calc(2.8rem + 1rem);  /* clear of the right toolbar's button column */
  width: 18rem;
  max-height: calc(100% - 1rem);
  z-index: 5;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  font-size: 0.85rem;
}
.graph-filter-panel[hidden] {
  display: none;
}
.graph-filter-header {
  padding: 0.6rem 0.8rem 0.4rem;
  border-bottom: 1px solid var(--lightgray);
}
.graph-filter-header h4 {
  margin: 0 0 0.3rem;
  font-size: 0.95rem;
  color: var(--secondary);
}
.graph-filter-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--gray);
  line-height: 1.3;
}
.graph-filter-body {
  padding: 0.4rem 0.4rem 0.6rem;
}
.graph-filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.graph-filter-row:hover {
  background: var(--lightgray);
}
.graph-filter-row input {
  margin: 0;
  flex-shrink: 0;
  cursor: pointer;
}
.graph-filter-row-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dark);
}
.graph-filter-row-count {
  flex-shrink: 0;
  color: var(--gray);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.graph-filter-empty {
  padding: 0.6rem 0.8rem;
  color: var(--gray);
  font-style: italic;
  font-size: 0.8rem;
}
.graph-filter-actions {
  display: flex;
  gap: 0.3rem;
  padding: 0.4rem 0.4rem;
  border-top: 1px solid var(--lightgray);
  margin-top: 0.3rem;
}
.graph-filter-action {
  flex: 1;
  background: transparent;
  border: 1px solid var(--lightgray);
  border-radius: 4px;
  color: var(--dark);
  padding: 0.3rem;
  font-size: 0.75rem;
  cursor: pointer;
}
.graph-filter-action:hover {
  background: var(--lightgray);
}
#full-graph:fullscreen .graph-filter-panel,
#full-graph:-webkit-full-screen .graph-filter-panel {
  position: fixed;
  top: 1rem;
  right: calc(2.8rem + 2rem);
  z-index: 100;
}
`

FullGraph.afterDOMLoaded = script

export default (() => FullGraph) satisfies QuartzComponentConstructor
