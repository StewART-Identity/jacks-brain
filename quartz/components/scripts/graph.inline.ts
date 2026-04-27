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
const LAYOUTS_DIRTY_KEY = "graph-layouts-dirty"
const LAYOUTS_FLUSH_DEBOUNCE_MS = 3000

let layoutsState: LayoutsState | null = null
let layoutsLoadPromise: Promise<LayoutsState> | null = null
let layoutsDirty = (function () {
  try {
    return localStorage.getItem(LAYOUTS_DIRTY_KEY) === "true"
  } catch {
    return false
  }
})()
let flushTimer: number | null = null

const dirtyChangeListeners = new Set<(dirty: boolean) => void>()
function notifyDirtyChange() {
  for (const fn of dirtyChangeListeners) {
    try {
      fn(layoutsDirty)
    } catch {}
  }
}
function setDirty(value: boolean) {
  if (layoutsDirty === value) {
    notifyDirtyChange()
    return
  }
  layoutsDirty = value
  try {
    if (value) {
      localStorage.setItem(LAYOUTS_DIRTY_KEY, "true")
    } else {
      localStorage.removeItem(LAYOUTS_DIRTY_KEY)
    }
  } catch {}
  notifyDirtyChange()
}

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
    } catch {}
  }
}

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
    } catch {}
  }
}
function persistFilter() {
  try {
    localStorage.setItem(FILTER_LOCAL_KEY, JSON.stringify([...unchecked]))
  } catch {}
}

const LABELS_ALWAYS_ON_KEY = "graph-labels-always-on"
let labelsAlwaysOn = (function () {
  try {
    return localStorage.getItem(LABELS_ALWAYS_ON_KEY) === "true"
  } catch {
    return false
  }
})()
const labelsAlwaysOnChangeListeners = new Set<(on: boolean) => void>()
function notifyLabelsAlwaysOnChange() {
  for (const fn of labelsAlwaysOnChangeListeners) {
    try {
      fn(labelsAlwaysOn)
    } catch {}
  }
}

const layoutChangeListeners = new Set<() => void>()
function notifyLayoutChange() {
  for (const fn of layoutChangeListeners) {
    try {
      fn()
    } catch {}
  }
}

function readLayoutsCache(): LayoutsState | null {
  try {
    const raw = localStorage.getItem(LAYOUTS_LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LayoutsState
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
  } catch {}
  return null
}

function writeLayoutsCache(state: LayoutsState) {
  try {
    localStorage.setItem(LAYOUTS_LOCAL_KEY, JSON.stringify(state))
  } catch {}
}

async function fetchLayoutsFromApi(): Promise<LayoutsState> {
  const res = await fetch("/api/graph-layouts", {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  })
  if (!res.ok) {
    return { layouts: {}, activeLayout: null, sha: null }
  }
  const json = (await res.json()) as Partial<LayoutsState>
  return {
    layouts: json.layouts ?? {},
    activeLayout: json.activeLayout ?? null,
    sha: json.sha ?? null,
  }
}

function loadLayouts(): Promise<LayoutsState> {
  if (layoutsState) return Promise.resolve(layoutsState)
  if (layoutsLoadPromise) return layoutsLoadPromise

  const cached = readLayoutsCache()
  if (cached) {
    layoutsState = cached
    if (layoutsDirty) {
      return Promise.resolve(cached)
    }
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
    const blob = new Blob([body], { type: "text/plain" })
    const ok = navigator.sendBeacon("/api/graph-layouts", blob)
    if (ok) {
      setDirty(false)
    }
    return ok
  }

  fetch("/api/graph-layouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body,
    keepalive: true,
  })
    .then(async (res) => {
      if (res.ok) {
        setDirty(false)
        try {
          const json = (await res.json()) as { sha?: string | null }
          if (layoutsState && json && typeof json.sha === "string") {
            layoutsState.sha = json.sha
            writeLayoutsCache(layoutsState)
          }
        } catch {}
      } else if (res.status === 409 && layoutsState) {
        const fresh = await fetchLayoutsFromApi()
        layoutsState.sha = fresh.sha
        writeLayoutsCache(layoutsState)
        scheduleFlush()
      }
    })
    .catch(() => {})
  return true
}

