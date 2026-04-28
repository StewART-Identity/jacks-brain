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

const SUBJECTS_FILTER_LOCAL_KEY = "graph-subjects-unchecked"
let subjectsUnchecked: Set<string> = (function () {
  try {
    const raw = localStorage.getItem(SUBJECTS_FILTER_LOCAL_KEY)
    if (!raw) return new Set<string>()
    const arr = JSON.parse(raw)
    return new Set<string>(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set<string>()
  }
})()
const subjectsFilterChangeListeners = new Set<() => void>()
function notifySubjectsFilterChange() {
  for (const fn of subjectsFilterChangeListeners) {
    try {
      fn()
    } catch {}
  }
}
function persistSubjectsFilter() {
  try {
    localStorage.setItem(
      SUBJECTS_FILTER_LOCAL_KEY,
      JSON.stringify([...subjectsUnchecked]),
    )
  } catch {}
}

const LONERS_FILTER_LOCAL_KEY = "graph-loners-unchecked"
let lonersUnchecked: Set<string> = (function () {
  try {
    const raw = localStorage.getItem(LONERS_FILTER_LOCAL_KEY)
    if (!raw) return new Set<string>()
    const arr = JSON.parse(raw)
    return new Set<string>(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set<string>()
  }
})()
const lonersFilterChangeListeners = new Set<() => void>()
function notifyLonersFilterChange() {
  for (const fn of lonersFilterChangeListeners) {
    try {
      fn()
    } catch {}
  }
}
function persistLonersFilter() {
  try {
    localStorage.setItem(
      LONERS_FILTER_LOCAL_KEY,
      JSON.stringify([...lonersUnchecked]),
    )
  } catch {}
}

function makeMasterFlag(key: string) {
  let value = (function () {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? true : raw === "true"
    } catch {
      return true
    }
  })()
  const listeners = new Set<(v: boolean) => void>()
  return {
    get: () => value,
    set: (v: boolean) => {
      if (v === value) return
      value = v
      try {
        localStorage.setItem(key, v ? "true" : "false")
      } catch {}
      for (const fn of listeners) {
        try {
          fn(v)
        } catch {}
      }
    },
    onChange: (fn: (v: boolean) => void) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
const synthesisMaster = makeMasterFlag("graph-master-synthesis")
const subjectsMaster = makeMasterFlag("graph-master-subjects")
const lonersMaster = makeMasterFlag("graph-master-loners")

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

interface SubjectInfo {
  slug: string
  title: string
  nodeCount: number
}

interface GraphSubjectsApi {
  isUnchecked: (slug: string) => boolean
  setChecked: (slug: string, checked: boolean) => void
  toggle: (slug: string) => void
  checkAll: () => void
  uncheckAll: (allSubjects: string[]) => void
  getSubjects: () => SubjectInfo[]
  onChange: (fn: () => void) => () => void
}

interface LonerInfo {
  slug: string
  title: string
}

interface GraphLonersApi {
  isUnchecked: (slug: string) => boolean
  setChecked: (slug: string, checked: boolean) => void
  toggle: (slug: string) => void
  checkAll: () => void
  uncheckAll: (allLoners: string[]) => void
  getLoners: () => LonerInfo[]
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
    graphSubjects: GraphSubjectsApi
    graphLoners: GraphLonersApi
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
let currentSubjects: SubjectInfo[] = []
let currentLoners: LonerInfo[] = []

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

function ensureSubjectsApi() {
  if (window.graphSubjects) return
  window.graphSubjects = {
    isUnchecked(slug: string) {
      return subjectsUnchecked.has(slug)
    },
    setChecked(slug: string, checked: boolean) {
      const wasUnchecked = subjectsUnchecked.has(slug)
      if (checked && wasUnchecked) {
        subjectsUnchecked.delete(slug)
        persistSubjectsFilter()
        notifySubjectsFilterChange()
      } else if (!checked && !wasUnchecked) {
        subjectsUnchecked.add(slug)
        persistSubjectsFilter()
        notifySubjectsFilterChange()
      }
    },
    toggle(slug: string) {
      this.setChecked(slug, subjectsUnchecked.has(slug))
    },
    checkAll() {
      if (subjectsUnchecked.size === 0) return
      subjectsUnchecked.clear()
      persistSubjectsFilter()
      notifySubjectsFilterChange()
    },
    uncheckAll(allSubjects: string[]) {
      let changed = false
      for (const s of allSubjects) {
        if (!subjectsUnchecked.has(s)) {
          subjectsUnchecked.add(s)
          changed = true
        }
      }
      if (changed) {
        persistSubjectsFilter()
        notifySubjectsFilterChange()
      }
    },
    getSubjects() {
      return currentSubjects.slice()
    },
    onChange(fn) {
      subjectsFilterChangeListeners.add(fn)
      return () => subjectsFilterChangeListeners.delete(fn)
    },
  }
}

ensureSubjectsApi()

function ensureLonersApi() {
  if (window.graphLoners) return
  window.graphLoners = {
    isUnchecked(slug: string) {
      return lonersUnchecked.has(slug)
    },
    setChecked(slug: string, checked: boolean) {
      const wasUnchecked = lonersUnchecked.has(slug)
      if (checked && wasUnchecked) {
        lonersUnchecked.delete(slug)
        persistLonersFilter()
        notifyLonersFilterChange()
      } else if (!checked && !wasUnchecked) {
        lonersUnchecked.add(slug)
        persistLonersFilter()
        notifyLonersFilterChange()
      }
    },
    toggle(slug: string) {
      this.setChecked(slug, lonersUnchecked.has(slug))
    },
    checkAll() {
      if (lonersUnchecked.size === 0) return
      lonersUnchecked.clear()
      persistLonersFilter()
      notifyLonersFilterChange()
    },
    uncheckAll(allLoners: string[]) {
      let changed = false
      for (const s of allLoners) {
        if (!lonersUnchecked.has(s)) {
          lonersUnchecked.add(s)
          changed = true
        }
      }
      if (changed) {
        persistLonersFilter()
        notifyLonersFilterChange()
      }
    },
    getLoners() {
      return currentLoners.slice()
    },
    onChange(fn) {
      lonersFilterChangeListeners.add(fn)
      return () => lonersFilterChangeListeners.delete(fn)
    },
  }
}

ensureLonersApi()

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

  const nodeSubjects = new Map<string, Set<string>>()
  for (const n of graphData.nodes) {
    const subj = data.get(n.id)?.subjects
    if (subj && subj.length > 0) {
      const set = new Set<string>()
      for (const s of subj) set.add(s)
      nodeSubjects.set(n.id, set)
    }
  }
  const subjectCounts = new Map<string, number>()
  for (const subSet of nodeSubjects.values()) {
    for (const s of subSet) {
      subjectCounts.set(s, (subjectCounts.get(s) ?? 0) + 1)
    }
  }
  currentSubjects = Array.from(subjectCounts.entries())
    .map(([s, count]) => ({ slug: s, title: s, nodeCount: count }))
    .sort((a, b) => a.title.localeCompare(b.title))
  notifySubjectsFilterChange()

  currentLoners = graphData.nodes
    .filter((n) => !nodeSubjects.has(n.id))
    .map((n) => {
      const isTag = n.id.startsWith("tags/")
      const title = isTag
        ? "#" + n.id.substring(5)
        : data.get(n.id)?.title ?? n.id
      return { slug: n.id, title }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
  notifyLonersFilterChange()

  const isNodeVisible = (nodeId: string): boolean => {
    const memberships = nodeClusters.get(nodeId)
    if (memberships && memberships.size > 0) {
      if (!synthesisMaster.get()) return false
      let anyChecked = false
      for (const sSlug of memberships) {
        if (!unchecked.has(sSlug)) {
          anyChecked = true
          break
        }
      }
      if (!anyChecked) return false
    }
    const subSet = nodeSubjects.get(nodeId)
    if (subSet && subSet.size > 0) {
      if (!subjectsMaster.get()) return false
      let anyChecked = false
      for (const s of subSet) {
        if (!subjectsUnchecked.has(s)) {
          anyChecked = true
          break
        }
      }
      if (!anyChecked) return false
    } else {
      if (!lonersMaster.get()) return false
      if (lonersUnchecked.has(nodeId)) return false
    }
    return true
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

    const restingScale = (scale * 2.8) / currentTransform.k
    const neighborScale = restingScale * 1.5
    const hoveredScale = restingScale * 1.7
    const toggleOnScale = restingScale * 1.4
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
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: toggleOnScale, y: toggleOnScale },
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
    label.scale.set((scale * 2.8) / currentTransform.k)

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
      gfx.stroke({ width: 3, color: computedStyleMap["--tertiary"] })
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
            const subject = event.subject as NodeData
            const node = graphData.nodes.find((n) => n.id === subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            void (async () => {
              const outcome = await window.graphLayouts.confirmLeaveIfDirty("spa-nav")
              if (outcome === "proceed") {
                subject.fx = null
                subject.fy = null
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
            label.scale.set((scale * 2.8) / transform.k)
          }

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
        .stroke({ alpha: l.alpha, width: 2, color: l.color })
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
  const unsubscribeSubjectsFilter = (() => {
    const handler = () => applyFilterVisibility()
    subjectsFilterChangeListeners.add(handler)
    return () => subjectsFilterChangeListeners.delete(handler)
  })()
  const unsubscribeLonersFilter = (() => {
    const handler = () => applyFilterVisibility()
    lonersFilterChangeListeners.add(handler)
    return () => lonersFilterChangeListeners.delete(handler)
  })()
  const unsubscribeSynthesisMaster = synthesisMaster.onChange(() => applyFilterVisibility())
  const unsubscribeSubjectsMaster = subjectsMaster.onChange(() => applyFilterVisibility())
  const unsubscribeLonersMaster = lonersMaster.onChange(() => applyFilterVisibility())

  const unsubscribeLabelsAlwaysOn = (() => {
    const handler = () => {
      if (labelsAlwaysOn) {
        for (const label of labelsContainer.children) {
          label.alpha = 1
        }
      }
      const cb = document.getElementById("graph-display-labels-cb") as HTMLInputElement | null
      if (cb) cb.checked = labelsAlwaysOn
      renderPixiFromD3()
    }
    labelsAlwaysOnChangeListeners.add(handler)
    return () => labelsAlwaysOnChangeListeners.delete(handler)
  })()

  // ─── Cascade menu wiring ──────────────────────────────────────
  // Three L1 menus (Freeze, Display, Filter), three L2 panels
  // (Synthesis, Subjects, Loners — under Filter only).
  type CascadeOpen = "freeze" | "display" | "filter" | null
  type FilterDim = "synthesis" | "subjects" | "loners"
  let cascadeOpen: CascadeOpen = null
  let activeFilterDim: FilterDim | null = null
  let hoverSwitchTimer: number | null = null
  let leaveCloseTimer: number | null = null

  const HOVER_SWITCH_MS = 150
  const LEAVE_CLOSE_MS = 500

  const freezeBtn = document.getElementById("graph-freeze-btn")
  const filterBtn = document.getElementById("graph-filter-btn")
  const displayBtn = document.getElementById("graph-display-btn")
  const freezeMenu = document.getElementById("graph-freeze-menu")
  const filterCascadeMenu = document.getElementById("graph-filter-cascade-menu")
  const displayMenu = document.getElementById("graph-display-menu")
  const synthesisPanel = document.getElementById("graph-filter-panel")
  const synthesisBody = document.getElementById("graph-filter-body")
  const subjectsPanel = document.getElementById("graph-subjects-panel")
  const subjectsBody = document.getElementById("graph-subjects-body")
  const lonersPanel = document.getElementById("graph-loners-panel")
  const lonersBody = document.getElementById("graph-loners-body")
  const filterRowSynthesis = document.getElementById("graph-filter-cascade-row-synthesis")
  const filterRowSubjects = document.getElementById("graph-filter-cascade-row-subjects")
  const filterRowLoners = document.getElementById("graph-filter-cascade-row-loners")
  const masterSynthesisCb = document.getElementById("graph-filter-master-synthesis-cb") as HTMLInputElement | null
  const masterSubjectsCb = document.getElementById("graph-filter-master-subjects-cb") as HTMLInputElement | null
  const masterLonersCb = document.getElementById("graph-filter-master-loners-cb") as HTMLInputElement | null
  const displayLabelsCb = document.getElementById("graph-display-labels-cb") as HTMLInputElement | null
  const freezeModeCb = document.getElementById("graph-freeze-mode-cb") as HTMLInputElement | null

  const panelForDim = (dim: FilterDim) => {
    if (dim === "synthesis") return synthesisPanel
    if (dim === "subjects") return subjectsPanel
    return lonersPanel
  }
  const rowForDim = (dim: FilterDim) => {
    if (dim === "synthesis") return filterRowSynthesis
    if (dim === "subjects") return filterRowSubjects
    return filterRowLoners
  }

  const hideAllL2Panels = () => {
    if (synthesisPanel) synthesisPanel.hidden = true
    if (subjectsPanel) subjectsPanel.hidden = true
    if (lonersPanel) lonersPanel.hidden = true
  }
  const clearActiveRowHighlights = () => {
    filterRowSynthesis?.classList.remove("active")
    filterRowSubjects?.classList.remove("active")
    filterRowLoners?.classList.remove("active")
  }
  const showL2ForDim = (dim: FilterDim) => {
    hideAllL2Panels()
    clearActiveRowHighlights()
    const p = panelForDim(dim)
    if (p) p.hidden = false
    rowForDim(dim)?.classList.add("active")
    activeFilterDim = dim
  }

  const setCascadeOpen = (which: CascadeOpen) => {
    cascadeOpen = which
    if (freezeBtn) {
      freezeBtn.setAttribute("aria-expanded", which === "freeze" ? "true" : "false")
    }
    if (filterBtn) {
      filterBtn.setAttribute("aria-expanded", which === "filter" ? "true" : "false")
    }
    if (displayBtn) {
      displayBtn.setAttribute("aria-expanded", which === "display" ? "true" : "false")
    }
    if (freezeMenu) freezeMenu.hidden = which !== "freeze"
    if (filterCascadeMenu) filterCascadeMenu.hidden = which !== "filter"
    if (displayMenu) displayMenu.hidden = which !== "display"
    if (which !== "filter") {
      hideAllL2Panels()
      clearActiveRowHighlights()
      activeFilterDim = null
    }
  }

  const closeAllCascades = () => {
    if (hoverSwitchTimer !== null) {
      window.clearTimeout(hoverSwitchTimer)
      hoverSwitchTimer = null
    }
    if (leaveCloseTimer !== null) {
      window.clearTimeout(leaveCloseTimer)
      leaveCloseTimer = null
    }
    setCascadeOpen(null)
  }

  // Toolbar button click handlers — toggle their cascade open/closed.
  // For Freeze, we use { capture: true } and stopImmediatePropagation
  // to override the legacy click-to-toggle wiring that lives elsewhere
  // in the build pipeline. Capture phase fires before bubble, so our
  // handler runs first; stopImmediatePropagation prevents the legacy
  // bubble-phase listener from running.
  const onFilterBtnClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCascadeOpen(cascadeOpen === "filter" ? null : "filter")
  }
  const onDisplayBtnClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCascadeOpen(cascadeOpen === "display" ? null : "display")
  }
  const onFreezeBtnClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    setCascadeOpen(cascadeOpen === "freeze" ? null : "freeze")
  }
  filterBtn?.addEventListener("click", onFilterBtnClick)
  displayBtn?.addEventListener("click", onDisplayBtnClick)
  freezeBtn?.addEventListener("click", onFreezeBtnClick, { capture: true })

  const onRowMouseEnter = (dim: FilterDim) => {
    if (hoverSwitchTimer !== null) {
      window.clearTimeout(hoverSwitchTimer)
    }
    if (activeFilterDim === dim) return
    hoverSwitchTimer = window.setTimeout(() => {
      hoverSwitchTimer = null
      if (cascadeOpen === "filter") {
        showL2ForDim(dim)
      }
    }, HOVER_SWITCH_MS)
  }
  filterRowSynthesis?.addEventListener("mouseenter", () => onRowMouseEnter("synthesis"))
  filterRowSubjects?.addEventListener("mouseenter", () => onRowMouseEnter("subjects"))
  filterRowLoners?.addEventListener("mouseenter", () => onRowMouseEnter("loners"))

  const cascadeElements = [
    freezeMenu,
    filterCascadeMenu,
    displayMenu,
    synthesisPanel,
    subjectsPanel,
    lonersPanel,
  ].filter((el): el is HTMLElement => el !== null)

  const cancelLeaveClose = () => {
    if (leaveCloseTimer !== null) {
      window.clearTimeout(leaveCloseTimer)
      leaveCloseTimer = null
    }
  }
  const scheduleLeaveClose = () => {
    cancelLeaveClose()
    leaveCloseTimer = window.setTimeout(() => {
      leaveCloseTimer = null
      closeAllCascades()
    }, LEAVE_CLOSE_MS)
  }
  for (const el of cascadeElements) {
    el.addEventListener("mouseenter", cancelLeaveClose)
    el.addEventListener("mouseleave", scheduleLeaveClose)
  }
  freezeBtn?.addEventListener("mouseenter", cancelLeaveClose)
  freezeBtn?.addEventListener("mouseleave", scheduleLeaveClose)
  filterBtn?.addEventListener("mouseenter", cancelLeaveClose)
  filterBtn?.addEventListener("mouseleave", scheduleLeaveClose)
  displayBtn?.addEventListener("mouseenter", cancelLeaveClose)
  displayBtn?.addEventListener("mouseleave", scheduleLeaveClose)

  const onDocumentClick = (e: MouseEvent) => {
    if (cascadeOpen === null) return
    const target = e.target as Node | null
    if (!target) return
    const insideCascade =
      freezeBtn?.contains(target) ||
      filterBtn?.contains(target) ||
      displayBtn?.contains(target) ||
      cascadeElements.some((el) => el.contains(target))
    if (!insideCascade) {
      closeAllCascades()
    }
  }
  document.addEventListener("click", onDocumentClick)

  // Master checkbox wiring
  const syncMasterCheckboxes = () => {
    if (masterSynthesisCb) masterSynthesisCb.checked = synthesisMaster.get()
    if (masterSubjectsCb) masterSubjectsCb.checked = subjectsMaster.get()
    if (masterLonersCb) masterLonersCb.checked = lonersMaster.get()
  }
  syncMasterCheckboxes()
  masterSynthesisCb?.addEventListener("change", () => {
    synthesisMaster.set(masterSynthesisCb.checked)
  })
  masterSubjectsCb?.addEventListener("change", () => {
    subjectsMaster.set(masterSubjectsCb.checked)
  })
  masterLonersCb?.addEventListener("change", () => {
    lonersMaster.set(masterLonersCb.checked)
  })
  for (const cb of [masterSynthesisCb, masterSubjectsCb, masterLonersCb, displayLabelsCb, freezeModeCb]) {
    cb?.addEventListener("click", (e) => e.stopPropagation())
  }

  // Display menu Aa toggle
  if (displayLabelsCb) {
    displayLabelsCb.checked = labelsAlwaysOn
    displayLabelsCb.addEventListener("change", () => {
      window.graphLabels.setAlwaysOn(displayLabelsCb.checked)
    })
  }

  // Freeze menu group-drag toggle. Drives window.graphFreeze.toggle()
  // (the same API the legacy button used to call directly). The
  // unsubscribeFreeze handler above keeps the simulation in sync.
  if (freezeModeCb) {
    freezeModeCb.checked = graphFrozen
    freezeModeCb.addEventListener("change", () => {
      window.graphFreeze.setFrozen(freezeModeCb.checked)
    })
  }
  // Sync the freeze checkbox + button aria-pressed when freeze state
  // changes (e.g., from another tab's localStorage write, or from a
  // future graphFreeze.setFrozen call elsewhere).
  const unsubscribeFreezeCheckboxSync = (() => {
    const handler = (frozen: boolean) => {
      if (freezeModeCb) freezeModeCb.checked = frozen
      if (freezeBtn) freezeBtn.setAttribute("aria-pressed", frozen ? "true" : "false")
    }
    freezeChangeListeners.add(handler)
    handler(graphFrozen)
    return () => freezeChangeListeners.delete(handler)
  })()

  // ─── L2 panel rendering (existing logic) ─────────────────────
  type PanelRow = { slug: string; title: string; count?: number }
  const renderPanelBody = (
    body: HTMLElement,
    rows: PanelRow[],
    isUnchecked: (slug: string) => boolean,
    setChecked: (slug: string, checked: boolean) => void,
    checkAll: () => void,
    uncheckAll: (allSlugs: string[]) => void,
    emptyMessage: string,
  ) => {
    while (body.firstChild) body.removeChild(body.firstChild)

    if (rows.length === 0) {
      const empty = document.createElement("div")
      empty.className = "graph-filter-empty"
      empty.textContent = emptyMessage
      body.appendChild(empty)
      return
    }

    for (const info of rows) {
      const row = document.createElement("label")
      row.className = "graph-filter-row"
      const cb = document.createElement("input")
      cb.type = "checkbox"
      cb.checked = !isUnchecked(info.slug)
      cb.addEventListener("change", () => {
        setChecked(info.slug, cb.checked)
      })
      const name = document.createElement("span")
      name.className = "graph-filter-row-name"
      name.textContent = info.title
      row.appendChild(cb)
      row.appendChild(name)
      if (info.count !== undefined) {
        const count = document.createElement("span")
        count.className = "graph-filter-row-count"
        count.textContent = String(info.count)
        row.appendChild(count)
      }
      body.appendChild(row)
    }

    const actions = document.createElement("div")
    actions.className = "graph-filter-actions"
    const allBtn = document.createElement("button")
    allBtn.type = "button"
    allBtn.className = "graph-filter-action"
    allBtn.textContent = "Check all"
    allBtn.addEventListener("click", () => checkAll())
    const noneBtn = document.createElement("button")
    noneBtn.type = "button"
    noneBtn.className = "graph-filter-action"
    noneBtn.textContent = "Uncheck all"
    noneBtn.addEventListener("click", () =>
      uncheckAll(rows.map((r) => r.slug)),
    )
    actions.appendChild(allBtn)
    actions.appendChild(noneBtn)
    body.appendChild(actions)
  }

  const renderSynthesisPanel = () => {
    if (!synthesisBody) return
    renderPanelBody(
      synthesisBody,
      currentSyntheses.map((s) => ({
        slug: s.slug,
        title: s.title,
        count: s.nodeCount,
      })),
      (s) => window.graphFilter.isUnchecked(s),
      (s, c) => window.graphFilter.setChecked(s, c),
      () => window.graphFilter.checkAll(),
      (all) => window.graphFilter.uncheckAll(all),
      "No syntheses in this graph yet.",
    )
  }
  const renderSubjectsPanel = () => {
    if (!subjectsBody) return
    renderPanelBody(
      subjectsBody,
      currentSubjects.map((s) => ({
        slug: s.slug,
        title: s.title,
        count: s.nodeCount,
      })),
      (s) => window.graphSubjects.isUnchecked(s),
      (s, c) => window.graphSubjects.setChecked(s, c),
      () => window.graphSubjects.checkAll(),
      (all) => window.graphSubjects.uncheckAll(all),
      "No subjects in this graph yet.",
    )
  }
  const renderLonersPanel = () => {
    if (!lonersBody) return
    renderPanelBody(
      lonersBody,
      currentLoners.map((l) => ({ slug: l.slug, title: l.title })),
      (s) => window.graphLoners.isUnchecked(s),
      (s, c) => window.graphLoners.setChecked(s, c),
      () => window.graphLoners.checkAll(),
      (all) => window.graphLoners.uncheckAll(all),
      "No loners in this graph.",
    )
  }
  renderSynthesisPanel()
  renderSubjectsPanel()
  renderLonersPanel()

  const unsubscribeSynthesisPanel = (() => {
    const handler = () => renderSynthesisPanel()
    filterChangeListeners.add(handler)
    return () => filterChangeListeners.delete(handler)
  })()
  const unsubscribeSubjectsPanel = (() => {
    const handler = () => renderSubjectsPanel()
    subjectsFilterChangeListeners.add(handler)
    return () => subjectsFilterChangeListeners.delete(handler)
  })()
  const unsubscribeLonersPanel = (() => {
    const handler = () => renderLonersPanel()
    lonersFilterChangeListeners.add(handler)
    return () => lonersFilterChangeListeners.delete(handler)
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
    unsubscribeFreezeCheckboxSync()
    unsubscribeFilter()
    unsubscribeSubjectsFilter()
    unsubscribeLonersFilter()
    unsubscribeSynthesisMaster()
    unsubscribeSubjectsMaster()
    unsubscribeLonersMaster()
    unsubscribeSynthesisPanel()
    unsubscribeSubjectsPanel()
    unsubscribeLonersPanel()
    unsubscribeLabelsAlwaysOn()
    if (hoverSwitchTimer !== null) window.clearTimeout(hoverSwitchTimer)
    if (leaveCloseTimer !== null) window.clearTimeout(leaveCloseTimer)
    document.removeEventListener("click", onDocumentClick)
    filterBtn?.removeEventListener("click", onFilterBtnClick)
    displayBtn?.removeEventListener("click", onDisplayBtnClick)
    freezeBtn?.removeEventListener("click", onFreezeBtnClick, { capture: true } as EventListenerOptions)
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
