import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  zoomIdentity,
  select,
  drag,
  zoom,
} from "d3"
import { Text, Graphics, Application, Container, Circle } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

type LinkData = {
  source: NodeData
  target: NodeData
} & SimulationLinkDatum<NodeData>

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
}

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
}

const localStorageKey = "graph-visited"
function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

// ─── Saved layouts (Tier 2) ──────────────────────────────────────────────
//
// Pinned-position state that survives across SPA navigations. The graph
// rebuilds on every nav, so the only reliable place this state can live
// is the durable layer (Git, via /api/graph-layouts) plus a localStorage
// mirror for fast cold-start.
//
// Why module-scope rather than per-render: the simulation is rebuilt every
// nav, but the user's mental model is one continuous tool with persistent
// state. The catalogue of layouts shouldn't reset just because they
// clicked into a node and back out.

type LayoutPosition = { x: number; y: number }
type SavedLayout = {
  name: string
  createdAt: string
  updatedAt: string
  positions: Record<string, LayoutPosition>
}
type LayoutsState = {
  layouts: Record<string, SavedLayout>
  activeLayout: string | null
  sha: string | null
}

const LAYOUTS_LOCAL_KEY = "graph-layouts-cache"
const LAYOUTS_FLUSH_DEBOUNCE_MS = 3000

let layoutsState: LayoutsState | null = null
let layoutsLoadPromise: Promise<LayoutsState> | null = null
let layoutsDirty = false
let flushTimer: number | null = null

// Listeners that the UI registers (in PageTitle's nav handler) to be
// notified when layout state changes. Module-scope so multiple controls
// can subscribe.
const layoutChangeListeners = new Set<() => void>()
function notifyLayoutChange() {
  for (const fn of layoutChangeListeners) {
    try {
      fn()
    } catch {
      // Listener errors should never break the graph render loop.
    }
  }
}

function readLayoutsCache(): LayoutsState | null {
  try {
    const raw = localStorage.getItem(LAYOUTS_LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LayoutsState
    // Light shape check — anything bad and we'll re-fetch.
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.layouts &&
      typeof parsed.layouts === "object"
    ) {
      return {
        layouts: parsed.layouts,
        activeLayout: parsed.activeLayout ?? null,
        sha: parsed.sha ?? null,
      }
    }
  } catch {
    // fall through
  }
  return null
}

function writeLayoutsCache(state: LayoutsState) {
  try {
    localStorage.setItem(LAYOUTS_LOCAL_KEY, JSON.stringify(state))
  } catch {
    // localStorage can be full or disabled — not fatal.
  }
}

async function fetchLayoutsFromApi(): Promise<LayoutsState> {
  const res = await fetch("/api/graph-layouts", {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  })
  if (!res.ok) {
    // Auth failure or server down — fall back to empty state. We don't
    // want a broken endpoint to break the graph render entirely.
    return { layouts: {}, activeLayout: null, sha: null }
  }
  const json = (await res.json()) as Partial<LayoutsState>
  return {
    layouts: json.layouts ?? {},
    activeLayout: json.activeLayout ?? null,
    sha: json.sha ?? null,
  }
}

// Idempotent loader — caches the in-flight promise so concurrent
// renderGraph calls (local + global graph on the same page) share one
// network round-trip.
function loadLayouts(): Promise<LayoutsState> {
  if (layoutsState) return Promise.resolve(layoutsState)
  if (layoutsLoadPromise) return layoutsLoadPromise

  // Synchronously seed from cache if we have one — gives the simulation
  // pinned positions on first paint without waiting for the network.
  const cached = readLayoutsCache()
  if (cached) {
    layoutsState = cached
    // Still fire the network refresh in the background so we pick up
    // changes from another device.
    layoutsLoadPromise = fetchLayoutsFromApi()
      .then((fresh) => {
        layoutsState = fresh
        writeLayoutsCache(fresh)
        layoutsLoadPromise = null
        notifyLayoutChange()
        return fresh
      })
      .catch(() => {
        layoutsLoadPromise = null
        return cached
      })
    return Promise.resolve(cached)
  }

  layoutsLoadPromise = fetchLayoutsFromApi()
    .then((fresh) => {
      layoutsState = fresh
      writeLayoutsCache(fresh)
      layoutsLoadPromise = null
      return fresh
    })
    .catch(() => {
      layoutsLoadPromise = null
      const empty: LayoutsState = { layouts: {}, activeLayout: null, sha: null }
      layoutsState = empty
      return empty
    })
  return layoutsLoadPromise
}

