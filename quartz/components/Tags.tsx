import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * Tags — force-directed network of tag co-occurrence.
 *
 * Component shell is small; the inline script does the heavy
 * lifting after fetching /static/corpus.json. Same pattern as the
 * other Visualize sub-pages (Timeline, Subjects).
 */
const Tags: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="tags-app">
      <div class="search-page-card">
        <h3 class="search-page-label">Tags</h3>

        <div class="tags-legend" aria-label="Node color legend">
          <span class="tags-legend-item">
            <span class="tags-legend-swatch" data-kind="subject"></span> Also a subject
          </span>
          <span class="tags-legend-item">
            <span class="tags-legend-swatch" data-kind="tag-only"></span> Tag only
          </span>
        </div>

        <div class="tags-svg-wrap" id="tags-svg-wrap">
          <p class="muted tags-loading">Loading the corpus…</p>
        </div>

        <div class="tags-tooltip" id="tags-tooltip" hidden></div>
      </div>
    </div>
  )
}

Tags.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("tags-app")
  if (!root) return

  const wrap = document.getElementById("tags-svg-wrap")
  const tooltip = document.getElementById("tags-tooltip")
  if (!wrap || !tooltip) return

  // ─── Constants ───────────────────────────────────────────────────
  // Colors are picked to match the rest of the Visualize family:
  // --secondary (gold) for subject-flavored nodes, --tertiary (sage)
  // for tag-only nodes. Edges are --lightgray with opacity scaled
  // by weight.
  const COLOR_SUBJECT = "#D4AD5A"
  const COLOR_TAG_ONLY = "#7BBF95"
  const COLOR_EDGE = "#1B3F29"

  // SVG viewBox dimensions. The simulation runs in these coordinates.
  const VB_W = 720
  const VB_H = 520

  // Simulation parameters. Tuned empirically against a ~80-tag, ~250-edge
  // graph (typical for a wiki of your scale). If your data ends up
  // very different, the most useful knobs to retune are CHARGE_STRENGTH
  // (more negative = more repulsion, nodes spread further) and
  // LINK_DISTANCE (lower = nodes pulled closer together along edges).
  const CHARGE_STRENGTH = -180   // node repulsion
  const LINK_DISTANCE = 48       // ideal edge length
  const LINK_STRENGTH = 0.4      // how stiff edges are
  const CENTER_STRENGTH = 0.04   // pull toward (VB_W/2, VB_H/2)
  const VELOCITY_DECAY = 0.4     // 0 = frictionless, 1 = max friction
  const ALPHA_DECAY = 0.012      // how fast the simulation cools

  // Node radius scale. Tags-with-one-page get the minimum radius;
  // tags with many pages get larger up to MAX_NODE_RADIUS. Log-scale
  // because tag-count distributions are usually heavy-tailed.
  const MIN_NODE_RADIUS = 4
  const MAX_NODE_RADIUS = 18

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  // ─── Data extraction ─────────────────────────────────────────────
  //
  // From the corpus, build:
  //   - nodes: one per distinct tag, with .count (number of pages)
  //     and .isSubject (boolean — is this tag also in some page's
  //     subjects: field?)
  //   - edges: one per unordered pair of tags that co-occur, with
  //     .weight (number of pages where both appear)
  //   - pagesForTag: tag → list of {slug, title} (for tooltips)
  //   - topCoTagsFor: tag → list of {tag, weight} (for tooltips)
  //
  // Subject membership is derived from the union of all subjects on
  // all pages, not from any single page. A tag is "also a subject"
  // if it appears as a value in any page's subjects: field anywhere
  // in the corpus.

  function extract(corpus) {
    const tagCount = new Map()        // tag -> page count
    const pagesForTag = new Map()     // tag -> [{slug, title}]
    const subjectSet = new Set()      // every subject ever used
    const edgeWeight = new Map()      // "a||b" -> count (a < b)

    for (const page of corpus.pages) {
      const tags = Array.isArray(page.tags) ? page.tags : []
      const subjects = Array.isArray(page.subjects) ? page.subjects : []

      for (const s of subjects) subjectSet.add(s)

      for (const t of tags) {
        tagCount.set(t, (tagCount.get(t) || 0) + 1)
        if (!pagesForTag.has(t)) pagesForTag.set(t, [])
        pagesForTag.get(t).push({ slug: page.slug, title: page.title })
      }

      // Pairwise co-occurrences. Dedupe so each unordered pair is
      // counted once per page. Use the canonical "smaller||larger"
      // ordering so a-b and b-a both map to one key.
      const uniqTags = Array.from(new Set(tags))
      for (let i = 0; i < uniqTags.length; i++) {
        for (let j = i + 1; j < uniqTags.length; j++) {
          const a = uniqTags[i]
          const b = uniqTags[j]
          const key = a < b ? a + "||" + b : b + "||" + a
          edgeWeight.set(key, (edgeWeight.get(key) || 0) + 1)
        }
      }
    }

    // Nodes — all tags, regardless of count (per the user's choice
    // to include singletons; the simulation will push them to the
    // periphery as conceptual noise).
    const nodes = Array.from(tagCount.entries()).map(([tag, count]) => ({
      id: tag,
      count,
      isSubject: subjectSet.has(tag),
      // Initial position: random within the viewBox. The simulation
      // will move them.
      x: Math.random() * VB_W,
      y: Math.random() * VB_H,
      vx: 0,
      vy: 0,
      // Pre-computed render radius.
      r: 0,
    }))

    // Compute render radii once.
    const maxCount = Math.max(...nodes.map((n) => n.count), 1)
    const logMax = Math.log(maxCount + 1)
    for (const n of nodes) {
      const ratio = logMax > 0 ? Math.log(n.count + 1) / logMax : 0
      n.r = MIN_NODE_RADIUS + ratio * (MAX_NODE_RADIUS - MIN_NODE_RADIUS)
    }

    // Edges — drop self-edges defensively (shouldn't exist but).
    const edges = []
    for (const [key, weight] of edgeWeight) {
      const [a, b] = key.split("||")
      if (a === b) continue
      const sourceNode = nodes.find((n) => n.id === a)
      const targetNode = nodes.find((n) => n.id === b)
      if (!sourceNode || !targetNode) continue
      edges.push({ source: sourceNode, target: targetNode, weight })
    }

    // For tooltips: top N co-occurring tags for each tag.
    const topCoTagsFor = new Map()
    for (const n of nodes) {
      const partners = []
      for (const e of edges) {
        if (e.source.id === n.id) partners.push({ tag: e.target.id, weight: e.weight })
        else if (e.target.id === n.id) partners.push({ tag: e.source.id, weight: e.weight })
      }
      partners.sort((a, b) => b.weight - a.weight)
      topCoTagsFor.set(n.id, partners.slice(0, 5))
    }

    return { nodes, edges, pagesForTag, topCoTagsFor, maxEdgeWeight: Math.max(...edges.map(e => e.weight), 1) }
  }

  // ─── Force simulation ────────────────────────────────────────────
  //
  // Plain O(n²) repulsion + O(e) edge spring forces + O(n) center
  // pull. Velocity-Verlet-ish integration: accumulate forces into
  // velocity, decay velocity, integrate to position. The simulation
  // 'alpha' (temperature) starts at 1 and decays to 0; force magnitudes
  // scale with alpha so the simulation cools smoothly.

  let simulation = null

  function makeSimulation(nodes, edges) {
    let alpha = 1.0

    function step() {
      if (alpha < 0.005) return false  // converged

      // Repulsion between all pairs.
      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j]
          let dx = nj.x - ni.x
          let dy = nj.y - ni.y
          let dist2 = dx * dx + dy * dy
          if (dist2 < 0.01) {
            // Same position — perturb so we don't divide by zero.
            dx = Math.random() - 0.5
            dy = Math.random() - 0.5
            dist2 = 1
          }
          const dist = Math.sqrt(dist2)
          // Charge force inversely proportional to distance.
          const force = CHARGE_STRENGTH * alpha / dist2
          const fx = force * (dx / dist)
          const fy = force * (dy / dist)
          ni.vx -= fx
          ni.vy -= fy
          nj.vx += fx
          nj.vy += fy
        }
      }

      // Edge spring forces. Hooke's law toward LINK_DISTANCE,
      // scaled by edge weight (heavier edges pull harder).
      const maxWeight = Math.max(...edges.map((e) => e.weight), 1)
      for (const e of edges) {
        const dx = e.target.x - e.source.x
        const dy = e.target.y - e.source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const weightFactor = 0.5 + 0.5 * (e.weight / maxWeight)
        const delta = (dist - LINK_DISTANCE) / dist
        const force = LINK_STRENGTH * alpha * weightFactor * delta
        const fx = dx * force
        const fy = dy * force
        e.source.vx += fx
        e.source.vy += fy
        e.target.vx -= fx
        e.target.vy -= fy
      }

      // Centering pull toward viewport center.
      const cx = VB_W / 2
      const cy = VB_H / 2
      for (const n of nodes) {
        n.vx += (cx - n.x) * CENTER_STRENGTH * alpha
        n.vy += (cy - n.y) * CENTER_STRENGTH * alpha
      }

      // Integrate. Velocity decay = friction.
      for (const n of nodes) {
        n.vx *= (1 - VELOCITY_DECAY)
        n.vy *= (1 - VELOCITY_DECAY)
        n.x += n.vx
        n.y += n.vy
      }

      // Cool down.
      alpha *= (1 - ALPHA_DECAY)
      return true
    }

    return {
      step,
      getAlpha: () => alpha,
      reheat: () => { alpha = Math.max(alpha, 0.3) },
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────
  //
  // We re-render the SVG every frame during simulation warmup. That
  // sounds expensive but the data is small: 80 nodes × ~30 attrs is
  // a 3KB innerHTML write at 60fps. The browser is fine with it.
  // Once the simulation converges, we stop animating and only
  // re-render on user interaction (hover/zoom).

  let hoveredTag = null
  let viewTransform = { tx: 0, ty: 0, k: 1 }  // pan + zoom

  function renderSVG(nodes, edges, maxEdgeWeight) {
    let svg = '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tag co-occurrence network">'

    // Apply zoom/pan via a wrapping transform group.
    const transform = "translate(" + viewTransform.tx + " " + viewTransform.ty + ") scale(" + viewTransform.k + ")"
    svg += '<g class="tags-canvas" transform="' + transform + '">'

    // Compute hover focus: if a tag is hovered, find its neighbors.
    const focusSet = new Set()
    if (hoveredTag) {
      focusSet.add(hoveredTag)
      for (const e of edges) {
        if (e.source.id === hoveredTag) focusSet.add(e.target.id)
        else if (e.target.id === hoveredTag) focusSet.add(e.source.id)
      }
    }

    // Edges first (so nodes sit on top).
    for (const e of edges) {
      const isFocused = !hoveredTag ||
        e.source.id === hoveredTag || e.target.id === hoveredTag
      const baseOpacity = 0.25 + 0.55 * (e.weight / maxEdgeWeight)
      const opacity = isFocused ? baseOpacity : baseOpacity * 0.15
      const strokeWidth = 0.6 + (e.weight / maxEdgeWeight) * 2.2
      svg += '<line x1="' + e.source.x + '" y1="' + e.source.y + '" x2="' + e.target.x + '" y2="' + e.target.y + '" stroke="' + COLOR_EDGE + '" stroke-opacity="' + opacity.toFixed(3) + '" stroke-width="' + strokeWidth.toFixed(2) + '"/>'
    }

    // Nodes.
    for (const n of nodes) {
      const isFocused = !hoveredTag || focusSet.has(n.id)
      const opacity = isFocused ? 1 : 0.25
      const color = n.isSubject ? COLOR_SUBJECT : COLOR_TAG_ONLY
      const label = n.id

      svg += '<g class="tags-node" data-tag="' + escapeXml(n.id) + '" tabindex="0" role="button" aria-label="' + escapeXml(n.id) + ', ' + n.count + ' pages" opacity="' + opacity + '">'
      // Transparent hit area, slightly larger than the visible dot.
      svg += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + (n.r + 4) + '" fill="transparent"/>'
      svg += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="' + color + '" stroke="var(--light)" stroke-width="1.2"/>'
      // Label, only for larger nodes (otherwise it's just clutter).
      if (n.r >= 8 || hoveredTag === n.id) {
        const fontSize = hoveredTag === n.id ? 13 : 11
        svg += '<text x="' + n.x + '" y="' + (n.y + n.r + 12) + '" text-anchor="middle" class="tags-node-label" font-size="' + fontSize + '">' + escapeXml(label) + '</text>'
      }
      svg += '</g>'
    }

    svg += '</g>'
    svg += '</svg>'
    wrap.innerHTML = svg
  }

  // ─── Animation loop ──────────────────────────────────────────────

  let animFrame = null
  let stopAnimation = false

  function startAnimation(nodes, edges, maxEdgeWeight) {
    function loop() {
      if (stopAnimation) return
      const still = simulation.step()
      renderSVG(nodes, edges, maxEdgeWeight)
      bindEvents(nodes, edges, maxEdgeWeight)
      if (still) {
        animFrame = requestAnimationFrame(loop)
      }
    }
    animFrame = requestAnimationFrame(loop)
  }

  // ─── Event binding (re-bound after every render) ─────────────────
  //
  // Each render replaces innerHTML, which detaches the previous
  // listeners. We re-bind after each render. To keep the listener
  // count bounded we use event delegation: one set of listeners on
  // the SVG root, dispatching by closest(".tags-node").

  let eventsBound = false
  function bindEvents(nodes, edges, maxEdgeWeight) {
    const svg = wrap.querySelector("svg")
    if (!svg) return

    // Only attach listeners once per SVG. Since renderSVG replaces
    // the SVG element each frame, we need to re-bind, but the
    // listeners themselves close over the same arrays so no leak.
    function onMouseMove(e) {
      const target = e.target.closest(".tags-node")
      if (!target) {
        if (hoveredTag !== null) {
          hoveredTag = null
          hideTooltip()
          renderSVG(nodes, edges, maxEdgeWeight)
          bindEvents(nodes, edges, maxEdgeWeight)
        }
        return
      }
      const tag = target.getAttribute("data-tag")
      if (tag !== hoveredTag) {
        hoveredTag = tag
        renderSVG(nodes, edges, maxEdgeWeight)
        bindEvents(nodes, edges, maxEdgeWeight)
      }
      const node = nodes.find((n) => n.id === tag)
      if (node) showTooltip(node, e.clientX, e.clientY)
    }

    function onMouseLeave() {
      if (hoveredTag !== null) {
        hoveredTag = null
        renderSVG(nodes, edges, maxEdgeWeight)
        bindEvents(nodes, edges, maxEdgeWeight)
      }
      hideTooltip()
    }

    function onClick(e) {
      const target = e.target.closest(".tags-node")
      if (!target) return
      const tag = target.getAttribute("data-tag")
      if (tag) {
        window.location.href = "/tags/" + encodeURIComponent(tag)
      }
    }

    function onKeyDown(e) {
      if (e.key !== "Enter" && e.key !== " ") return
      const target = e.target.closest && e.target.closest(".tags-node")
      if (!target) return
      e.preventDefault()
      const tag = target.getAttribute("data-tag")
      if (tag) {
        window.location.href = "/tags/" + encodeURIComponent(tag)
      }
    }

    function onWheel(e) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newK = Math.max(0.4, Math.min(3, viewTransform.k * delta))
      // Zoom around the mouse position.
      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const scaleX = VB_W / rect.width
      const scaleY = VB_H / rect.height
      const svgX = mouseX * scaleX
      const svgY = mouseY * scaleY
      viewTransform.tx = svgX - (svgX - viewTransform.tx) * (newK / viewTransform.k)
      viewTransform.ty = svgY - (svgY - viewTransform.ty) * (newK / viewTransform.k)
      viewTransform.k = newK
      renderSVG(nodes, edges, maxEdgeWeight)
      bindEvents(nodes, edges, maxEdgeWeight)
    }

    let panStart = null
    function onMouseDown(e) {
      if (e.target.closest(".tags-node")) return  // node click, not pan
      panStart = { x: e.clientX, y: e.clientY, tx0: viewTransform.tx, ty0: viewTransform.ty }
      svg.style.cursor = "grabbing"
    }
    function onMouseMovePan(e) {
      if (!panStart) return
      const rect = svg.getBoundingClientRect()
      const scaleX = VB_W / rect.width
      const scaleY = VB_H / rect.height
      viewTransform.tx = panStart.tx0 + (e.clientX - panStart.x) * scaleX
      viewTransform.ty = panStart.ty0 + (e.clientY - panStart.y) * scaleY
      renderSVG(nodes, edges, maxEdgeWeight)
      bindEvents(nodes, edges, maxEdgeWeight)
    }
    function onMouseUpPan() {
      panStart = null
      svg.style.cursor = ""
    }

    svg.addEventListener("mousemove", onMouseMove)
    svg.addEventListener("mousemove", onMouseMovePan)
    svg.addEventListener("mouseleave", onMouseLeave)
    svg.addEventListener("click", onClick)
    svg.addEventListener("keydown", onKeyDown)
    svg.addEventListener("wheel", onWheel, { passive: false })
    svg.addEventListener("mousedown", onMouseDown)
    document.addEventListener("mouseup", onMouseUpPan)

    if (!eventsBound && window.addCleanup) {
      eventsBound = true
      window.addCleanup(() => {
        stopAnimation = true
        if (animFrame) cancelAnimationFrame(animFrame)
        document.removeEventListener("mouseup", onMouseUpPan)
      })
    }
  }

  function showTooltip(node, clientX, clientY) {
    const wrapRect = wrap.getBoundingClientRect()

    const partners = topCoTagsFor.get(node.id) || []
    const partnersHtml = partners.length > 0
      ? partners.map((p) =>
          '<div class="tags-tooltip-row">' +
          '<span class="tags-tooltip-partner">' + escapeXml(p.tag) + '</span>' +
          '<span class="tags-tooltip-weight">' + p.weight + '</span>' +
          '</div>'
        ).join("")
      : '<div class="tags-tooltip-empty">No co-occurring tags</div>'

    const subjectBadge = node.isSubject
      ? '<span class="tags-tooltip-tag-subject">also a subject</span>'
      : ''

    tooltip.innerHTML =
      '<div class="tags-tooltip-title">' +
        escapeXml(node.id) + subjectBadge +
      '</div>' +
      '<div class="tags-tooltip-total">' + node.count + ' ' + (node.count === 1 ? 'page' : 'pages') + '</div>' +
      (partners.length > 0
        ? '<div class="tags-tooltip-section-label">Top co-occurs with</div>'
        : '') +
      '<div class="tags-tooltip-partners">' + partnersHtml + '</div>'

    tooltip.hidden = false
    const left = clientX - wrapRect.left + 14
    const top = clientY - wrapRect.top + 14
    tooltip.style.left = left + "px"
    tooltip.style.top = top + "px"
  }

  function hideTooltip() {
    tooltip.hidden = true
  }

  // ─── Load and start ──────────────────────────────────────────────

  let topCoTagsFor = new Map()

  fetch("/static/corpus.json")
    .then((r) => r.json())
    .then((data) => {
      const extracted = extract(data)
      topCoTagsFor = extracted.topCoTagsFor
      if (extracted.nodes.length === 0) {
        wrap.innerHTML = '<p class="muted" style="text-align:center;padding:2rem 0">No tags in the corpus yet. Add a <code>tags:</code> field to your page frontmatter to start filling this in.</p>'
        return
      }
      simulation = makeSimulation(extracted.nodes, extracted.edges)
      startAnimation(extracted.nodes, extracted.edges, extracted.maxEdgeWeight)
    })
    .catch((err) => {
      wrap.innerHTML = '<p class="muted">Could not load the corpus: ' + escapeXml(err.message) + '</p>'
    })
})
`

Tags.css = `
#tags-app {
  max-width: 720px;
  padding-bottom: 2rem;
}

