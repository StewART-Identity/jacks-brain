import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * Timeline — horizontal multi-track chart of catalog activity.
 *
 * Mounts on /visualize/timeline. The JSX below is a thin shell — the
 * SVG itself is built at runtime by the inline script after fetching
 * /static/corpus.json. SSR would be possible (Quartz already has all
 * the corpus data at build time) but the chart is interactive (range
 * toggle, hover, click) and would require a separate inline-script
 * pass anyway, so doing both phases in the script keeps things in
 * one file.
 *
 * Layout:
 *   .search-page-card
 *     .search-page-label  "Timeline"
 *     description prose
 *     .timeline-controls   (range toggle: 90 days / All time)
 *     .timeline-legend     (type → color swatches)
 *     .timeline-svg-wrap
 *       <svg> (built by inline script)
 *     .timeline-tooltip    (hidden until hover, positioned via JS)
 *
 * The .timeline-svg-wrap is responsive: width = 100% of the card,
 * height = 320px fixed. The SVG inside uses a fixed viewBox of
 * 720x320 and scales via preserveAspectRatio.
 */
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
  const root = document.getElementById("timeline-app")
  if (!root) return

  const wrap = document.getElementById("timeline-svg-wrap")
  const tooltip = document.getElementById("timeline-tooltip")
  const btn90 = document.getElementById("timeline-range-90")
  const btnAll = document.getElementById("timeline-range-all")
  if (!wrap || !tooltip || !btn90 || !btnAll) return

  // ─── State ───────────────────────────────────────────────────────
  let currentRange = "90" // "90" or "all"
  let corpus = null

  // ─── Type palette ────────────────────────────────────────────────
  // Each type gets a color from the existing site palette where
  // possible. Synthesis gets a magenta accent because it's the only
  // cross-cutting page type and needs to stand out from the IAM-ish
  // greens/gold the other types use.
  const TYPE_COLOR = {
    source:    "#D4AD5A", // --secondary (gold)
    entity:    "#7BBF95", // --tertiary (sage)
    concept:   "#F0DDB3", // --dark (warm sand)
    synthesis: "#C75B7A", // magenta accent (not in palette; needed for distinctness)
    note:      "#9F7BB8", // muted violet (also not in palette; for the fifth track)
  }
  const TYPE_ORDER = ["source", "entity", "concept", "synthesis", "note"]
  const TYPE_LABEL = {
    source: "Sources",
    entity: "Entities",
    concept: "Concepts",
    synthesis: "Synthesis",
    note: "Notes",
  }

  // ─── Geometry ────────────────────────────────────────────────────
  // viewBox is fixed at 720×320 so all positions are in those units;
  // CSS scales the SVG to fit the card width. Reading the numbers
  // below is much easier when they map to a known coordinate space.
  const VB_W = 720
  const VB_H = 320
  const PAD_LEFT = 72   // room for type labels on the left
  const PAD_RIGHT = 12
  const PAD_TOP = 16
  const AXIS_H = 32     // axis row at the bottom
  const TRACK_W = VB_W - PAD_LEFT - PAD_RIGHT
  const TRACKS_H = VB_H - PAD_TOP - AXIS_H
  const TRACK_H = TRACKS_H / TYPE_ORDER.length  // ~54.4 per track

  // ─── Helpers ─────────────────────────────────────────────────────

  // Format a YYYY-MM-DD or ISO datetime as a Date object. Returns
  // null for unparseable input. Used everywhere we ingest a date
  // string from the corpus.
  function parseDate(s) {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  // Format a Date as "Mon D" (e.g. "May 24") for tooltips.
  function formatShort(d) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  // Format a Date as "Mon D, YYYY" for tooltips on the All-time view
  // where the year matters for disambiguation.
  function formatLong(d) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Compute the x coordinate (in viewBox units) for a given date,
  // given a start-of-range and end-of-range. Returns NaN for dates
  // outside the range so callers can filter them out.
  function xForDate(date, rangeStart, rangeEnd) {
    const total = rangeEnd.getTime() - rangeStart.getTime()
    if (total <= 0) return NaN
    const frac = (date.getTime() - rangeStart.getTime()) / total
    if (frac < 0 || frac > 1) return NaN
    return PAD_LEFT + frac * TRACK_W
  }

  // Compute the y coordinate for the center of a given type's track.
  function yForType(type) {
    const idx = TYPE_ORDER.indexOf(type)
    if (idx < 0) return PAD_TOP + TRACKS_H / 2
    return PAD_TOP + idx * TRACK_H + TRACK_H / 2
  }

  // Build the axis ticks for a date range. Returns an array of
  // {date, label, major} entries. The major flag distinguishes
  // labeled ticks from minor gridlines.
  //
  // 90-day view: weekly ticks, labeled every other week.
  // All-time view: monthly ticks, labeled every month if the span is
  // under a year, every quarter otherwise.
  function buildAxisTicks(rangeStart, rangeEnd) {
    const ticks = []
    const spanMs = rangeEnd.getTime() - rangeStart.getTime()
    const dayMs = 24 * 60 * 60 * 1000
    const spanDays = spanMs / dayMs

    if (spanDays <= 100) {
      // Weekly ticks. Start from the most recent Sunday on or before
      // rangeStart, then advance by 7 days.
      const d = new Date(rangeStart)
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - d.getUTCDay()) // back to Sunday
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
      // Monthly ticks. Start from the first of the month containing
      // rangeStart.
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

  // Build the full set of plot points for a given range. Returns:
  //   { points: [{slug, title, type, date, x, y, isReview, parentSlug}],
  //     reviewLines: [{slug, x1, x2, y}] }
  // Each source's created-date point is included; each source's
  // views[].date points are also included with isReview=true and
  // parentSlug pointing at the source. reviewLines connects the
  // points of a single source horizontally.
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

      // Re-view dots only apply to sources. The first views[] entry
      // is the initial cataloging — same date as created — so we
      // skip index 0 to avoid drawing a dot on top of the created dot.
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
        // Connect the dots for this source if there are 2+ in range.
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

  // Compute the date range from the current toggle setting. Returns
  // [rangeStart, rangeEnd].
  function computeRange() {
    const now = new Date()
    if (currentRange === "all") {
      let earliest = now
      for (const page of corpus.pages) {
        const d = parseDate(page.created)
        if (d && d < earliest) earliest = d
      }
      // Pad earliest back by 7 days so the leftmost dots aren't
      // jammed against the y-axis.
      earliest = new Date(earliest.getTime() - 7 * 24 * 60 * 60 * 1000)
      return [earliest, now]
    }
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    return [start, now]
  }

  // ─── Rendering ───────────────────────────────────────────────────

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
    const [rangeStart, rangeEnd] = computeRange()
    const ticks = buildAxisTicks(rangeStart, rangeEnd)
    const { points, reviewLines } = buildPlotData(rangeStart, rangeEnd)

    // Count points per type so we can dim empty rows.
    const pointsPerType = {}
    for (const t of TYPE_ORDER) pointsPerType[t] = 0
    for (const p of points) pointsPerType[p.type] = (pointsPerType[p.type] || 0) + 1

    let svg = '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Catalog activity timeline">'

    // Track backgrounds (alternating subtle bands for readability)
    for (let i = 0; i < TYPE_ORDER.length; i++) {
      const yTop = PAD_TOP + i * TRACK_H
      const fill = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"
      svg += '<rect x="' + PAD_LEFT + '" y="' + yTop + '" width="' + TRACK_W + '" height="' + TRACK_H + '" fill="' + fill + '"/>'
    }

    // Track labels (left side)
    for (let i = 0; i < TYPE_ORDER.length; i++) {
      const t = TYPE_ORDER[i]
      const y = PAD_TOP + i * TRACK_H + TRACK_H / 2
      const isEmpty = pointsPerType[t] === 0
      const opacity = isEmpty ? "0.4" : "1"
      svg += '<text x="' + (PAD_LEFT - 10) + '" y="' + y + '" text-anchor="end" dominant-baseline="middle" class="timeline-track-label" opacity="' + opacity + '">' + TYPE_LABEL[t] + '</text>'
    }

    // Vertical gridlines from axis ticks
    for (const tick of ticks) {
      const x = xForDate(tick.date, rangeStart, rangeEnd)
      if (isNaN(x)) continue
      const opacity = tick.major ? "0.18" : "0.08"
      svg += '<line x1="' + x + '" y1="' + PAD_TOP + '" x2="' + x + '" y2="' + (PAD_TOP + TRACKS_H) + '" stroke="currentColor" stroke-width="1" opacity="' + opacity + '"/>'
    }

    // Axis line (bottom of tracks)
    const axisY = PAD_TOP + TRACKS_H
    svg += '<line x1="' + PAD_LEFT + '" y1="' + axisY + '" x2="' + (VB_W - PAD_RIGHT) + '" y2="' + axisY + '" stroke="currentColor" stroke-width="1" opacity="0.3"/>'

    // Axis tick labels
    for (const tick of ticks) {
      if (!tick.label) continue
      const x = xForDate(tick.date, rangeStart, rangeEnd)
      if (isNaN(x)) continue
      svg += '<text x="' + x + '" y="' + (axisY + 18) + '" text-anchor="middle" class="timeline-axis-label">' + escapeXml(tick.label) + '</text>'
    }

    // Re-view connector lines (draw before dots so dots sit on top)
    for (const ln of reviewLines) {
      svg += '<line x1="' + ln.x1 + '" y1="' + ln.y + '" x2="' + ln.x2 + '" y2="' + ln.y + '" stroke="' + TYPE_COLOR.source + '" stroke-width="1.5" opacity="0.5" stroke-dasharray="2 2"/>'
    }

    // Dots
    for (const p of points) {
      const color = TYPE_COLOR[p.type] || "#888"
      const dateStr = currentRange === "90" ? formatShort(p.date) : formatLong(p.date)
      // Group with a 10px transparent hit area + visible 5px dot.
      // data-* attributes are read by the hover handler below.
      svg += '<g class="timeline-dot" data-slug="' + escapeXml(p.slug) + '" data-title="' + escapeXml(p.title) + '" data-date="' + escapeXml(dateStr) + '" data-type="' + escapeXml(p.type) + '" data-review="' + (p.isReview ? "1" : "0") + '" tabindex="0" role="button" aria-label="' + escapeXml(p.title) + ', ' + escapeXml(dateStr) + '">'
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="10" fill="transparent"/>'
      // Re-view dots are smaller and hollow to distinguish them
      // from initial-catalog dots.
      if (p.isReview) {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.5" fill="' + (root.dataset.cardFill || "#0F2418") + '" stroke="' + color + '" stroke-width="1.5"/>'
      } else {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + color + '"/>'
      }
      svg += '</g>'
    }

    // Empty-state message if no points at all.
    if (points.length === 0) {
      svg += '<text x="' + (VB_W / 2) + '" y="' + (VB_H / 2) + '" text-anchor="middle" class="timeline-empty">No pages in this range.</text>'
    }

    svg += '</svg>'
    wrap.innerHTML = svg
    bindDotEvents()
  }

  // ─── Hover / click handlers via event delegation ─────────────────

  function bindDotEvents() {
    const svg = wrap.querySelector("svg")
    if (!svg) return

    function onMove(e) {
      const target = e.target.closest(".timeline-dot")
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
      const target = e.target.closest(".timeline-dot")
      if (!target) return
      const slug = target.getAttribute("data-slug")
      if (slug) {
        window.location.href = "/" + slug
      }
    }
    function onKey(e) {
      if (e.key !== "Enter" && e.key !== " ") return
      const target = e.target.closest && e.target.closest(".timeline-dot")
      if (!target) return
      e.preventDefault()
      const slug = target.getAttribute("data-slug")
      if (slug) {
        window.location.href = "/" + slug
      }
    }

    svg.addEventListener("mousemove", onMove)
    svg.addEventListener("mouseleave", onLeave)
    svg.addEventListener("click", onClick)
    svg.addEventListener("keydown", onKey)

    if (window.addCleanup) {
      window.addCleanup(() => {
        svg.removeEventListener("mousemove", onMove)
        svg.removeEventListener("mouseleave", onLeave)
        svg.removeEventListener("click", onClick)
        svg.removeEventListener("keydown", onKey)
      })
    }
  }

  function showTooltip(title, date, isReview, clientX, clientY) {
    const wrapRect = wrap.getBoundingClientRect()
    const reviewSuffix = isReview ? '<span class="timeline-tooltip-tag">re-view</span>' : ""
    tooltip.innerHTML =
      '<div class="timeline-tooltip-title">' + escapeXml(title).replace(/ \\(re-viewed\\)$/, "") + reviewSuffix + '</div>' +
      '<div class="timeline-tooltip-date">' + escapeXml(date) + '</div>'
    tooltip.hidden = false
    // Position the tooltip relative to the wrapper, not the page,
    // so it stays anchored while scrolling.
    const left = clientX - wrapRect.left + 12
    const top = clientY - wrapRect.top + 12
    tooltip.style.left = left + "px"
    tooltip.style.top = top + "px"
  }

  function hideTooltip() {
    tooltip.hidden = true
  }

  // ─── Range toggle ────────────────────────────────────────────────

  function setRange(r) {
    currentRange = r
    btn90.classList.toggle("active", r === "90")
    btnAll.classList.toggle("active", r === "all")
    btn90.setAttribute("aria-pressed", r === "90" ? "true" : "false")
    btnAll.setAttribute("aria-pressed", r === "all" ? "true" : "false")
    renderSVG()
  }
  btn90.addEventListener("click", () => setRange("90"))
  btnAll.addEventListener("click", () => setRange("all"))

  if (window.addCleanup) {
    window.addCleanup(() => {
      btn90.removeEventListener("click", () => setRange("90"))
      btnAll.removeEventListener("click", () => setRange("all"))
    })
  }

  // ─── Load corpus and initial render ──────────────────────────────

  fetch("/static/corpus.json")
    .then((r) => r.json())
    .then((data) => {
      corpus = data
      renderSVG()
    })
    .catch((err) => {
      wrap.innerHTML = '<p class="muted">Could not load the corpus: ' + escapeXml(err.message) + '</p>'
    })
})
`

Timeline.css = `
#timeline-app {
  max-width: 720px;
  padding-bottom: 2rem;
  /* Card fill color is referenced by the re-view dot's center fill
     so it punches through the connector line cleanly. Read by the
     inline script via root.dataset.cardFill. */
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

/* Controls row — range toggle */
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

/* Legend row */
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

/* SVG wrap — relative so the tooltip can position absolutely inside */
.timeline-svg-wrap {
  position: relative;
  width: 100%;
  min-height: 320px;
}
.timeline-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--darkgray); /* used by currentColor on axis + gridlines */
}
.timeline-loading {
  margin: 0;
  padding: 1rem 0;
}

/* SVG text classes — set fill via CSS so they pick up theme color */
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

/* Dot interaction */
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
  /* Subtle highlight on hover — emphasize without redrawing */
  filter: brightness(1.15);
}

/* Tooltip */
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