function getActiveLayout(): SavedLayout | null {
  if (!layoutsState || !layoutsState.activeLayout) return null
  return layoutsState.layouts[layoutsState.activeLayout] ?? null
}

function slugifyLayoutName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function nowIso(): string {
  return new Date().toISOString()
}

// Build a payload safe to send to /api/graph-layouts.
function buildPostBody(state: LayoutsState): string {
  return JSON.stringify({
    layouts: state.layouts,
    activeLayout: state.activeLayout,
    sha: state.sha,
  })
}

function flushLayouts(viaBeacon: boolean): boolean {
  if (!layoutsDirty || !layoutsState) return false
  const body = buildPostBody(layoutsState)

  if (viaBeacon && typeof navigator.sendBeacon === "function") {
    // sendBeacon needs a Blob with a CORS-safe Content-Type. Our
    // endpoint accepts text/plain or application/json; we use
    // text/plain for beacon writes specifically because some browsers
    // upgrade application/json to a preflighted request, which beacons
    // can't do.
    const blob = new Blob([body], { type: "text/plain" })
    const ok = navigator.sendBeacon("/api/graph-layouts", blob)
    if (ok) {
      layoutsDirty = false
      // We can't read the response sha back from a beacon. The next
      // GET on a fresh page load will pick up the new sha; in between,
      // we may run with a stale sha and 409 on the next non-beacon
      // write — at which point the client should refetch and retry.
    }
    return ok
  }

  // Steady-state path: real fetch, can update sha on success.
  fetch("/api/graph-layouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body,
    keepalive: true,
  })
    .then(async (res) => {
      if (res.ok) {
        layoutsDirty = false
        try {
          const json = (await res.json()) as { sha?: string | null }
          if (layoutsState && json && typeof json.sha === "string") {
            layoutsState.sha = json.sha
            writeLayoutsCache(layoutsState)
          }
        } catch {
          // Response wasn't parseable; non-fatal.
        }
      } else if (res.status === 409 && layoutsState) {
        // Stale sha — refetch and retry once. This will only happen if
        // a beacon write landed and changed the sha behind our back.
        const fresh = await fetchLayoutsFromApi()
        // Keep our pending in-memory edits; just adopt the new sha.
        layoutsState.sha = fresh.sha
        writeLayoutsCache(layoutsState)
        scheduleFlush()
      }
    })
    .catch(() => {
      // Network error — leave dirty=true; next debounce or context loss
      // will retry.
    })
  return true
}

function scheduleFlush() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
  }
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    flushLayouts(false)
  }, LAYOUTS_FLUSH_DEBOUNCE_MS)
}

function cancelScheduledFlush() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

function markDirty() {
  layoutsDirty = true
  scheduleFlush()
  if (layoutsState) writeLayoutsCache(layoutsState)
}

// ─── Public API exposed on `window` for the UI script ────────────────────
//
// PageTitle.tsx wires up the toolbar buttons and dropdown. Rather than
// have it import from this module (it's a string blob, not a real TS
// import), we expose a small surface on window. All UI mutations go
// through these helpers, which keeps the dirty/flush bookkeeping in one
// place.

interface GraphLayoutsApi {
  getState: () => LayoutsState
  isReady: () => boolean
  ensureLoaded: () => Promise<LayoutsState>
  switchLayout: (id: string | null) => void
  createLayout: (name: string, snapshot: Record<string, LayoutPosition>) => string | null
  renameLayout: (id: string, newName: string) => boolean
  deleteLayout: (id: string) => boolean
  onChange: (fn: () => void) => () => void
}

declare global {
  interface Window {
    graphLayouts: GraphLayoutsApi
    // Snapshot of currently rendered node positions, populated by the
    // most recent renderGraph call. The "Create layout" button reads
    // this to capture all settled positions.
    __graphPositionSnapshot?: () => Record<string, LayoutPosition>
  }
}

