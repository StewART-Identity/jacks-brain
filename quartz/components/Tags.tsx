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
  // SCOPED NAV HANDLER (fix #5):
  // Bail early if this isn't the Tags page. Without this, every
  // SPA navigation across the site would run the entire Tags
  // bootstrap, attach listeners, etc — leading to listener
  // accumulation and (in the worst case) the Tags SVG bleeding
  // into other pages' content.
  const root = document.getElementById("tags-app")
  if (!root) return

  const wrap = document.getElementById("tags-svg-wrap")
  const tooltip = document.getElementById("tags-tooltip")
  if (!wrap || !tooltip) return

  // SINGLE-ENTRY GUARD (fix #6):
  // Each call to this handler represents a fresh mount of the
  // Tags page. Use a per-mount timestamp so the animation loop
  // from any prior mount can detect it's stale and stop.
  const mountedAt = Date.now()
  // Stash on the wrap element so the cleanup callback can read it.
  wrap.__tagsMountedAt = mountedAt

  // ─── Constants ───────────────────────────────────────────────────
  const COLOR_SUBJECT = "#D4AD5A"
  const COLOR_TAG_ONLY = "#7BBF95"
  const COLOR_EDGE = "#1B3F29"

  const VB_W = 720
  const VB_H = 520

  // Simulation parameters. See commit message for rationale on
  // which knobs are load-bearing for stability.
  const CHARGE_STRENGTH = -180
  const LINK_DISTANCE = 48
  const LINK_STRENGTH = 0.4
  const CENTER_STRENGTH = 0.04
  const VELOCITY_DECAY = 0.4
  const ALPHA_DECAY = 0.012

  // STABILITY GUARDS (fixes #1, #2, #4):
  // - MAX_VELOCITY caps per-frame node speed. Without this, a
  //   pathological force pair (two nodes nearly identical, dist²
  //   tiny, charge force enormous) produces an unbounded velocity
  //   that the next integration step turns into an enormous
  //   position delta — the root cause of the "all nodes clumped
  //   in upper-left" symptom.
  // - MIN_DISTANCE_SQ is the squared distance below which we
  //   perturb nodes apart rather than computing an actual force.
  //   The previous threshold (0.01) was too low; raising it
  //   prevents near-singular force calculations.
  // - MAX_ITERATIONS caps total simulation steps regardless of
  //   alpha. The loop will exit after this many frames even if
  //   alpha never decays to zero (which can happen if the system
  //   never settles).
  const MAX_VELOCITY = 8
  const MIN_DISTANCE_SQ = 4
  const MAX_ITERATIONS = 600  // ~10 seconds at 60fps — plenty for any healthy graph

  // Node radius scale (log).
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

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v
  }

  // ─── Data extraction ─────────────────────────────────────────────

  function extract(corpus) {
    const tagCount = new Map()
    const pagesForTag = new Map()
    const subjectSet = new Set()
    const edgeWeight = new Map()

    for (const page of corpus.pages) {
      const tags = Array.isArray(page.tags) ? page.tags : []
      const subjects = Array.isArray(page.subjects) ? page.subjects : []

      for (const s of subjects) subjectSet.add(s)

      for (const t of tags) {
        tagCount.set(t, (tagCount.get(t) || 0) + 1)
        if (!pagesForTag.has(t)) pagesForTag.set(t, [])
        pagesForTag.get(t).push({ slug: page.slug, title: page.title })
      }

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

    // Spread initial positions across the FULL viewBox rather than
    // a sub-region. Random uniform across [0, VB_W] and [0, VB_H]
    // gives the simulation a healthy starting spread to work from.
    // (Previously: random across the same range, but I'm calling it
    // out as load-bearing — a clustered initial layout would create
    // exactly the near-singular force conditions the clamping was
    // added to handle, so keeping nodes well-spread at start matters.)
    const nodes = Array.from(tagCount.entries()).map(([tag, count]) => ({
      id: tag,
      count,
      isSubject: subjectSet.has(tag),
      x: 40 + Math.random() * (VB_W - 80),
      y: 40 + Math.random() * (VB_H - 80),
      vx: 0,
      vy: 0,
      r: 0,
    }))

    const maxCount = Math.max(...nodes.map((n) => n.count), 1)
    const logMax = Math.log(maxCount + 1)
    for (const n of nodes) {
      const ratio = logMax > 0 ? Math.log(n.count + 1) / logMax : 0
      n.r = MIN_NODE_RADIUS + ratio * (MAX_NODE_RADIUS - MIN_NODE_RADIUS)
    }

    const edges = []
    for (const [key, weight] of edgeWeight) {
      const [a, b] = key.split("||")
      if (a === b) continue
      const sourceNode = nodes.find((n) => n.id === a)
      const targetNode = nodes.find((n) => n.id === b)
      if (!sourceNode || !targetNode) continue
      edges.push({ source: sourceNode, target: targetNode, weight })
    }

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

    return {
      nodes,
      edges,
      pagesForTag,
      topCoTagsFor,
      maxEdgeWeight: Math.max(...edges.map(e => e.weight), 1),
    }
  }

  // ─── Force simulation ────────────────────────────────────────────

  let simulation = null
  let iterationCount = 0

  function makeSimulation(nodes, edges) {
    let alpha = 1.0
    const maxWeight = Math.max(...edges.map((e) => e.weight), 1)

    function resetNaNNode(n) {
      // NAN GUARD (fix #3):
      // If a node's position has gone NaN, reset it to a random
      // position in the viewBox. This keeps the rest of the
      // simulation from infecting on the next step.
      n.x = 40 + Math.random() * (VB_W - 80)
      n.y = 40 + Math.random() * (VB_H - 80)
      n.vx = 0
      n.vy = 0
    }

    function step() {
      iterationCount++
      if (iterationCount > MAX_ITERATIONS) return false
      if (alpha < 0.005) return false

      // Repulsion. Guard near-singular pairs by perturbing.
      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j]
          let dx = nj.x - ni.x
          let dy = nj.y - ni.y
          let dist2 = dx * dx + dy * dy
          if (dist2 < MIN_DISTANCE_SQ) {
            // Perturb harder than before, so the next iteration's
            // distance is safely outside the singular zone.
            dx = (Math.random() - 0.5) * 4
            dy = (Math.random() - 0.5) * 4
            dist2 = MIN_DISTANCE_SQ
          }
          const dist = Math.sqrt(dist2)
          const force = CHARGE_STRENGTH * alpha / dist2
          const fx = force * (dx / dist)
          const fy = force * (dy / dist)
          ni.vx -= fx
          ni.vy -= fy
          nj.vx += fx
          nj.vy += fy
        }
      }

      // Edge spring forces.
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

      // Centering pull.
      const cx = VB_W / 2
      const cy = VB_H / 2
      for (const n of nodes) {
        n.vx += (cx - n.x) * CENTER_STRENGTH * alpha
        n.vy += (cy - n.y) * CENTER_STRENGTH * alpha
      }

      // Integrate with full safety: velocity clamp, NaN check, position clamp.
      for (const n of nodes) {
        n.vx *= (1 - VELOCITY_DECAY)
        n.vy *= (1 - VELOCITY_DECAY)

        // VELOCITY CLAMP (fix #2): bound speed regardless of force
        // magnitude. This is the actual safeguard against runaway.
        n.vx = clamp(n.vx, -MAX_VELOCITY, MAX_VELOCITY)
        n.vy = clamp(n.vy, -MAX_VELOCITY, MAX_VELOCITY)

        n.x += n.vx
        n.y += n.vy

        // NaN check (fix #3).
        if (!isFinite(n.x) || !isFinite(n.y)) {
          resetNaNNode(n)
          continue
        }

        // POSITION CLAMP (fix #1): keep nodes inside the viewBox.
        // Padding margin lets node labels stay visible at edges.
        const margin = 20
        n.x = clamp(n.x, margin, VB_W - margin)
        n.y = clamp(n.y, margin, VB_H - margin)
      }

      alpha *= (1 - ALPHA_DECAY)
      return true
    }

    return {
      step,
      getAlpha: () => alpha,
      getIteration: () => iterationCount,
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────

  let hoveredTag = null
  let viewTransform = { tx: 0, ty: 0, k: 1 }

  function renderSVG(nodes, edges, maxEdgeWeight) {
    let svg = '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tag co-occurrence network">'

    const transform = "translate(" + viewTransform.tx + " " + viewTransform.ty + ") scale(" + viewTransform.k + ")"
    svg += '<g class="tags-canvas" transform="' + transform + '">'

    const focusSet = new Set()
    if (hoveredTag) {
      focusSet.add(hoveredTag)
      for (const e of edges) {
        if (e.source.id === hoveredTag) focusSet.add(e.target.id)
        else if (e.target.id === hoveredTag) focusSet.add(e.source.id)
      }
    }

    for (const e of edges) {
      const isFocused = !hoveredTag ||
        e.source.id === hoveredTag || e.target.id === hoveredTag
      const baseOpacity = 0.25 + 0.55 * (e.weight / maxEdgeWeight)
      const opacity = isFocused ? baseOpacity : baseOpacity * 0.15
      const strokeWidth = 0.6 + (e.weight / maxEdgeWeight) * 2.2
      svg += '<line x1="' + e.source.x + '" y1="' + e.source.y + '" x2="' + e.target.x + '" y2="' + e.target.y + '" stroke="' + COLOR_EDGE + '" stroke-opacity="' + opacity.toFixed(3) + '" stroke-width="' + strokeWidth.toFixed(2) + '"/>'
    }

    for (const n of nodes) {
      const isFocused = !hoveredTag || focusSet.has(n.id)
      const opacity = isFocused ? 1 : 0.25
      const color = n.isSubject ? COLOR_SUBJECT : COLOR_TAG_ONLY
      const label = n.id

      svg += '<g class="tags-node" data-tag="' + escapeXml(n.id) + '" tabindex="0" role="button" aria-label="' + escapeXml(n.id) + ', ' + n.count + ' pages" opacity="' + opacity + '">'
      svg += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + (n.r + 4) + '" fill="transparent"/>'
      svg += '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + n.r + '" fill="' + color + '" stroke="var(--light)" stroke-width="1.2"/>'
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

  // ─── Animation loop with single-entry guard ──────────────────────

  let animFrame = null
  let stopAnimation = false

  function startAnimation(nodes, edges, maxEdgeWeight) {
    function loop() {
      // Stale-mount check (fix #6): if a newer mount has registered
      // a different mountedAt timestamp, this loop is stale and
      // should exit.
      if (stopAnimation || wrap.__tagsMountedAt !== mountedAt) return
      const still = simulation.step()
      renderSVG(nodes, edges, maxEdgeWeight)
      if (still) {
        animFrame = requestAnimationFrame(loop)
      }
    }
    animFrame = requestAnimationFrame(loop)
  }

  // ─── Event binding (idempotent — single set of listeners) ────────
  //
  // EVENT-LISTENER DEDUPING (fix #7):
  // Previously bindEvents was called on every animation frame,
  // re-attaching listeners to a fresh SVG element each time. The
  // old elements' listeners weren't released until GC, which under
  // SPA-nav churn produced enormous listener counts.
  //
  // Now we attach listeners ONCE to the wrap element (which doesn't
  // get replaced by renderSVG). Inside the handler we use closest()
  // to find the relevant node. Since the wrap survives across
  // renderSVG calls, listeners attach once and stay valid until
  // SPA-nav cleanup runs.

  let topCoTagsFor = new Map()
  let currentNodes = []
  let currentEdges = []
  let currentMaxEdgeWeight = 1

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

  // Single mousemove handler delegated to wrap. Uses closest() to
  // find the node element; falls back to "no hover" if not on a
  // node.
  function onMouseMove(e) {
    const target = e.target.closest && e.target.closest(".tags-node")
    if (!target) {
      if (hoveredTag !== null) {
        hoveredTag = null
        renderSVG(currentNodes, currentEdges, currentMaxEdgeWeight)
        hideTooltip()
      }
      return
    }
    const tag = target.getAttribute("data-tag")
    if (tag !== hoveredTag) {
      hoveredTag = tag
      renderSVG(currentNodes, currentEdges, currentMaxEdgeWeight)
    }
    const node = currentNodes.find((n) => n.id === tag)
    if (node) showTooltip(node, e.clientX, e.clientY)
  }

  function onMouseLeave() {
    if (hoveredTag !== null) {
      hoveredTag = null
      renderSVG(currentNodes, currentEdges, currentMaxEdgeWeight)
    }
    hideTooltip()
  }

  function onClick(e) {
    const target = e.target.closest && e.target.closest(".tags-node")
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
    const svg = wrap.querySelector("svg")
    if (!svg) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newK = Math.max(0.4, Math.min(3, viewTransform.k * delta))
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
    renderSVG(currentNodes, currentEdges, currentMaxEdgeWeight)
  }

  let panStart = null
  function onMouseDown(e) {
    if (e.target.closest && e.target.closest(".tags-node")) return
    panStart = {
      x: e.clientX,
      y: e.clientY,
      tx0: viewTransform.tx,
      ty0: viewTransform.ty,
    }
    const svg = wrap.querySelector("svg")
    if (svg) svg.style.cursor = "grabbing"
  }

  function onMouseMovePan(e) {
    if (!panStart) return
    const svg = wrap.querySelector("svg")
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = VB_W / rect.width
    const scaleY = VB_H / rect.height
    viewTransform.tx = panStart.tx0 + (e.clientX - panStart.x) * scaleX
    viewTransform.ty = panStart.ty0 + (e.clientY - panStart.y) * scaleY
    renderSVG(currentNodes, currentEdges, currentMaxEdgeWeight)
  }

  function onMouseUpPan() {
    panStart = null
    const svg = wrap.querySelector("svg")
    if (svg) svg.style.cursor = ""
  }

  // Bind once on the wrap.
  wrap.addEventListener("mousemove", onMouseMove)
  wrap.addEventListener("mousemove", onMouseMovePan)
  wrap.addEventListener("mouseleave", onMouseLeave)
  wrap.addEventListener("click", onClick)
  wrap.addEventListener("keydown", onKeyDown)
  wrap.addEventListener("wheel", onWheel, { passive: false })
  wrap.addEventListener("mousedown", onMouseDown)
  document.addEventListener("mouseup", onMouseUpPan)

  if (window.addCleanup) {
    window.addCleanup(() => {
      // Mark this mount stale (any pending animation frame from
      // this mount will see the mountedAt mismatch and exit).
      stopAnimation = true
      if (wrap.__tagsMountedAt === mountedAt) {
        wrap.__tagsMountedAt = null
      }
      if (animFrame) cancelAnimationFrame(animFrame)
      wrap.removeEventListener("mousemove", onMouseMove)
      wrap.removeEventListener("mousemove", onMouseMovePan)
      wrap.removeEventListener("mouseleave", onMouseLeave)
      wrap.removeEventListener("click", onClick)
      wrap.removeEventListener("keydown", onKeyDown)
      wrap.removeEventListener("wheel", onWheel)
      wrap.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("mouseup", onMouseUpPan)
    })
  }

  // ─── Load and start ──────────────────────────────────────────────

  fetch("/static/corpus.json")
    .then((r) => r.json())
    .then((data) => {
      const extracted = extract(data)
      topCoTagsFor = extracted.topCoTagsFor
      if (extracted.nodes.length === 0) {
        wrap.innerHTML = '<p class="muted" style="text-align:center;padding:2rem 0">No tags in the corpus yet. Add a <code>tags:</code> field to your page frontmatter to start filling this in.</p>'
        return
      }
      currentNodes = extracted.nodes
      currentEdges = extracted.edges
      currentMaxEdgeWeight = extracted.maxEdgeWeight
      simulation = makeSimulation(currentNodes, currentEdges)
      iterationCount = 0
      startAnimation(currentNodes, currentEdges, currentMaxEdgeWeight)
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

.tags-svg-wrap {
  position: relative;
  width: 100%;
  min-height: 520px;
  margin-top: 0.5rem;
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
}

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
