import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/graph.inline"
import style from "./styles/graph.scss"

const FullGraph: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const graphConfig = {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.9,
    repelForce: 0.5,
    centerForce: 0.2,
    linkDistance: 30,
    fontSize: 0.6,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: true,
    enableRadial: true,
  }

  return (
    <div class={displayClass} id="full-graph">
      <button type="button" id="graph-fullscreen-btn" class="graph-fullscreen-btn" title="Full screen">
        &#x26F6;
      </button>
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
  box-sizing: border-box;
  height: 70vh;
  width: 100%;
  overflow: hidden;
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
#full-graph:fullscreen > .graph-fullscreen-btn,
#full-graph:-webkit-full-screen > .graph-fullscreen-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 100;
}
.graph-fullscreen-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 5;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  color: var(--dark);
  font-size: 1.1rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  line-height: 1;
}
.graph-fullscreen-btn:hover {
  opacity: 1;
}
`

FullGraph.afterDOMLoaded = script

export default (() => FullGraph) satisfies QuartzComponentConstructor