function ensureLayoutsApi() {
  if (window.graphLayouts) return
  window.graphLayouts = {
    getState() {
      return layoutsState ?? { layouts: {}, activeLayout: null, sha: null }
    },
    isReady() {
      return layoutsState !== null
    },
    ensureLoaded() {
      return loadLayouts()
    },
    switchLayout(id) {
      if (!layoutsState) return
      // Fire-and-forget: flush any pending edits to the previous layout
      // via beacon so they don't get clobbered by the switch, then move
      // on immediately. Beacon means no await — the user gets snappy
      // switching, last-write-wins on rapid switches.
      if (layoutsDirty) {
        cancelScheduledFlush()
        flushLayouts(true)
      }
      if (id !== null && !(id in layoutsState.layouts)) return
      layoutsState.activeLayout = id
      markDirty()
      notifyLayoutChange()
    },
    createLayout(name, snapshot) {
      if (!layoutsState) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      let id = slugifyLayoutName(trimmed)
      if (!id) return null
      // Avoid collisions on duplicate names — append -2, -3, etc.
      if (id in layoutsState.layouts) {
        let n = 2
        while (`${id}-${n}` in layoutsState.layouts) n++
        id = `${id}-${n}`
      }
      const ts = nowIso()
      // Defensive copy — the caller's object shouldn't keep mutating
      // our stored positions.
      const positions: Record<string, LayoutPosition> = {}
      for (const [slug, p] of Object.entries(snapshot)) {
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
          positions[slug] = { x: p.x, y: p.y }
        }
      }
      layoutsState.layouts[id] = {
        name: trimmed,
        createdAt: ts,
        updatedAt: ts,
        positions,
      }
      layoutsState.activeLayout = id
      markDirty()
      notifyLayoutChange()
      return id
    },
    renameLayout(id, newName) {
      if (!layoutsState) return false
      const layout = layoutsState.layouts[id]
      if (!layout) return false
      const trimmed = newName.trim()
      if (!trimmed) return false
      // We rename in place — the ID is the stable handle, the display
      // name is what the user sees. Avoids the cascade of activeLayout
      // updates that an ID-changing rename would require.
      layout.name = trimmed
      layout.updatedAt = nowIso()
      markDirty()
      notifyLayoutChange()
      return true
    },
    deleteLayout(id) {
      if (!layoutsState) return false
      if (!(id in layoutsState.layouts)) return false
      delete layoutsState.layouts[id]
      if (layoutsState.activeLayout === id) {
        layoutsState.activeLayout = null
      }
      markDirty()
      notifyLayoutChange()
      return true
    },
    onChange(fn) {
      layoutChangeListeners.add(fn)
      return () => layoutChangeListeners.delete(fn)
    },
  }

  // Context-loss flushers. visibilitychange catches tab-hide and most
  // tab-close paths. pagehide is the iOS-Safari-friendly equivalent of
  // beforeunload. We wire all three because each catches different
  // browser behaviors and double-firing is harmless (no-op when clean).
  const onContextLoss = () => {
    if (layoutsDirty) {
      cancelScheduledFlush()
      flushLayouts(true)
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onContextLoss()
  })
  window.addEventListener("pagehide", onContextLoss)
  window.addEventListener("beforeunload", onContextLoss)
}

ensureLayoutsApi()