async function flushLayoutsAsync(): Promise<boolean> {
  if (!layoutsDirty || !layoutsState) return true
  const body = buildPostBody(layoutsState)
  try {
    const res = await fetch("/api/graph-layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body,
    })
    if (res.ok) {
      setDirty(false)
      try {
        const json = (await res.json()) as { sha?: string | null }
        if (layoutsState && json && typeof json.sha === "string") {
          layoutsState.sha = json.sha
          writeLayoutsCache(layoutsState)
        }
      } catch {}
      return true
    }
    return false
  } catch {
    return false
  }
}

async function discardLayoutChanges(): Promise<void> {
  const fresh = await fetchLayoutsFromApi()
  layoutsState = fresh
  writeLayoutsCache(fresh)
  setDirty(false)
  notifyLayoutChange()
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
  if (layoutsState) writeLayoutsCache(layoutsState)
}

interface GraphLayoutsApi {
  getState: () => LayoutsState
  isReady: () => boolean
  ensureLoaded: () => Promise<LayoutsState>
  switchLayout: (id: string | null) => void
  createLayout: (name: string, snapshot: Record<string, LayoutPosition>) => string | null
  renameLayout: (id: string, newName: string) => boolean
  deleteLayout: (id: string) => boolean
  onChange: (fn: () => void) => () => void
  isDirty: () => boolean
  flushNow: () => boolean
  flushNowAsync: () => Promise<boolean>
  discardChanges: () => Promise<void>
  confirmLeaveIfDirty: (action: LeaveAction) => Promise<LeaveOutcome>
  onDirtyChange: (fn: (dirty: boolean) => void) => () => void
}

type LeaveAction = "exit-fullscreen" | "switch-layout" | "spa-nav"
type LeaveOutcome = "proceed" | "cancel"

interface GraphFreezeApi {
  isFrozen: () => boolean
  setFrozen: (frozen: boolean) => void
  toggle: () => boolean
  onChange: (fn: (frozen: boolean) => void) => () => void
}

interface SynthesisInfo {
  slug: string
  title: string
  nodeCount: number
}

interface GraphFilterApi {
  isUnchecked: (slug: string) => boolean
  setChecked: (slug: string, checked: boolean) => void
  toggle: (slug: string) => void
  checkAll: () => void
  uncheckAll: (allSyntheses: string[]) => void
  getSyntheses: () => SynthesisInfo[]
  onChange: (fn: () => void) => () => void
}

interface GraphLabelsApi {
  isAlwaysOn: () => boolean
  setAlwaysOn: (on: boolean) => void
  toggle: () => boolean
  onChange: (fn: (on: boolean) => void) => () => void
}

declare global {
  interface Window {
    graphLayouts: GraphLayoutsApi
    graphFreeze: GraphFreezeApi
    graphFilter: GraphFilterApi
    graphLabels: GraphLabelsApi
    __graphPositionSnapshot?: () => Record<string, LayoutPosition>
    __graphResize?: () => void
    __graphRepin?: () => void
  }
}

interface ModalElements {
  overlay: HTMLDivElement
  title: HTMLHeadingElement
  message: HTMLParagraphElement
  layoutName: HTMLElement
  error: HTMLDivElement
  saveBtn: HTMLButtonElement
  discardBtn: HTMLButtonElement
  cancelBtn: HTMLButtonElement
}

let modalEls: ModalElements | null = null

