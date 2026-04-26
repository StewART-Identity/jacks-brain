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

// Listeners that fire whenever layoutsDirty transitions. The toolbar UI
// uses this to keep the "save" button's visual state in sync with
// reality — highlighted when there are unsaved changes, dimmed when
// everything has been flushed to git.
//
// We notify on every setDirty call, even no-op ones (true -> true), so
// listeners that need to confirm "yes still dirty" can treat each event
// as authoritative. The cost is negligible; the UI's onChange handler is
// trivial.
const dirtyChangeListeners = new Set<(dirty: boolean) => void>()
function notifyDirtyChange() {
  for (const fn of dirtyChangeListeners) {
    try {
      fn(layoutsDirty)
    } catch {
      // never break callers
    }
  }
}
// Single point of truth for the dirty flag. Replaces direct writes to
// layoutsDirty so the listener gets fired automatically. Internal-only;
// the public API exposes isDirty() (read) and flushNow() (which clears).
function setDirty(value: boolean) {
  if (layoutsDirty === value) {
    // Still notify — a listener registering after the flag was first
    // set still gets a "current state" callback this way when something
    // re-affirms the value.
    notifyDirtyChange()
    return
  }
  layoutsDirty = value
  notifyDirtyChange()
}

// ─── Freeze layout (physics pause) ───────────────────────────────────────
//
// When frozen, the force simulation is stopped and drags don't restart
// it. This gives the user direct manipulation: drag a node, only that
// node moves, no rippling. Persists across reloads via localStorage so
// the user's preference survives.

const FREEZE_LOCAL_KEY = "graph-frozen"
let graphFrozen = (function () {
  try {
    return localStorage.getItem(FREEZE_LOCAL_KEY) === "true"
  } catch {
    return false
  }
})()
const freezeChangeListeners = new Set<(frozen: boolean) => void>()
function notifyFreezeChange() {
  for (const fn of freezeChangeListeners) {
    try {
      fn(graphFrozen)
    } catch {
      // never break callers
    }
  }
}

// ─── Synthesis filter (which clusters are visible) ───────────────────────
//
// State is the SET of unchecked synthesis slugs. We track unchecked
// rather than checked because the default (all visible) is "no
// unchecked," which matches an empty set — so first-render with no
// stored preference is correct without a special case.
//
// "Free" nodes — pages not in any synthesis cluster — are always
// visible regardless of filter state. This is the user's choice;
// see handoff for rationale.

const FILTER_LOCAL_KEY = "graph-filter-unchecked"
let unchecked: Set<string> = (function () {
  try {
    const raw = localStorage.getItem(FILTER_LOCAL_KEY)
    if (!raw) return new Set<string>()
    const arr = JSON.parse(raw)
    return new Set<string>(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set<string>()
  }
})()
const filterChangeListeners = new Set<() => void>()
function notifyFilterChange() {
  for (const fn of filterChangeListeners) {
    try {
      fn()
    } catch {
      // never break callers
    }
  }
}
function persistFilter() {
  try {
    localStorage.setItem(FILTER_LOCAL_KEY, JSON.stringify([...unchecked]))
  } catch {
    // localStorage unavailable — preference doesn't persist, fine
  }
}

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
      // Beacon write succeeded (browser accepted it) — clear the dirty
      // flag and notify listeners so the UI's save indicator goes
      // dim. We can't read the response sha back from a beacon. The
      // next GET on a fresh page load will pick up the new sha; in
      // between, we may run with a stale sha and 409 on the next
      // non-beacon write — at which point the client should refetch
      // and retry.
      setDirty(false)
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
        // Successful save — clear dirty flag and notify the UI's save
        // indicator. Order matters: clear THEN parse the body, because
        // we want the indicator to clear immediately even if response
        // parsing fails for some reason.
        setDirty(false)
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
  setDirty(true)
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
  // Sprint D additions: dirty state + manual save trigger. The toolbar's
  // save button reads isDirty() to decide its visual state, calls
  // flushNow() on click, and subscribes via onDirtyChange to update its
  // appearance in real time as the underlying state changes.
  isDirty: () => boolean
  flushNow: () => boolean
  onDirtyChange: (fn: (dirty: boolean) => void) => () => void
}

