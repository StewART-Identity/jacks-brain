import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Timeline: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="timeline-app">
      <div class="search-page-card">
        <h3 class="search-page-label">Timeline</h3>

        <div class="timeline-controls" role="group" aria-label="Time range">
          <button
            type="button"
            class="timeline-range-btn active"
            id="timeline-range-90"
            aria-pressed="true"
          >
            Last 90 days
          </button>
          <button
            type="button"
            class="timeline-range-btn"
            id="timeline-range-all"
            aria-pressed="false"
          >
            All time
          </button>
        </div>

        <div class="timeline-legend" aria-label="Type legend">
          <span class="timeline-legend-item" data-type="source">
            <span class="timeline-legend-swatch" data-type="source"></span> Sources
          </span>
          <span class="timeline-legend-item" data-type="entity">
            <span class="timeline-legend-swatch" data-type="entity"></span> Entities
          </span>
          <span class="timeline-legend-item" data-type="concept">
            <span class="timeline-legend-swatch" data-type="concept"></span> Concepts
          </span>
          <span class="timeline-legend-item" data-type="synthesis">
            <span class="timeline-legend-swatch" data-type="synthesis"></span> Synthesis
          </span>
          <span class="timeline-legend-item" data-type="note">
            <span class="timeline-legend-swatch" data-type="note"></span> Notes
          </span>
        </div>

        <div class="timeline-svg-wrap" id="timeline-svg-wrap">
          <p class="muted timeline-loading">Loading the corpus…</p>
        </div>

        <div class="timeline-tooltip" id="timeline-tooltip" hidden></div>
      </div>
    </div>
  )
}