type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = getVisited()
  removeAllChildren(graph)

  let {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
    alphaDecay,
  } = JSON.parse(graph.dataset["cfg"]!) as D3Config

  const data: Map<SimpleSlug, ContentDetails> = new Map(
    Object.entries<ContentDetails>(await fetchData).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  const validLinks = new Set(data.keys())

  const tweens = new Map<string, TweenNode>()
  for (const [source, details] of data.entries()) {
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest })
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      tags.push(...localTags.filter((tag) => !tags.includes(tag)))

      for (const tag of localTags) {
        links.push({ source: source, target: tag })
      }
    }
  }

  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  const nodes = [...neighbourhood].map((url) => {
    const text = url.startsWith("tags/") ? "#" + url.substring(5) : (data.get(url)?.title ?? url)
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    }
  })
  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  }

  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)

  // we virtualize the simulation and use pixi to actually render it
  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance))
    .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3))

  // Optional override of D3's simulation cooling rate. The default 0.0228
  // is too slow for graphs of any complexity — the simulation never
  // settles, producing a perpetual "moving in water" feel as nodes drift
  // toward an equilibrium they never quite reach. Setting this higher
  // (e.g. 0.05) lets the layout reach rest in a few seconds.
  if (alphaDecay !== undefined) simulation.alphaDecay(alphaDecay)

  const radius = (Math.min(width, height) / 2) * 0.8
  if (enableRadial) simulation.force("radial", forceRadial(radius).strength(0.2))

  // ─── Apply saved layout pins ────────────────────────────────────────
  //
  // Read the active saved layout (Tier 2) and pin matching nodes via
  // fx/fy before the simulation runs its first tick. Nodes not in the
  // layout float freely and the simulation arranges them around the
  // pinned anchors — same drop-to-stay behavior as Tier 1, but durable
  // across nav.
  //
  // We seed from the localStorage cache synchronously when possible
  // (loadLayouts does this internally) so the first paint already has
  // pins applied. The background network refresh may update positions
  // shortly after — we re-apply on the next tick by calling pinFromLayout
  // again.
  await loadLayouts()
  const pinFromLayout = () => {
    const active = getActiveLayout()
    if (!active) return
    for (const n of graphData.nodes) {
      const p = active.positions[n.id]
      if (p) {
        n.fx = p.x
        n.fy = p.y
        // Also seed x/y so the first pre-tick render places the node at
        // its pinned spot rather than at the default forceCenter origin.
        n.x = p.x
        n.y = p.y
      }
    }
  }
  pinFromLayout()

  // precompute style prop strings as pixi doesn't support css variables
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
  ] as const
  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key)
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )

  // calculate color
  const color = (d: NodeData) => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return computedStyleMap["--secondary"]
    } else if (visited.has(d.id) || d.id.startsWith("tags/")) {
      return computedStyleMap["--tertiary"]
    } else {
      return computedStyleMap["--gray"]
    }
  }

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return 1 + Math.sqrt(numLinks) * 0.5
  }

  let hoveredNodeId: string | null = null
  let hoveredNeighbours: Set<string> = new Set()
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []
  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId

    if (newHoveredId === null) {
      hoveredNeighbours = new Set()
      for (const n of nodeRenderData) {
        n.active = false
      }

      for (const l of linkRenderData) {
        l.active = false
      }
    } else {
      hoveredNeighbours = new Set()
      for (const l of linkRenderData) {
        const linkData = l.simulationData
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id)
          hoveredNeighbours.add(linkData.target.id)
        }

        l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
      }

      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id)
      }
    }
  }

  let dragStartTime = 0
  let dragging = false

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      // with full alpha and the rest with default alpha
      if (hoveredNodeId) {
        alpha = l.active ? 1 : 0.2
      }

      l.color = l.active ? computedStyleMap["--gray"] : computedStyleMap["--lightgray"]
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("link", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderLabels() {
    tweens.get("label")?.stop()
    const tweenGroup = new TweenGroup()

    const defaultScale = 1 / scale
    const activeScale = defaultScale * 1.1
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: activeScale, y: activeScale },
            },
            100,
          ),
        )
      } else {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: defaultScale, y: defaultScale },
            },
            100,
          ),
        )
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("label", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderNodes() {
    tweens.get("hover")?.stop()

    const tweenGroup = new TweenGroup()
    for (const n of nodeRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.2
      }

      tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("hover", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderPixiFromD3() {
    renderNodes()
    renderLinks()
    renderLabels()
  }

  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgpu",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  stage.addChild(nodesContainer, labelsContainer, linkContainer)

  for (const n of graphData.nodes) {
    const nodeId = n.id

    const label = new Text({
      interactive: false,
      eventMode: "none",
      text: n.text,
      alpha: 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * 15,
        fill: computedStyleMap["--dark"],
        fontFamily: computedStyleMap["--bodyFont"],
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = 0
    const isTagNode = nodeId.startsWith("tags/")
    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, nodeRadius(n)),
      cursor: "pointer",
    })
      .circle(0, 0, nodeRadius(n))
      .fill({ color: isTagNode ? computedStyleMap["--light"] : color(n) })
      .on("pointerover", (e) => {
        updateHoverInfo(e.target.label)
        oldLabelOpacity = label.alpha
        if (!dragging) {
          renderPixiFromD3()
        }
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        label.alpha = oldLabelOpacity
        if (!dragging) {
          renderPixiFromD3()
        }
      })

    if (isTagNode) {
      gfx.stroke({ width: 2, color: computedStyleMap["--tertiary"] })
    }

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 1,
      active: false,
    }

    nodeRenderData.push(nodeRenderDatum)
  }

  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      color: computedStyleMap["--lightgray"],
      alpha: 1,
      active: false,
    }

    linkRenderData.push(linkRenderDatum)
  }

  let currentTransform = zoomIdentity
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(1).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
        })
        .on("end", function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          dragging = false

          // If the time between mousedown and mouseup is short, treat
          // this as a click (navigate to the node's page) and release
          // the pin — clicks shouldn't accidentally lock nodes in place.
          // If it was a real drag, leave fx/fy set so the node stays
          // where the user dropped it. This is what eliminates the
          // rubber-band snap-back: the node's pinned coordinates remain
          // active after the drag, and the simulation works around it
          // instead of pulling it back to a force-balanced position.
          const isClick = Date.now() - dragStartTime < 500
          if (isClick) {
            event.subject.fx = null
            event.subject.fy = null
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          } else {
            // Real drag: persist into the active saved layout so the
            // pin survives the next nav. If no layout is active, the
            // drop-to-stay still works for this render (Tier 1
            // behavior) but is lost on rebuild.
            const active = getActiveLayout()
            if (active && layoutsState && layoutsState.activeLayout) {
              const id = event.subject.id as string
              const x = event.subject.fx as number
              const y = event.subject.fy as number
              if (Number.isFinite(x) && Number.isFinite(y)) {
                active.positions[id] = { x, y }
                active.updatedAt = nowIso()
                markDirty()
              }
            }
          }
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        window.spaNavigate(new URL(targ, window.location.toString()))
      })
    }
  }

  if (enableZoom) {
    select<HTMLCanvasElement, NodeData>(app.canvas).call(
      zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.25, 10])
        .on("zoom", ({ transform }) => {
          currentTransform = transform
          stage.scale.set(transform.k, transform.k)
          stage.position.set(transform.x, transform.y)

          // Inverse-scale labels so they stay roughly constant size on
          // screen as the user zooms. Without this, labels grow with the
          // stage and become huge when zoomed in, which destroys the
          // sense of locality when exploring a clump. The 'scale' here
          // is the outer config value (line ~80) — the resting target
          // size that line ~390 applied at label creation. This keeps
          // labels at that size as the user zooms.
          for (const label of labelsContainer.children) {
            label.scale.set(scale / transform.k)
          }

          // zoom adjusts opacity of labels too. Distinct local name
          // (not 'scale') so it doesn't shadow the outer scale used
          // for label sizing above.
          const opacityScaledZoom = transform.k * opacityScale
          let scaleOpacity = Math.max((opacityScaledZoom - 1) / 3.75, 0)
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label)) {
              label.alpha = scaleOpacity
            }
          }
        }),
    )
  }

  let stopAnimation = false
  function animate(time: number) {
    if (stopAnimation) return
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      if (!x || !y) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      if (n.label) {
        n.label.position.set(x + width / 2, y + height / 2)
      }
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData
      l.gfx.clear()
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2)
      l.gfx
        .lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2)
        .stroke({ alpha: l.alpha, width: 1, color: l.color })
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  // Expose a snapshot helper so the "Create layout" UI can capture
  // current node positions. Last renderGraph wins — if both a local
  // graph and the full graph exist, this points to whichever was most
  // recently rendered. The full graph (Graph View page) is the only
  // place the create button is shown, so this works out.
  window.__graphPositionSnapshot = () => {
    const out: Record<string, LayoutPosition> = {}
    for (const n of graphData.nodes) {
      const x = n.fx ?? n.x
      const y = n.fy ?? n.y
      if (Number.isFinite(x) && Number.isFinite(y)) {
        out[n.id as string] = { x: x as number, y: y as number }
      }
    }
    return out
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    app.destroy()
    if (window.__graphPositionSnapshot) {
      window.__graphPositionSnapshot = undefined
    }
  }
}