function ensureModalDom(): ModalElements {
  if (modalEls) return modalEls

  const overlay = document.createElement("div")
  overlay.id = "graph-confirm-modal"
  overlay.className = "graph-modal-overlay"
  overlay.hidden = true

  const card = document.createElement("div")
  card.className = "graph-modal-card"
  card.setAttribute("role", "dialog")
  card.setAttribute("aria-modal", "true")
  card.setAttribute("aria-labelledby", "graph-modal-title")

  const title = document.createElement("h3")
  title.id = "graph-modal-title"
  title.className = "graph-modal-title"
  title.textContent = "Unsaved changes"

  const message = document.createElement("p")
  message.className = "graph-modal-message"
  const layoutName = document.createElement("strong")
  layoutName.className = "graph-modal-layout-name"

  const error = document.createElement("div")
  error.className = "graph-modal-error"
  error.hidden = true

  const buttons = document.createElement("div")
  buttons.className = "graph-modal-buttons"

  const cancelBtn = document.createElement("button")
  cancelBtn.type = "button"
  cancelBtn.className = "graph-modal-btn"
  cancelBtn.textContent = "Cancel"

  const discardBtn = document.createElement("button")
  discardBtn.type = "button"
  discardBtn.className = "graph-modal-btn graph-modal-btn-discard"
  discardBtn.textContent = "Discard"

  const saveBtn = document.createElement("button")
  saveBtn.type = "button"
  saveBtn.className = "graph-modal-btn graph-modal-btn-primary"
  saveBtn.textContent = "Save"

  buttons.appendChild(cancelBtn)
  buttons.appendChild(discardBtn)
  buttons.appendChild(saveBtn)

  card.appendChild(title)
  card.appendChild(message)
  card.appendChild(error)
  card.appendChild(buttons)
  overlay.appendChild(card)
  document.body.appendChild(overlay)

  modalEls = { overlay, title, message, layoutName, error, saveBtn, discardBtn, cancelBtn }
  return modalEls
}

function modalCopyForAction(action: LeaveAction): { title: string; lead: string } {
  switch (action) {
    case "exit-fullscreen":
      return {
        title: "Exit fullscreen with unsaved changes?",
        lead: "You have unsaved changes to ",
      }
    case "switch-layout":
      return {
        title: "Switch layouts with unsaved changes?",
        lead: "You have unsaved changes to ",
      }
    case "spa-nav":
      return {
        title: "Leave with unsaved changes?",
        lead: "You have unsaved changes to ",
      }
  }
}