#tags-app .search-page-card {
  padding: 1.25rem 1.25rem 1.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
}

#tags-app .search-page-label {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: var(--dark);
}

/* Legend */
.tags-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin: 0.5rem 0;
  font-size: 0.82rem;
  color: var(--gray);
}
.tags-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.tags-legend-swatch {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
}
.tags-legend-swatch[data-kind="subject"]   { background: #D4AD5A; }
.tags-legend-swatch[data-kind="tag-only"]  { background: #7BBF95; }

/* SVG wrap — relative so the tooltip is positioned inside it. */
.tags-svg-wrap {
  position: relative;
  width: 100%;
  min-height: 520px;
  margin-top: 0.5rem;
  /* Background color is the card fill, so node strokes (--light)
     show through cleanly. */
}
.tags-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
  cursor: grab;
  user-select: none;
}
.tags-loading {
  margin: 0;
  padding: 1rem 0;
}

/* Node interaction */
.tags-node {
  cursor: pointer;
  transition: opacity 0.12s ease;
}
.tags-node:focus-visible {
  outline: none;
}
.tags-node:focus-visible circle:nth-child(2) {
  stroke: var(--secondary);
  stroke-width: 2.5;
}
.tags-node:hover circle:nth-child(2) {
  filter: brightness(1.15);
}

/* SVG text */
.tags-node-label {
  fill: var(--darkgray);
  font-family: inherit;
  font-weight: 500;
  pointer-events: none;
  paint-order: stroke;
  stroke: var(--light);
  stroke-width: 2.5;
  stroke-opacity: 0.8;
  stroke-linejoin: round;
  /* The stroke-then-fill paint order gives the labels a halo so
     they remain readable when they overlap edges. */
}

/* Tooltip */
.tags-tooltip {
  position: absolute;
  pointer-events: none;
  background: color-mix(in srgb, var(--light) 96%, var(--dark) 4%);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem;
  color: var(--darkgray);
  max-width: 280px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 100;
  line-height: 1.45;
}
.tags-tooltip[hidden] {
  display: none;
}
.tags-tooltip-title {
  color: var(--dark);
  font-weight: 600;
  margin-bottom: 0.1rem;
  font-size: 0.92rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.tags-tooltip-tag-subject {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tags-tooltip-total {
  color: var(--gray);
  font-size: 0.78rem;
  margin-bottom: 0.4rem;
}
.tags-tooltip-section-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--lightgray);
}
.tags-tooltip-partners {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.tags-tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.tags-tooltip-partner {
  color: var(--darkgray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tags-tooltip-weight {
  margin-left: auto;
  color: var(--gray);
  font-variant-numeric: tabular-nums;
  font-size: 0.78rem;
}
.tags-tooltip-empty {
  color: var(--gray);
  font-style: italic;
  font-size: 0.78rem;
}
`

export default (() => Tags) satisfies QuartzComponentConstructor