Timeline.afterDOMLoaded = `
document.addEventListener("nav", () => {
  // SCOPED NAV HANDLER: bail early if we're not on the Timeline
  // page. Same pattern as Tags. The document-level nav event fires
  // for every SPA navigation, but only one Visualize page is mounted
  // at a time.
  const root = document.getElementById("timeline-app")
  if (!root) return

  const wrap = document.getElementById("timeline-svg-wrap")
  const tooltip = document.getElementById("timeline-tooltip")
  const btn90 = document.getElementById("timeline-range-90")
  const btnAll = document.getElementById("timeline-range-all")
  if (!wrap || !tooltip || !btn90 || !btnAll) return

  // SINGLE-ENTRY GUARD: a per-mount timestamp lets stale renders
  // detect they're from a previous mount and exit cleanly.
  const mountedAt = Date.now()
  wrap.__timelineMountedAt = mountedAt

  // ─── State ───────────────────────────────────────────────────────
  let currentRange = "90"
  let corpus = null

  const TYPE_COLOR = {
    source:    "#D4AD5A",
    entity:    "#7BBF95",
    concept:   "#F0DDB3",
    synthesis: "#C75B7A",
    note:      "#9F7BB8",
  }
  const TYPE_ORDER = ["source", "entity", "concept", "synthesis", "note"]
  const TYPE_LABEL = {
    source: "Sources",
    entity: "Entities",
    concept: "Concepts",
    synthesis: "Synthesis",
    note: "Notes",
  }

  const VB_W = 720
  const VB_H = 320
  const PAD_LEFT = 72
  const PAD_RIGHT = 12
  const PAD_TOP = 16
  const AXIS_H = 32
  const TRACK_W = VB_W - PAD_LEFT - PAD_RIGHT
  const TRACKS_H = VB_H - PAD_TOP - AXIS_H
  const TRACK_H = TRACKS_H / TYPE_ORDER.length

  function parseDate(s) {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  function formatShort(d) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  function formatLong(d) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function xForDate(date, rangeStart, rangeEnd) {
    const total = rangeEnd.getTime() - rangeStart.getTime()
    if (total <= 0) return NaN
    const frac = (date.getTime() - rangeStart.getTime()) / total
    if (frac < 0 || frac > 1) return NaN
    return PAD_LEFT + frac * TRACK_W
  }

  function yForType(type) {
    const idx = TYPE_ORDER.indexOf(type)
    if (idx < 0) return PAD_TOP + TRACKS_H / 2
    return PAD_TOP + idx * TRACK_H + TRACK_H / 2
  }

  function buildAxisTicks(rangeStart, rangeEnd) {
    const ticks = []
    const spanMs = rangeEnd.getTime() - rangeStart.getTime()
    const dayMs = 24 * 60 * 60 * 1000
    const spanDays = spanMs / dayMs

    if (spanDays <= 100) {
      const d = new Date(rangeStart)
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - d.getUTCDay())
      let i = 0
      while (d <= rangeEnd) {
        if (d >= rangeStart) {
          ticks.push({
            date: new Date(d),
            label: i % 2 === 0 ? formatShort(d) : "",
            major: i % 2 === 0,
          })
        }
        d.setUTCDate(d.getUTCDate() + 7)
        i++
      }
    } else {
      const d = new Date(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1)
      const labelEveryN = spanDays > 365 ? 3 : 1
      let i = 0
      while (d <= rangeEnd) {
        if (d >= rangeStart) {
          const label = i % labelEveryN === 0
            ? d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
            : ""
          ticks.push({ date: new Date(d), label, major: i % labelEveryN === 0 })
        }
        d.setUTCMonth(d.getUTCMonth() + 1)
        i++
      }
    }
    return ticks
  }

  function buildPlotData(rangeStart, rangeEnd) {
    const points = []
    const reviewLinesBySource = new Map()

    for (const page of corpus.pages) {
      const created = parseDate(page.created)
      if (!created) continue

      const xCreated = xForDate(created, rangeStart, rangeEnd)
      const y = yForType(page.type)

      if (!isNaN(xCreated)) {
        points.push({
          slug: page.slug,
          title: page.title,
          type: page.type,
          date: created,
          x: xCreated,
          y: y,
          isReview: false,
          parentSlug: null,
        })
      }

      if (page.type === "source" && Array.isArray(page.views) && page.views.length > 1) {
        const xsForSource = !isNaN(xCreated) ? [xCreated] : []
        for (let i = 1; i < page.views.length; i++) {
          const v = page.views[i]
          const vDate = parseDate(v.date)
          if (!vDate) continue
          const xV = xForDate(vDate, rangeStart, rangeEnd)
          if (isNaN(xV)) continue
          xsForSource.push(xV)
          points.push({
            slug: page.slug,
            title: page.title + " (re-viewed)",
            type: page.type,
            date: vDate,
            x: xV,
            y: y,
            isReview: true,
            parentSlug: page.slug,
          })
        }
        if (xsForSource.length >= 2) {
          xsForSource.sort((a, b) => a - b)
          reviewLinesBySource.set(page.slug, {
            slug: page.slug,
            x1: xsForSource[0],
            x2: xsForSource[xsForSource.length - 1],
            y: y,
          })
        }
      }
    }

    return { points, reviewLines: Array.from(reviewLinesBySource.values()) }
  }

  function computeRange() {
    const now = new Date()
    if (currentRange === "all") {
      let earliest = now
      for (const page of corpus.pages) {
        const d = parseDate(page.created)
        if (d && d < earliest) earliest = d
      }
      earliest = new Date(earliest.getTime() - 7 * 24 * 60 * 60 * 1000)
      return [earliest, now]
    }
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    return [start, now]
  }

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function renderSVG() {
    if (!corpus) return
    // Stale-mount check: don't render into a wrap that belongs to a
    // different mount.
    if (wrap.__timelineMountedAt !== mountedAt) return

    const [rangeStart, rangeEnd] = computeRange()
    const ticks = buildAxisTicks(rangeStart, rangeEnd)
    const { points, reviewLines } = buildPlotData(rangeStart, rangeEnd)

    const pointsPerType = {}
    for (const t of TYPE_ORDER) pointsPerType[t] = 0
    for (const p of points) pointsPerType[p.type] = (pointsPerType[p.type] || 0) + 1

    let svg = '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Catalog activity timeline">'

    for (let i = 0; i < TYPE_ORDER.length; i++) {
      const yTop = PAD_TOP + i * TRACK_H
      const fill = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"
      svg += '<rect x="' + PAD_LEFT + '" y="' + yTop + '" width="' + TRACK_W + '" height="' + TRACK_H + '" fill="' + fill + '"/>'
    }

    for (let i = 0; i < TYPE_ORDER.length; i++) {
      const t = TYPE_ORDER[i]
      const y = PAD_TOP + i * TRACK_H + TRACK_H / 2
      const isEmpty = pointsPerType[t] === 0
      const opacity = isEmpty ? "0.4" : "1"
      svg += '<text x="' + (PAD_LEFT - 10) + '" y="' + y + '" text-anchor="end" dominant-baseline="middle" class="timeline-track-label" opacity="' + opacity + '">' + TYPE_LABEL[t] + '</text>'
    }

    for (const tick of ticks) {
      const x = xForDate(tick.date, rangeStart, rangeEnd)
      if (isNaN(x)) continue
      const opacity = tick.major ? "0.18" : "0.08"
      svg += '<line x1="' + x + '" y1="' + PAD_TOP + '" x2="' + x + '" y2="' + (PAD_TOP + TRACKS_H) + '" stroke="currentColor" stroke-width="1" opacity="' + opacity + '"/>'
    }

    const axisY = PAD_TOP + TRACKS_H
    svg += '<line x1="' + PAD_LEFT + '" y1="' + axisY + '" x2="' + (VB_W - PAD_RIGHT) + '" y2="' + axisY + '" stroke="currentColor" stroke-width="1" opacity="0.3"/>'

    for (const tick of ticks) {
      if (!tick.label) continue
      const x = xForDate(tick.date, rangeStart, rangeEnd)
      if (isNaN(x)) continue
      svg += '<text x="' + x + '" y="' + (axisY + 18) + '" text-anchor="middle" class="timeline-axis-label">' + escapeXml(tick.label) + '</text>'
    }

    for (const ln of reviewLines) {
      svg += '<line x1="' + ln.x1 + '" y1="' + ln.y + '" x2="' + ln.x2 + '" y2="' + ln.y + '" stroke="' + TYPE_COLOR.source + '" stroke-width="1.5" opacity="0.5" stroke-dasharray="2 2"/>'
    }

    for (const p of points) {
      const color = TYPE_COLOR[p.type] || "#888"
      const dateStr = currentRange === "90" ? formatShort(p.date) : formatLong(p.date)
      svg += '<g class="timeline-dot" data-slug="' + escapeXml(p.slug) + '" data-title="' + escapeXml(p.title) + '" data-date="' + escapeXml(dateStr) + '" data-type="' + escapeXml(p.type) + '" data-review="' + (p.isReview ? "1" : "0") + '" tabindex="0" role="button" aria-label="' + escapeXml(p.title) + ', ' + escapeXml(dateStr) + '">'
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="10" fill="transparent"/>'
      if (p.isReview) {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.5" fill="#0F2418" stroke="' + color + '" stroke-width="1.5"/>'
      } else {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + color + '"/>'
      }
      svg += '</g>'
    }

    if (points.length === 0) {
      svg += '<text x="' + (VB_W / 2) + '" y="' + (VB_H / 2) + '" text-anchor="middle" class="timeline-empty">No pages in this range.</text>'
    }

    svg += '</svg>'
    wrap.innerHTML = svg
  }

  // ─── Single-entry hover/click delegation on the wrap ─────────────
  //
  // Same fix as Tags: bind listeners once on the wrap (which
  // survives across renderSVG calls), not on every render.

  function onMove(e) {
    const target = e.target.closest && e.target.closest(".timeline-dot")
    if (!target) {
      hideTooltip()
      return
    }
    const title = target.getAttribute("data-title") || ""
    const date = target.getAttribute("data-date") || ""
    const isReview = target.getAttribute("data-review") === "1"
    showTooltip(title, date, isReview, e.clientX, e.clientY)
  }
  function onLeave() {
    hideTooltip()
  }
  function onClick(e) {
    const target = e.target.closest && e.target.closest(".timeline-dot")
    if (!target) return
    const slug = target.getAttribute("data-slug")
    if (slug) window.location.href = "/" + slug
  }
  function onKey(e) {
    if (e.key !== "Enter" && e.key !== " ") return
    const target = e.target.closest && e.target.closest(".timeline-dot")
    if (!target) return
    e.preventDefault()
    const slug = target.getAttribute("data-slug")
    if (slug) window.location.href = "/" + slug
  }

  function showTooltip(title, date, isReview, clientX, clientY) {
    const wrapRect = wrap.getBoundingClientRect()
    const reviewSuffix = isReview ? '<span class="timeline-tooltip-tag">re-view</span>' : ""
    tooltip.innerHTML =
      '<div class="timeline-tooltip-title">' +
        escapeXml(title).replace(/ \\(re-viewed\\)$/, "") + reviewSuffix +
      '</div>' +
      '<div class="timeline-tooltip-date">' + escapeXml(date) + '</div>'
    tooltip.hidden = false
    const left = clientX - wrapRect.left + 12
    const top = clientY - wrapRect.top + 12
    tooltip.style.left = left + "px"
    tooltip.style.top = top + "px"
  }

  function hideTooltip() {
    tooltip.hidden = true
  }

  wrap.addEventListener("mousemove", onMove)
  wrap.addEventListener("mouseleave", onLeave)
  wrap.addEventListener("click", onClick)
  wrap.addEventListener("keydown", onKey)

  // ─── Range toggle ────────────────────────────────────────────────

  function setRange(r) {
    currentRange = r
    btn90.classList.toggle("active", r === "90")
    btnAll.classList.toggle("active", r === "all")
    btn90.setAttribute("aria-pressed", r === "90" ? "true" : "false")
    btnAll.setAttribute("aria-pressed", r === "all" ? "true" : "false")
    renderSVG()
  }
  function onBtn90Click() { setRange("90") }
  function onBtnAllClick() { setRange("all") }
  btn90.addEventListener("click", onBtn90Click)
  btnAll.addEventListener("click", onBtnAllClick)

  if (window.addCleanup) {
    window.addCleanup(() => {
      if (wrap.__timelineMountedAt === mountedAt) {
        wrap.__timelineMountedAt = null
      }
      wrap.removeEventListener("mousemove", onMove)
      wrap.removeEventListener("mouseleave", onLeave)
      wrap.removeEventListener("click", onClick)
      wrap.removeEventListener("keydown", onKey)
      btn90.removeEventListener("click", onBtn90Click)
      btnAll.removeEventListener("click", onBtnAllClick)
    })
  }

  // ─── Load corpus and render ──────────────────────────────────────

  fetch("/static/corpus.json")
    .then((r) => r.json())
    .then((data) => {
      // Don't render if we've been unmounted while the fetch was
      // in flight.
      if (wrap.__timelineMountedAt !== mountedAt) return
      corpus = data
      renderSVG()
    })
    .catch((err) => {
      if (wrap.__timelineMountedAt !== mountedAt) return
      wrap.innerHTML = '<p class="muted">Could not load the corpus: ' + escapeXml(err.message) + '</p>'
    })
})
`