async function confirmLeaveIfDirty(action: LeaveAction): Promise<LeaveOutcome> {
  if (!layoutsDirty) return "proceed"
  const els = ensureModalDom()

  const active = getActiveLayout()
  const layoutLabel = active?.name ?? "this layout"
  const copy = modalCopyForAction(action)
  els.title.textContent = copy.title
  while (els.message.firstChild) els.message.removeChild(els.message.firstChild)
  els.message.appendChild(document.createTextNode(copy.lead))
  els.layoutName.textContent = layoutLabel
  els.message.appendChild(els.layoutName)
  els.message.appendChild(document.createTextNode("."))

  els.error.hidden = true
  els.error.textContent = ""
  els.saveBtn.disabled = false
  els.discardBtn.disabled = false
  els.cancelBtn.disabled = false
  els.overlay.hidden = false

  els.cancelBtn.focus()

  return new Promise<LeaveOutcome>((resolve) => {
    const cleanup = () => {
      els.overlay.hidden = true
      els.saveBtn.removeEventListener("click", onSave)
      els.discardBtn.removeEventListener("click", onDiscard)
      els.cancelBtn.removeEventListener("click", onCancel)
      els.overlay.removeEventListener("click", onOverlayClick)
      document.removeEventListener("keydown", onKeyDown)
    }

    const onSave = async () => {
      els.saveBtn.disabled = true
      els.discardBtn.disabled = true
      els.cancelBtn.disabled = true
      els.error.hidden = true
      els.saveBtn.textContent = "Saving…"
      const ok = await flushLayoutsAsync()
      if (ok) {
        cleanup()
        els.saveBtn.textContent = "Save"
        resolve("proceed")
      } else {
        els.saveBtn.textContent = "Save"
        els.error.textContent =
          "Couldn't save your changes. Try again, or discard / cancel."
        els.error.hidden = false
        els.saveBtn.disabled = false
        els.discardBtn.disabled = false
        els.cancelBtn.disabled = false
      }
    }

    const onDiscard = async () => {
      els.saveBtn.disabled = true
      els.discardBtn.disabled = true
      els.cancelBtn.disabled = true
      els.discardBtn.textContent = "Discarding…"
      try {
        await discardLayoutChanges()
        if (window.__graphRepin) window.__graphRepin()
      } catch {}
      els.discardBtn.textContent = "Discard"
      cleanup()
      resolve("proceed")
    }

    const onCancel = () => {
      cleanup()
      resolve("cancel")
    }

    const onOverlayClick = (e: MouseEvent) => {
      if (e.target === els.overlay) onCancel()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      }
    }

    els.saveBtn.addEventListener("click", onSave)
    els.discardBtn.addEventListener("click", onDiscard)
    els.cancelBtn.addEventListener("click", onCancel)
    els.overlay.addEventListener("click", onOverlayClick)
    document.addEventListener("keydown", onKeyDown)
  })
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
      if (id in layoutsState.layouts) {
        let n = 2
        while (`${id}-${n}` in layoutsState.layouts) n++
        id = `${id}-${n}`
      }
      const ts = nowIso()
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
    isDirty() {
      return layoutsDirty
    },
    flushNow() {
      cancelScheduledFlush()
      return flushLayouts(false)
    },
    flushNowAsync() {
      cancelScheduledFlush()
      return flushLayoutsAsync()
    },
    discardChanges() {
      return discardLayoutChanges()
    },
    confirmLeaveIfDirty(action) {
      return confirmLeaveIfDirty(action)
    },
    onDirtyChange(fn) {
      dirtyChangeListeners.add(fn)
      return () => dirtyChangeListeners.delete(fn)
    },
  }

  window.addEventListener("beforeunload", (e) => {
    if (layoutsDirty) {
      e.preventDefault()
      e.returnValue = ""
    }
  })
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
      } catch {}
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

function ensureLabelsApi() {
  if (window.graphLabels) return
  window.graphLabels = {
    isAlwaysOn() {
      return labelsAlwaysOn
    },
    setAlwaysOn(on: boolean) {
      if (on === labelsAlwaysOn) return
      labelsAlwaysOn = on
      try {
        localStorage.setItem(LABELS_ALWAYS_ON_KEY, on ? "true" : "false")
      } catch {}
      notifyLabelsAlwaysOnChange()
    },
    toggle() {
      this.setAlwaysOn(!labelsAlwaysOn)
      return labelsAlwaysOn
    },
    onChange(fn) {
      labelsAlwaysOnChangeListeners.add(fn)
      return () => labelsAlwaysOnChangeListeners.delete(fn)
    },
  }
}

