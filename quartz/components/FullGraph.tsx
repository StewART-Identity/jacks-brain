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
    // Label text size multiplier. Smaller value means labels stay
    // readable without dominating the viewport when zoomed in.
    fontSize: 0.3,
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
      <div class="graph-controls">
        <button type="button" id="graph-zoom-in" class="graph-ctrl-btn" title="Zoom in">+</button>
        <button type="button" id="graph-zoom-out" class="graph-ctrl-btn" title="Zoom out">&minus;</button>
        <button type="button" id="graph-fullscreen-btn" class="graph-ctrl-btn" title="Full screen">&#x26F6;</button>
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
`

FullGraph.afterDOMLoaded = script

export default (() => FullGraph) satisfies QuartzComponentConstructor
