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
}
#full-graph > .graph-container {
  border-radius: 8px;
  border: 1px solid var(--lightgray);
  box-sizing: border-box;
  height: 70vh;
  width: 100%;
  overflow: hidden;
}
`
FullGraph.afterDOMLoaded = script

export default (() => FullGraph) satisfies QuartzComponentConstructor