ensureLabelsApi()

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
    velocityDecay,
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

  const synthesisSlugs: SimpleSlug[] = []
  for (const k of data.keys()) {
    if (k.startsWith("collection/synthesis/") && !k.endsWith("/index")) {
      synthesisSlugs.push(k)
    }
  }
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
  const nodeClusters = new Map<string, Set<string>>()
  for (const n of graphData.nodes) {
    const memberships = new Set<string>()
    for (const [sSlug, members] of clusterMembers) {
      if (members.has(n.id)) memberships.add(sSlug)
    }
    nodeClusters.set(n.id, memberships)
  }
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

  const isNodeVisible = (nodeId: string): boolean => {
    const memberships = nodeClusters.get(nodeId)
    if (!memberships || memberships.size === 0) return true
    for (const sSlug of memberships) {
      if (!unchecked.has(sSlug)) return true
    }
    return false
  }

  let width = graph.offsetWidth
  let height = Math.max(graph.offsetHeight, 250)

  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance))
    .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3))

  if (alphaDecay !== undefined) simulation.alphaDecay(alphaDecay)
  if (velocityDecay !== undefined) simulation.velocityDecay(velocityDecay)

  const radius = (Math.min(width, height) / 2) * 0.8
  if (enableRadial) simulation.force("radial", forceRadial(radius).strength(0.2))

  await loadLayouts()
  const pinFromLayout = () => {
    const active = getActiveLayout()
    if (!active) return
    for (const n of graphData.nodes) {
      const p = active.positions[n.id]
      if (p) {
        n.fx = p.x
        n.fy = p.y
        n.x = p.x
        n.y = p.y
      }
    }
  }
  pinFromLayout()

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

  const pinAllAtCurrent = () => {
    for (const n of graphData.nodes) {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        n.fx = n.x
        n.fy = n.y
      }
    }
  }

  let calmPinApplied = false
  simulation.on("end", () => {
    if (calmPinApplied) return
    if (graphFrozen) return
    pinAllAtCurrent()
    calmPinApplied = true
  })

  if (graphFrozen) {
    pinAllAtCurrent()
    simulation.stop()

    const unpinnedNew: NodeData[] = []
    for (const n of graphData.nodes) {
      if (n.fx == null && n.fy == null) {
        unpinnedNew.push(n)
      }
    }
    if (unpinnedNew.length > 0) {
      requestAnimationFrame(() => {
        if (!graphFrozen) return
        simulation.alpha(0.5).restart()
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
        pinAllAtCurrent()
        simulation.stop()
      } else {
        simulation.alpha(0.3).restart()
      }
    }
    freezeChangeListeners.add(handler)
    return () => freezeChangeListeners.delete(handler)
  })()


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
  let dragStartX = 0
  let dragStartY = 0
  let dragging = false
  let currentTransform = zoomIdentity

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = 1

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

    // Bumped from `scale / currentTransform.k` because the previous
    // resting size was effectively invisible at full-screen zoom.
    const restingScale = (scale * 1.4) / currentTransform.k
    const neighborScale = restingScale * 3.3
    const hoveredScale = restingScale * 3.3
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
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
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: neighborScale, y: neighborScale },
            },
            100,
          ),
        )
      } else if (labelsAlwaysOn) {
        // Toggle on: render every "other" label at hovered size,
        // full opacity. Hover bloom is still honored above; this
        // branch only fires when the label is neither hovered
        // nor a neighbor of the hovered node.
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: hoveredScale, y: hoveredScale },
            },
            100,
          ),
        )
      } else {
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
    label.scale.set((scale * 1.4) / currentTransform.k)

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
          if (!event.active && !graphFrozen) simulation.alphaTarget(0.3).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }

          if (graphFrozen) {
            const primary = event.subject as NodeData
            const neighborIds = adjacency.get(primary.id as string) ?? new Set<string>()
            if (neighborIds.size === 1) {
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
                n.fx = n.x
                n.fy = n.y
              }
              rigidBody = { primary, members }
            }
          } else {
            rigidBody = null
          }

          dragStartX = event.x
          dragStartY = event.y
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged(event) {
          const initPos = event.subject.__initialDragPos
          event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k
          event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k
          if (graphFrozen) {
            const fx = event.subject.fx as number
            const fy = event.subject.fy as number
            event.subject.x = fx
            event.subject.y = fy

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

          const dx = event.x - dragStartX
          const dy = event.y - dragStartY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const isClick = dist < 5 && Date.now() - dragStartTime < 500
          if (isClick) {
            event.subject.fx = null
            event.subject.fy = null
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            void (async () => {
              const outcome = await window.graphLayouts.confirmLeaveIfDirty("spa-nav")
              if (outcome === "proceed") {
                window.spaNavigate(new URL(targ, window.location.toString()))
              }
            })()
          } else {
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

          updateHoverInfo(null)
          renderPixiFromD3()
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", async () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        const outcome = await window.graphLayouts.confirmLeaveIfDirty("spa-nav")
        if (outcome === "proceed") {
          window.spaNavigate(new URL(targ, window.location.toString()))
        }
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

          for (const label of labelsContainer.children) {
            label.scale.set((scale * 1.4) / transform.k)
          }

          // When labelsAlwaysOn is set, every label stays at full
          // opacity regardless of zoom — the resting-fade behavior
          // is exactly what the toggle is meant to suppress.
          if (labelsAlwaysOn) {
            for (const label of labelsContainer.children) {
              label.alpha = 1
            }
            return
          }

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

  // Wire the Aa toolbar button directly to graphLabels.toggle.
  // Direct addEventListener (not delegation) — delegation didn't
  // fire for reasons unclear; this pattern matches the rest of the
  // listeners in renderGraph and gets cleaned up the same way.
  const labelsBtn = document.getElementById("graph-labels-btn")
  const onLabelsBtnClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.graphLabels.toggle()
  }
  if (labelsBtn) {
    labelsBtn.addEventListener("click", onLabelsBtnClick)
    // Sync DOM state with persisted localStorage value on render.
    labelsBtn.setAttribute("aria-pressed", labelsAlwaysOn ? "true" : "false")
    labelsBtn.setAttribute(
      "title",
      labelsAlwaysOn ? "Hide all labels" : "Show all labels",
    )
  }

  // When the labelsAlwaysOn toggle flips, push the change through
  // renderPixiFromD3 so existing labels animate to their new state
  // without waiting for the next hover or zoom event. Also keep the
  // button DOM in sync with the new state.
  const unsubscribeLabelsAlwaysOn = (() => {
    const handler = () => {
      if (labelsAlwaysOn) {
        for (const label of labelsContainer.children) {
          label.alpha = 1
        }
      }
      const btn = document.getElementById("graph-labels-btn")
      if (btn) {
        btn.setAttribute("aria-pressed", labelsAlwaysOn ? "true" : "false")
        btn.setAttribute(
          "title",
          labelsAlwaysOn ? "Hide all labels" : "Show all labels",
        )
      }
      renderPixiFromD3()
    }
    labelsAlwaysOnChangeListeners.add(handler)
    return () => labelsAlwaysOnChangeListeners.delete(handler)
  })()

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

  window.__graphResize = () => {
    const newWidth = graph.offsetWidth
    const newHeight = Math.max(graph.offsetHeight, 250)
    if (newWidth === width && newHeight === height) return
    width = newWidth
    height = newHeight
    app.renderer.resize(width, height)
  }

  window.__graphRepin = () => {
    const active = getActiveLayout()
    for (const n of graphData.nodes) {
      const p = active ? active.positions[n.id] : undefined
      if (p) {
        n.fx = p.x
        n.fy = p.y
        n.x = p.x
        n.y = p.y
      } else {
        n.fx = null
        n.fy = null
      }
    }
    if (!graphFrozen) {
      simulation.alpha(0.3).restart()
    }
  }

  requestAnimationFrame(animate)
  return () => {
    stopAnimation = true
    unsubscribeFreeze()
    unsubscribeFilter()
    unsubscribeLabelsAlwaysOn()
    if (labelsBtn) {
      labelsBtn.removeEventListener("click", onLabelsBtnClick)
    }
    app.destroy()
    if (window.__graphPositionSnapshot) {
      window.__graphPositionSnapshot = undefined
    }
    if (window.__graphResize) {
      window.__graphResize = undefined
    }
    if (window.__graphRepin) {
      window.__graphRepin = undefined
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
      const isOpen = containers.some((c) => c.classList.contains("active"))
      isOpen ? hideGlobalGraph() : renderGlobalGraph()
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