Timeline.css = `
#timeline-app {
  max-width: 720px;
  padding-bottom: 2rem;
}

#timeline-app .search-page-card {
  padding: 1.25rem 1.25rem 1.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
}

#timeline-app .search-page-label {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: var(--dark);
}

.timeline-controls {
  display: flex;
  gap: 0.4rem;
  margin: 0.5rem 0 0.75rem;
}
.timeline-range-btn {
  appearance: none;
  background: transparent;
  color: var(--gray);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.timeline-range-btn:hover {
  background: var(--highlight);
  color: var(--darkgray);
}
.timeline-range-btn.active {
  background: var(--secondary);
  color: var(--light);
  border-color: var(--secondary);
}

.timeline-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
  color: var(--gray);
}
.timeline-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.timeline-legend-swatch {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
}
.timeline-legend-swatch[data-type="source"]    { background: #D4AD5A; }
.timeline-legend-swatch[data-type="entity"]    { background: #7BBF95; }
.timeline-legend-swatch[data-type="concept"]   { background: #F0DDB3; }
.timeline-legend-swatch[data-type="synthesis"] { background: #C75B7A; }
.timeline-legend-swatch[data-type="note"]      { background: #9F7BB8; }

.timeline-svg-wrap {
  position: relative;
  width: 100%;
  min-height: 320px;
}
.timeline-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--darkgray);
}
.timeline-loading {
  margin: 0;
  padding: 1rem 0;
}

.timeline-track-label {
  fill: var(--darkgray);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
.timeline-axis-label {
  fill: var(--gray);
  font-family: inherit;
  font-size: 11px;
}
.timeline-empty {
  fill: var(--gray);
  font-family: inherit;
  font-size: 14px;
  font-style: italic;
}

.timeline-dot {
  cursor: pointer;
}
.timeline-dot:focus-visible {
  outline: none;
}
.timeline-dot:focus-visible circle:nth-child(2) {
  stroke: var(--secondary);
  stroke-width: 2;
}
.timeline-dot:hover circle:nth-child(2) {
  filter: brightness(1.15);
}

.timeline-tooltip {
  position: absolute;
  pointer-events: none;
  background: color-mix(in srgb, var(--light) 96%, var(--dark) 4%);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.82rem;
  color: var(--darkgray);
  max-width: 260px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 100;
  line-height: 1.35;
}
.timeline-tooltip[hidden] {
  display: none;
}
.timeline-tooltip-title {
  color: var(--dark);
  font-weight: 600;
  margin-bottom: 0.15rem;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}
.timeline-tooltip-tag {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.timeline-tooltip-date {
  color: var(--gray);
  font-size: 0.78rem;
}
`

export default (() => Timeline) satisfies QuartzComponentConstructor