interface GraphFreezeApi {
  isFrozen: () => boolean
  setFrozen: (frozen: boolean) => void
  toggle: () => boolean
  onChange: (fn: (frozen: boolean) => void) => () => void
}

// Synthesis cluster info computed per-render. The UI uses this to
// build the filter checkbox list.
interface SynthesisInfo {
  slug: string  // e.g. "collection/synthesis/orphaned-state-in-iam-migrations"
  title: string
  nodeCount: number  // how many nodes are in this cluster (incl. the synthesis itself)
}

interface GraphFilterApi {
  isUnchecked: (slug: string) => boolean
  setChecked: (slug: string, checked: boolean) => void
  toggle: (slug: string) => void
  checkAll: () => void
  uncheckAll: (allSyntheses: string[]) => void
  // Lists synthesis pages currently in the rendered graph + their
  // member counts. Returns whatever the most recent renderGraph
  // computed; empty until a render has happened.
  getSyntheses: () => SynthesisInfo[]
  onChange: (fn: () => void) => () => void
}

declare global {
  interface Window {
    graphLayouts: GraphLayoutsApi
    graphFreeze: GraphFreezeApi
    graphFilter: GraphFilterApi
    // Snapshot of currently rendered node positions, populated by the
    // most recent renderGraph call. The "Create layout" button reads
    // this to capture all settled positions.
    __graphPositionSnapshot?: () => Record<string, LayoutPosition>
    // Tells the current renderGraph to read its container's new size
    // and resize the pixi renderer accordingly. Used by the fullscreen
    // change handler in PageTitle.tsx.
    __graphResize?: () => void
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
    // ── Sprint D additions ────────────────────────────────────────
    isDirty() {
      return layoutsDirty
    },
    flushNow() {
      // Cancel the debounced flush so we don't double-fire if a save
      // is already pending. The actual flushLayouts call below will
      // handle the dirty=false transition on success via setDirty.
      cancelScheduledFlush()
      // Returns whether a flush was attempted; false means there was
      // nothing to save (already clean) or no state loaded yet.
      return flushLayouts(false)
    },
    onDirtyChange(fn) {
      dirtyChangeListeners.add(fn)
      return () => dirtyChangeListeners.delete(fn)
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

function ensureFreezeApi() {
  if (window.graphFreeze) return
  window.graphFreeze = {
    isFrozen() {
      return graphFrozen
    },
    setFrozen(frozen: boolean) {
      if (frozen === graphFrozen) return
      graphFrozen = frozen
      try {
        localStorage.setItem(FREEZE_LOCAL_KEY, frozen ? "true" : "false")
      } catch {
        // localStorage unavailable — preference doesn't persist, fine
      }
      notifyFreezeChange()
    },
    toggle() {
      this.setFrozen(!graphFrozen)
      return graphFrozen
    },
    onChange(fn) {
      freezeChangeListeners.add(fn)
      return () => freezeChangeListeners.delete(fn)
    },
  }
}

ensureFreezeApi()

// Synthesis info from the most recent renderGraph. The UI reads this
// to build checkboxes. It's reset every render — no stale state if
// the wiki adds or removes synthesis pages between renders.
let currentSyntheses: SynthesisInfo[] = []

function ensureFilterApi() {
  if (window.graphFilter) return
  window.graphFilter = {
    isUnchecked(slug: string) {
      return unchecked.has(slug)
    },
    setChecked(slug: string, checked: boolean) {
      const wasUnchecked = unchecked.has(slug)
      if (checked && wasUnchecked) {
        unchecked.delete(slug)
        persistFilter()
        notifyFilterChange()
      } else if (!checked && !wasUnchecked) {
        unchecked.add(slug)
        persistFilter()
        notifyFilterChange()
      }
    },
    toggle(slug: string) {
      this.setChecked(slug, unchecked.has(slug))
    },
    checkAll() {
      if (unchecked.size === 0) return
      unchecked.clear()
      persistFilter()
      notifyFilterChange()
    },
    uncheckAll(allSyntheses: string[]) {
      let changed = false
      for (const s of allSyntheses) {
        if (!unchecked.has(s)) {
          unchecked.add(s)
          changed = true
        }
      }
      if (changed) {
        persistFilter()
        notifyFilterChange()
      }
    },
    getSyntheses() {
      return currentSyntheses.slice()
    },
    onChange(fn) {
      filterChangeListeners.add(fn)
      return () => filterChangeListeners.delete(fn)
    },
  }
}

ensureFilterApi()

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

  // ─── Compute synthesis clusters ────────────────────────────────────
  //
  // A synthesis cluster is the synthesis page itself plus everything
  // reachable from it via outgoing wikilinks (transitive closure). We
  // BFS from each synthesis page across the FULL content index — not
  // just the current graph's neighbourhood — so memberships reflect
  // wiki structure rather than what happens to be visible.
  //
  // Then we map cluster membership onto graphData.nodes so the
  // animate loop can hide nodes whose syntheses are unchecked.
  // "Free" nodes (in zero clusters) are always visible per the user's
  // chosen semantics (see handoff).
  const synthesisSlugs: SimpleSlug[] = []
  for (const k of data.keys()) {
    if (k.startsWith("collection/synthesis/") && !k.endsWith("/index")) {
      synthesisSlugs.push(k)
    }
  }
  // Per-cluster membership: clusterMembers[synthesisSlug] = Set of node slugs
  const clusterMembers = new Map<string, Set<string>>()
  for (const sSlug of synthesisSlugs) {
    const visited = new Set<string>()
    const queue: SimpleSlug[] = [sSlug]
    while (queue.length > 0) {
      const cur = queue.shift()!
      if (visited.has(cur)) continue
      visited.add(cur)
      const details = data.get(cur)
      if (!details) continue
      for (const link of details.links ?? []) {
        if (!visited.has(link)) queue.push(link)
      }
    }
    clusterMembers.set(sSlug, visited)
  }
  // Per-node membership: nodeClusters[nodeId] = Set of synthesis slugs
  // it belongs to. Empty set means "free" — always visible.
  const nodeClusters = new Map<string, Set<string>>()
  for (const n of graphData.nodes) {
    const memberships = new Set<string>()
    for (const [sSlug, members] of clusterMembers) {
      if (members.has(n.id)) memberships.add(sSlug)
    }
    nodeClusters.set(n.id, memberships)
  }
  // Publish info for the UI. Counts include only nodes currently in
  // graphData.nodes (the rendered set), not the full reachable set —
  // because that's what's actually on screen.
  currentSyntheses = synthesisSlugs.map((sSlug) => {
    let nodeCount = 0
    for (const n of graphData.nodes) {
      if (nodeClusters.get(n.id)?.has(sSlug)) nodeCount++
    }
    return {
      slug: sSlug,
      title: data.get(sSlug)?.title ?? sSlug,
      nodeCount,
    }
  }).sort((a, b) => a.title.localeCompare(b.title))
  notifyFilterChange()

  // Visibility predicate consulted by the animate loop. Free nodes
  // (zero memberships) are always visible. Nodes with memberships are
  // visible if at least one of their synthesis clusters is checked
  // (i.e., not in the unchecked set).
  const isNodeVisible = (nodeId: string): boolean => {
    const memberships = nodeClusters.get(nodeId)
    if (!memberships || memberships.size === 0) return true
    for (const sSlug of memberships) {
      if (!unchecked.has(sSlug)) return true
    }
    return false
  }

  // width/height are mutable so the canvas can be resized in response
  // to fullscreen toggles or window resizes. The animate loop uses these
  // to compute (x + width/2, y + height/2) for screen positioning, so
  // updating them shifts the drawing to stay centered in the viewport.
  let width = graph.offsetWidth
  let height = Math.max(graph.offsetHeight, 250)

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

  // ─── Freeze handling ────────────────────────────────────────────────
  //
  // Freeze means "geometry frozen": when on, the simulation is stopped
  // AND every rendered node is pinned at its current position. This is
  // stronger than just stopping the simulation — without pinning, any
  // alpha tick (from a re-render, or from another node being added)
  // would let nodes drift. Pinning makes freeze actually mean "this
  // exact arrangement, until I say otherwise."
  //
  // Drag-while-frozen uses a "rigid body" model: drag a node, and its
  // direct neighbors translate together, preserving relative positions.
  // Their neighbors-of-neighbors don't move. This is what the user
  // wants from a layout tool (Obsidian/yEd-style direct manipulation),
  // not the "drag one node, neighbors stay fixed and lines stretch"
  // behavior of pure physics-pause.

  // Build a 1-hop adjacency map for fast neighbor lookup at drag-start.
  // We only build it once per render; the graph topology doesn't change
  // mid-render. Includes both directions (incoming + outgoing edges)
  // because the visual notion of "neighbor" is undirected.
  const adjacency = new Map<string, Set<string>>()
  for (const n of graphData.nodes) {
    adjacency.set(n.id as string, new Set<string>())
  }
  for (const l of graphData.links) {
    const sId = (l.source as NodeData).id as string
    const tId = (l.target as NodeData).id as string
    adjacency.get(sId)?.add(tId)
    adjacency.get(tId)?.add(sId)
  }

  // Pin every rendered node at its current position. Used when entering
  // freeze mode and at the start of a drag (defensive — if anything
  // perturbed positions before the drag started, we capture the actual
  // visual state, not stale fx/fy).
  const pinAllAtCurrent = () => {
    for (const n of graphData.nodes) {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        n.fx = n.x
        n.fy = n.y
      }
    }
  }

  if (graphFrozen) {
    // On render of a frozen graph: pin everyone with valid positions,
    // then stop the simulation. Order matters — stop before pinning
    // would race with a final tick.
    pinAllAtCurrent()
    simulation.stop()

    // Detect "new" nodes: those without saved positions AND without
    // valid x/y coordinates (because the simulation hasn't run for
    // them and pinFromLayout had nothing to apply). These get a brief
    // physics burst so they can find a home in the layout. The
    // already-pinned existing nodes act as fixed anchors during this
    // burst, so the user's frozen layout doesn't drift — only the new
    // nodes move.
    //
    // We schedule this on the next animation frame so the canvas has
    // a chance to render the initial state first; the user sees the
    // new node briefly settle into place rather than appearing to
    // teleport from origin to its final spot.
    const unpinnedNew: NodeData[] = []
    for (const n of graphData.nodes) {
      if (n.fx == null && n.fy == null) {
        unpinnedNew.push(n)
      }
    }
    if (unpinnedNew.length > 0) {
      requestAnimationFrame(() => {
        // Re-check that we're still frozen — the user might have
        // toggled freeze off in the interim, in which case the normal
        // simulation will handle these nodes.
        if (!graphFrozen) return
        simulation.alpha(0.5).restart()
        // Stop after ~1.5 seconds. By then the brief burst has
        // settled the new nodes into reasonable positions among the
        // pinned anchors. We then pin them so they stay put on the
        // next freeze-time render (e.g., page reload).
        window.setTimeout(() => {
          if (!graphFrozen) return
          for (const n of unpinnedNew) {
            if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
              n.fx = n.x
              n.fy = n.y
            }
          }
          simulation.stop()
        }, 1500)
      })
    }
  }
  const unsubscribeFreeze = (() => {
    const handler = (frozen: boolean) => {
      if (frozen) {
        // User just turned freeze ON. Capture the current geometry by
        // pinning everyone at their current visual positions, then
        // stop the simulation. This is what makes freeze semantically
        // "freeze the picture" rather than "freeze the forces."
        pinAllAtCurrent()
        simulation.stop()
      } else {
        // User turned freeze OFF. Don't do anything dramatic — the
        // pins from freeze-time are still set, so visual positions
        // are stable. Restart with low alpha so the simulation can
        // resume responding to changes (e.g., new nodes added). The
        // pinned nodes won't move because fx/fy override forces.
        simulation.alpha(0.3).restart()
      }
    }
    freezeChangeListeners.add(handler)
    return () => freezeChangeListeners.delete(handler)
  })()


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

  // Minimum radius bumped from 1 to 2. A 1-pixel orphan node sitting
  // near a 1-pixel-wide edge is visually indistinguishable from "the
  // edge crosses there" — it merges into the line. 2 pixels gives the
  // node a clear identity even when isolated. The sqrt growth means
  // hub nodes still scale up appropriately; only the floor changed.
  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return 2 + Math.sqrt(numLinks) * 0.5
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
  // Cursor position at drag-start, in d3-event coordinates. Used by
  // dragend to compute total cursor movement so we can distinguish
  // "click" (no movement) from "drag" (any movement). Distance-based
  // detection is more reliable than time-based — it works for fast
  // drags and slow clicks alike.
  let dragStartX = 0
  let dragStartY = 0
  let dragging = false
  // Current d3-zoom transform. Declared up here (rather than near the
  // zoom handler) because renderLabels and the label-creation loop
  // both need to read its .k value to compute label scale, and they
  // run before the zoom handler is wired up.
  let currentTransform = zoomIdentity

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

    // Resting scale = scale / currentTransform.k matches the zoom
    // handler's calculation. The stage is scaled by transform.k, and
    // we want labels to stay at a constant on-screen size regardless
    // of zoom — so we divide our local scale by k.
    //
    // The hover/neighbor multipliers (3 / 3.3) bump the visual size up
    // to a readable level when the user is examining a node. At resting
    // (no hover, no proximity), labels are alpha-faded by the zoom
    // handler's opacity logic, so their tiny size doesn't matter
    // visually. On hover, alpha goes to 1 and the size needs to be
    // big enough to actually read.
    const restingScale = scale / currentTransform.k
    const neighborScale = restingScale * 3
    const hoveredScale = restingScale * 3.3
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
        // The hovered node itself: full alpha, slightly larger than its
        // neighbors so the focus point is visually distinct.
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: hoveredScale, y: hoveredScale },
            },
            100,
          ),
        )
      } else if (hoveredNodeId !== null && hoveredNeighbours.has(nodeId)) {
        // Neighbors of the hovered node: full alpha at neighbor size.
        // Surfaces "what's connected to this thing" without requiring
        // the user to hover each neighbor in turn.
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: neighborScale, y: neighborScale },
            },
            100,
          ),
        )
      } else {
        // Non-active labels: keep current alpha (the zoom handler
        // sets this based on zoom level), tween to resting scale.
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: restingScale, y: restingScale },
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
  // Pixi only honors zIndex on a parent's children when sortableChildren
  // is enabled. Without this, draw order is insertion order, which here
  // is nodes -> labels -> links — meaning links would draw ON TOP of
  // nodes, making orphan nodes appear to merge into edges they were
  // visually near. Enabling sort makes the zIndex values below take
  // effect: links (1) draw first, nodes (2) draw above them, labels
  // (3) draw above nodes.
  stage.sortableChildren = true

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
    // Initial label scale matches the zoom handler's formula so the
    // very first hover (before any zoom event has fired) doesn't jump
    // to a different size than what subsequent hovers use. Using
    // currentTransform.k (which is 1 at zoomIdentity) yields the same
    // value as `scale / transform.k` at zoom level 1.
    label.scale.set(scale / currentTransform.k)

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

  // Rigid-body state captured at drag-start when frozen. The dragged
  // node's NodeData reference + a map of every neighbor (1-hop) to
  // its (offsetX, offsetY) relative to the dragged node's start
  // position. On drag, each neighbor's new position is dragged.x +
  // offsetX, dragged.y + offsetY — preserving relative geometry.
  // Cleared on drag-end. Only used when graphFrozen is true.
  let rigidBody: {
    primary: NodeData
    members: Map<NodeData, { offsetX: number; offsetY: number }>
  } | null = null
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          // When frozen, skip alphaTarget/restart — the whole point of
          // freeze is "no physics propagation." The dragged node + its
          // neighbors move together via the rigid-body code below.
          if (!event.active && !graphFrozen) simulation.alphaTarget(1).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }

          // If frozen, capture the rigid body: dragged node + 1-hop
          // neighbors. Each neighbor's offset is recorded relative to
          // the dragged node's CURRENT position so the drag handler
          // can translate them as a unit.
          //
          // EXEMPTION: Single-neighbor nodes drag alone. The whole
          // point of rigid-body translation is to preserve cluster
          // SHAPE — but a 2-node "cluster" has no shape worth
          // preserving, only a relative position. When the user drags
          // a leaf node off a hub (e.g. a tag with one page, or a
          // peripheral entity attached to UNT System), they almost
          // always want to move the leaf without dragging the hub
          // along. The edge stretches; that's the right outcome.
          if (graphFrozen) {
            const primary = event.subject as NodeData
            const neighborIds = adjacency.get(primary.id as string) ?? new Set<string>()
            if (neighborIds.size === 1) {
              // Single-neighbor exemption — leave rigidBody null so
              // the drag handler treats this as a solo move.
              rigidBody = null
            } else {
              const members = new Map<NodeData, { offsetX: number; offsetY: number }>()
              for (const n of graphData.nodes) {
                if (n === primary) continue
                if (!neighborIds.has(n.id as string)) continue
                if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue
                members.set(n, {
                  offsetX: (n.x as number) - (primary.x as number),
                  offsetY: (n.y as number) - (primary.y as number),
                })
                // Pin the neighbor at its current spot. If the
                // simulation somehow ticks between drag events, the
                // neighbor stays put rather than drifting.
                n.fx = n.x
                n.fy = n.y
              }
              rigidBody = { primary, members }
            }
          } else {
            rigidBody = null
          }

          // Capture the initial cursor position so dragend can measure
          // total cursor movement. This is what distinguishes "click"
          // (essentially no movement) from "drag" (any meaningful
          // movement). Time-based detection misses fast-but-real drags
          // and slow-but-still-clicks.
          dragStartX = event.x
          dragStartY = event.y
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
          // When frozen, the simulation isn't ticking, so the animate
          // loop won't update visual positions on its own. We need to
          // copy fx/fy into x/y so the next animation frame draws the
          // dragged node at its new spot. Unfrozen: simulation handles
          // this via its own tick.
          if (graphFrozen) {
            const fx = event.subject.fx as number
            const fy = event.subject.fy as number
            event.subject.x = fx
            event.subject.y = fy

            // Translate every rigid-body member by the same delta so
            // the local geometry is preserved. We compute their new
            // position from the captured offset rather than from a
            // delta — this is more robust against floating-point
            // drift across many drag events.
            if (rigidBody && rigidBody.primary === event.subject) {
              for (const [neighbor, off] of rigidBody.members) {
                const nx = fx + off.offsetX
                const ny = fy + off.offsetY
                neighbor.fx = nx
                neighbor.fy = ny
                neighbor.x = nx
                neighbor.y = ny
              }
            }
          }
        })
        .on("end", function dragended(event) {
          if (!event.active && !graphFrozen) simulation.alphaTarget(0)
          dragging = false

          // Distinguish click from drag by total cursor movement.
          // A "click" is when the cursor barely moved (under 5 stage
          // pixels). Anything more is a real drag, even if it happened
          // fast — clicking and accidentally moving 50 pixels in 200ms
          // should still be a drag.
          //
          // The 500ms time threshold remains as a backstop for the
          // edge case where the user holds the mouse button for a
          // long time without moving (e.g. waiting for a popover to
          // appear). Without it, "press and hold" would be ambiguous.
          // Distance is the primary test; time is the override.
          const dx = event.x - dragStartX
          const dy = event.y - dragStartY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const isClick = dist < 5 && Date.now() - dragStartTime < 500
          if (isClick) {
            event.subject.fx = null
            event.subject.fy = null
            // Click on a frozen graph still navigates. We DON'T unpin
            // the rigid-body neighbors here because they were pinned
            // pre-drag (they were already at their resting positions);
            // a click that moves nothing shouldn't change the layout.
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          } else {
            // Real drag: persist into the active saved layout so the
            // pin survives the next nav. If no layout is active, the
            // drop-to-stay still works for this render (Tier 1
            // behavior) but is lost on rebuild.
            //
            // For frozen rigid-body drags, persist EVERY member, not
            // just the primary — the user moved the whole group, so
            // every member's new position needs to be saved.
            const active = getActiveLayout()
            if (active && layoutsState && layoutsState.activeLayout) {
              const persistOne = (n: NodeData) => {
                const id = n.id as string
                const x = n.fx as number
                const y = n.fy as number
                if (Number.isFinite(x) && Number.isFinite(y)) {
                  active.positions[id] = { x, y }
                }
              }
              persistOne(event.subject as NodeData)
              if (graphFrozen && rigidBody && rigidBody.primary === event.subject) {
                for (const [neighbor] of rigidBody.members) {
                  persistOne(neighbor)
                }
              }
              active.updatedAt = nowIso()
              markDirty()
            }
          }
          rigidBody = null
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
      // Hide edges where either endpoint is filtered out — drawing a
      // line between two invisible nodes (or one visible and one
      // invisible) would leave dangling stubs across the canvas.
      if (!l.gfx.visible) continue
      l.gfx.moveTo(linkData.source.x! + width / 2, linkData.source.y! + height / 2)
      l.gfx
        .lineTo(linkData.target.x! + width / 2, linkData.target.y! + height / 2)
        .stroke({ alpha: l.alpha, width: 1, color: l.color })
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  // Apply current filter state to nodes and links. Called once during
  // render setup, then again whenever the filter changes so the user
  // can check/uncheck without a full re-render.
  const applyFilterVisibility = () => {
    for (const n of nodeRenderData) {
      const visible = isNodeVisible(n.simulationData.id)
      n.gfx.visible = visible
      if (n.label) n.label.visible = visible
    }
    for (const l of linkRenderData) {
      const srcVisible = isNodeVisible(l.simulationData.source.id)
      const tgtVisible = isNodeVisible(l.simulationData.target.id)
      l.gfx.visible = srcVisible && tgtVisible
    }
  }
  applyFilterVisibility()
  const unsubscribeFilter = (() => {
    const handler = () => applyFilterVisibility()
    filterChangeListeners.add(handler)
    return () => filterChangeListeners.delete(handler)
  })()

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

  // Expose a resize handler so external triggers (fullscreenchange in
  // PageTitle) can tell the canvas to fit a new container size. We
  // update the closure-scoped width/height — the animate loop uses
  // those for centering — and resize the pixi renderer + the d3-zoom
  // extent. Nodes' simulation coordinates are absolute (centered on
  // (0,0) by forceCenter) so we don't need to reposition them; we just
  // need the canvas to redraw at the new viewport size.
  window.__graphResize = () => {
    const newWidth = graph.offsetWidth
    const newHeight = Math.max(graph.offsetHeight, 250)
    if (newWidth === width && newHeight === height) return
    width = newWidth
    height = newHeight
    app.renderer.resize(width, height)
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    unsubscribeFreeze()
    unsubscribeFilter()
    app.destroy()
    if (window.__graphPositionSnapshot) {
      window.__graphPositionSnapshot = undefined
    }
    if (window.__graphResize) {
      window.__graphResize = undefined
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