let localGraphCleanups: (() => void)[] = []
let globalGraphCleanups: (() => void)[] = []

function cleanupLocalGraphs() {
  for (const cleanup of localGraphCleanups) {
    cleanup()
  }
  localGraphCleanups = []
}

function cleanupGlobalGraphs() {
  for (const cleanup of globalGraphCleanups) {
    cleanup()
  }
  globalGraphCleanups = []
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))

  async function renderLocalGraph() {
    cleanupLocalGraphs()
    const localGraphContainers = document.getElementsByClassName("graph-container")
    for (const container of localGraphContainers) {
      localGraphCleanups.push(await renderGraph(container as HTMLElement, slug))
    }
  }

  await renderLocalGraph()
  const handleThemeChange = () => {
    void renderLocalGraph()
  }

  document.addEventListener("themechange", handleThemeChange)
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleThemeChange)
  })

  const containers = [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
  async function renderGlobalGraph() {
    const slug = getFullSlug(window)
    for (const container of containers) {
      container.classList.add("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = "1"
      }

      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      registerEscapeHandler(container, hideGlobalGraph)
      if (graphContainer) {
        globalGraphCleanups.push(await renderGraph(graphContainer, slug))
      }
    }
  }

  function hideGlobalGraph() {
    cleanupGlobalGraphs()
    for (const container of containers) {
      container.classList.remove("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = ""
      }
    }
  }

  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const anyGlobalGraphOpen = containers.some((container) =>
        container.classList.contains("active"),
      )
      anyGlobalGraphOpen ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  const containerIcons = document.getElementsByClassName("global-graph-icon")
  Array.from(containerIcons).forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => {
    document.removeEventListener("keydown", shortcutHandler)
    cleanupLocalGraphs()
    cleanupGlobalGraphs()
  })
})
