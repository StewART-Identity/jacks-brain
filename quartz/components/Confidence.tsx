import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * Confidence — dashboard view of the corpus's calibration shape.
 *
 * Three stacked-bar charts in one SVG. Component shell is small; the
 * inline script does the work after fetching /static/corpus.json.
 * Same pattern as the other Visualize sub-pages.
 */
const Confidence: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="confidence-app">
      <div class="search-page-card">
        <h3 class="search-page-label">Confidence</h3>

        <div class="confidence-legend" aria-label="Confidence-level legend">
          <span class="confidence-legend-item">
            <span class="confidence-legend-swatch" data-level="high"></span> High
          </span>
          <span class="confidence-legend-item">
            <span class="confidence-legend-swatch" data-level="medium"></span> Medium
          </span>
          <span class="confidence-legend-item">
            <span class="confidence-legend-swatch" data-level="low"></span> Low
          </span>
          <span class="confidence-legend-item">
            <span class="confidence-legend-swatch" data-level="speculative"></span> Speculative
          </span>
          <span class="confidence-legend-item">
            <span class="confidence-legend-swatch" data-level="missing"></span> Missing
          </span>
        </div>

        <div class="confidence-svg-wrap" id="confidence-svg-wrap">
          <p class="muted confidence-loading">Loading the corpus…</p>
        </div>

        <div class="confidence-tooltip" id="confidence-tooltip" hidden></div>
      </div>
    </div>
  )
}

Confidence.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("confidence-app")
  if (!root) return

  const wrap = document.getElementById("confidence-svg-wrap")
  const tooltip = document.getElementById("confidence-tooltip")
  if (!wrap || !tooltip) return

  // ─── Constants ───────────────────────────────────────────────────
  const LEVELS = ["high", "medium", "low", "speculative", "missing"]
  const LEVEL_LABEL = {
    high: "High",
    medium: "Medium",
    low: "Low",
    speculative: "Speculative",
    missing: "Missing",
  }
  const LEVEL_COLOR = {
    high:        "#7BBF95",   // --tertiary, sage
    medium:      "#F0DDB3",   // --dark, warm sand
    low:         "#B8845A",   // muted amber
    speculative: "#5A8569",   // dimmed sage
    missing:     "#4A5A50",   // dim gray-green
  }

  // SVG viewBox. Width matches the card; height accommodates the
  // three sections (overall + N subjects + 5 types) computed
  // dynamically below — we initially set the viewBox at render time.
  const VB_W = 720
  const BAR_HEIGHT = 22       // visual height of each bar
  const ROW_GAP = 6           // gap between bars within a section
  const SECTION_GAP = 26      // gap between sections
  const SECTION_HEADER_H = 24 // height of each section's title row
  const LABEL_COL_W = 140     // width of the label column on the left
  const COUNT_COL_W = 50      // width of the count column on the right
  const PAD_LEFT = 8
  const PAD_RIGHT = 8
  const BAR_W = VB_W - PAD_LEFT - PAD_RIGHT - LABEL_COL_W - COUNT_COL_W

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
  // For each grouping (overall / subject / type), compute the count
  // per confidence level. Pages with no confidence field count as
  // "missing." Pages are counted whole-once per group except for
  // subjects, where multi-subject pages count once per subject (same
  // whole-counting convention as the Subjects treemap).

  function bucket(corpus) {
    function emptyDist() {
      return { high: 0, medium: 0, low: 0, speculative: 0, missing: 0, total: 0 }
    }

    function addPage(dist, page) {
      const c = page.confidence
      if (c === "high" || c === "medium" || c === "low" || c === "speculative") {
        dist[c] += 1
      } else {
        dist.missing += 1
      }
      dist.total += 1
    }

    const overall = emptyDist()
    const bySubject = new Map()  // subject -> dist
    const byType = new Map()     // type -> dist

    for (const page of corpus.pages) {
      addPage(overall, page)

      if (page.type) {
        if (!byType.has(page.type)) byType.set(page.type, emptyDist())
        addPage(byType.get(page.type), page)
      }

      if (Array.isArray(page.subjects) && page.subjects.length > 0) {
        for (const s of page.subjects) {
          if (!bySubject.has(s)) bySubject.set(s, emptyDist())
          addPage(bySubject.get(s), page)
        }
      }
    }

    // Subjects sorted by total descending. Types in a fixed order
    // so the rendering stays stable across builds.
    const subjects = Array.from(bySubject.entries())
      .map(([name, dist]) => ({ name, dist }))
      .sort((a, b) => b.dist.total - a.dist.total)
    const TYPE_ORDER = ["source", "entity", "concept", "synthesis", "note"]
    const TYPE_LABEL = {
      source: "Sources",
      entity: "Entities",
      concept: "Concepts",
      synthesis: "Synthesis",
      note: "Notes",
    }
    const types = TYPE_ORDER
      .filter((t) => byType.has(t))
      .map((t) => ({ name: t, label: TYPE_LABEL[t], dist: byType.get(t) }))

    return { overall, subjects, types }
  }

  // ─── Rendering ───────────────────────────────────────────────────
  //
  // Each bar is a row at a known y-offset. We render every segment
  // as a <rect> with data-* attributes so the hover handler can look
  // up the counts without re-scanning the data.

  function renderBar(y, label, dist) {
    if (dist.total === 0) return ""
    let svg = ""

    // Label.
    svg += '<text class="confidence-bar-label" x="' + (PAD_LEFT + LABEL_COL_W - 8) + '" y="' + (y + BAR_HEIGHT * 0.7) + '" text-anchor="end">' + escapeXml(label) + '</text>'

    // Stacked segments.
    let cursorX = PAD_LEFT + LABEL_COL_W
    for (const level of LEVELS) {
      const n = dist[level]
      if (n === 0) continue
      const w = (n / dist.total) * BAR_W
      const pct = ((n / dist.total) * 100).toFixed(1)
      svg += '<rect class="confidence-segment" x="' + cursorX + '" y="' + y + '" width="' + w + '" height="' + BAR_HEIGHT + '" fill="' + LEVEL_COLOR[level] + '" data-label="' + escapeXml(label) + '" data-level="' + level + '" data-count="' + n + '" data-total="' + dist.total + '" data-pct="' + pct + '"/>'
      cursorX += w
    }

    // Count label on the right.
    svg += '<text class="confidence-bar-count" x="' + (VB_W - PAD_RIGHT) + '" y="' + (y + BAR_HEIGHT * 0.7) + '" text-anchor="end">' + dist.total + '</text>'

    return svg
  }

  function renderSectionHeader(y, title) {
    return '<text class="confidence-section-header" x="' + PAD_LEFT + '" y="' + y + '">' + escapeXml(title) + '</text>'
  }

  function renderSVG(data) {
    // Compute total SVG height based on row count.
    const overallRows = 1
    const subjectRows = data.subjects.length
    const typeRows = data.types.length

    const sectionTop = (rowCount) => SECTION_HEADER_H + rowCount * (BAR_HEIGHT + ROW_GAP)
    const overallHeight = sectionTop(overallRows)
    const subjectsHeight = sectionTop(subjectRows)
    const typesHeight = sectionTop(typeRows)
    const totalHeight = overallHeight + SECTION_GAP + subjectsHeight + SECTION_GAP + typesHeight + 8

    let svg = '<svg viewBox="0 0 ' + VB_W + ' ' + totalHeight + '" preserveAspectRatio="xMidYMin meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Confidence distribution dashboard">'

    let y = 16

    // ─── Overall section ───
    svg += renderSectionHeader(y, "Overall")
    y += SECTION_HEADER_H - 6
    svg += renderBar(y, "All pages", data.overall)
    y += BAR_HEIGHT + ROW_GAP + SECTION_GAP

    // ─── By subject section ───
    svg += renderSectionHeader(y, "By subject")
    y += SECTION_HEADER_H - 6
    if (data.subjects.length === 0) {
      svg += '<text class="confidence-empty-row" x="' + PAD_LEFT + '" y="' + (y + BAR_HEIGHT * 0.7) + '">No subjects in the corpus yet.</text>'
      y += BAR_HEIGHT + ROW_GAP
    } else {
      for (const s of data.subjects) {
        svg += renderBar(y, s.name, s.dist)
        y += BAR_HEIGHT + ROW_GAP
      }
    }
    y += SECTION_GAP - ROW_GAP

    // ─── By type section ───
    svg += renderSectionHeader(y, "By type")
    y += SECTION_HEADER_H - 6
    if (data.types.length === 0) {
      svg += '<text class="confidence-empty-row" x="' + PAD_LEFT + '" y="' + (y + BAR_HEIGHT * 0.7) + '">No typed pages in the corpus yet.</text>'
    } else {
      for (const t of data.types) {
        svg += renderBar(y, t.label, t.dist)
        y += BAR_HEIGHT + ROW_GAP
      }
    }

    svg += '</svg>'
    wrap.innerHTML = svg
    bindEvents()
  }

  // ─── Hover ───────────────────────────────────────────────────────

  function bindEvents() {
    const svg = wrap.querySelector("svg")
    if (!svg) return

    function onMove(e) {
      const target = e.target.closest(".confidence-segment")
      if (!target) {
        hideTooltip()
        clearHoverDim(svg)
        return
      }
      setHoverDim(svg, target)
      showTooltip(target, e.clientX, e.clientY)
    }
    function onLeave() {
      hideTooltip()
      clearHoverDim(svg)
    }

    svg.addEventListener("mousemove", onMove)
    svg.addEventListener("mouseleave", onLeave)

    if (window.addCleanup) {
      window.addCleanup(() => {
        svg.removeEventListener("mousemove", onMove)
        svg.removeEventListener("mouseleave", onLeave)
      })
    }
  }

  function setHoverDim(svg, activeSegment) {
    const segments = svg.querySelectorAll(".confidence-segment")
    segments.forEach((s) => {
      if (s === activeSegment) s.classList.add("hovered")
      else s.classList.add("dimmed")
    })
  }
  function clearHoverDim(svg) {
    const segments = svg.querySelectorAll(".confidence-segment")
    segments.forEach((s) => {
      s.classList.remove("hovered")
      s.classList.remove("dimmed")
    })
  }

  function showTooltip(segment, clientX, clientY) {
    const wrapRect = wrap.getBoundingClientRect()
    const label = segment.getAttribute("data-label") || ""
    const level = segment.getAttribute("data-level") || ""
    const count = segment.getAttribute("data-count") || "0"
    const total = segment.getAttribute("data-total") || "0"
    const pct = segment.getAttribute("data-pct") || "0"

    const LEVEL_LABEL = {
      high: "High",
      medium: "Medium",
      low: "Low",
      speculative: "Speculative",
      missing: "Missing",
    }
    const levelLabel = LEVEL_LABEL[level] || level
    const LEVEL_COLOR = {
      high:        "#7BBF95",
      medium:      "#F0DDB3",
      low:         "#B8845A",
      speculative: "#5A8569",
      missing:     "#4A5A50",
    }
    const color = LEVEL_COLOR[level] || "#888"

    tooltip.innerHTML =
      '<div class="confidence-tooltip-row-label">' + escapeXml(label) + '</div>' +
      '<div class="confidence-tooltip-row-level">' +
        '<span class="confidence-tooltip-swatch" style="background:' + color + '"></span>' +
        escapeXml(levelLabel) +
      '</div>' +
      '<div class="confidence-tooltip-row-count">' + count + ' of ' + total + ' (' + pct + '%)</div>'

    tooltip.hidden = false
    const left = clientX - wrapRect.left + 12
    const top = clientY - wrapRect.top + 12
    tooltip.style.left = left + "px"
    tooltip.style.top = top + "px"
  }

  function hideTooltip() {
    tooltip.hidden = true
  }

  // ─── Load and render ─────────────────────────────────────────────

  fetch("/static/corpus.json")
    .then((r) => r.json())
    .then((data) => {
      const bucketed = bucket(data)
      if (bucketed.overall.total === 0) {
        wrap.innerHTML = '<p class="muted" style="text-align:center;padding:2rem 0">No pages in the corpus yet.</p>'
        return
      }
      renderSVG(bucketed)
    })
    .catch((err) => {
      wrap.innerHTML = '<p class="muted">Could not load the corpus: ' + escapeXml(err.message) + '</p>'
    })
})
`

Confidence.css = `
#confidence-app {
  max-width: 720px;
  padding-bottom: 2rem;
}

#confidence-app .search-page-card {
  padding: 1.25rem 1.25rem 1.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
}

#confidence-app .search-page-label {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: var(--dark);
}

/* Legend */
.confidence-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin: 0.5rem 0 1rem;
  font-size: 0.82rem;
  color: var(--gray);
}
.confidence-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.confidence-legend-swatch {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
}
.confidence-legend-swatch[data-level="high"]        { background: #7BBF95; }
.confidence-legend-swatch[data-level="medium"]      { background: #F0DDB3; }
.confidence-legend-swatch[data-level="low"]         { background: #B8845A; }
.confidence-legend-swatch[data-level="speculative"] { background: #5A8569; }
.confidence-legend-swatch[data-level="missing"]     { background: #4A5A50; }

/* SVG wrap */
.confidence-svg-wrap {
  position: relative;
  width: 100%;
  min-height: 200px;
}
.confidence-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}
.confidence-loading {
  margin: 0;
  padding: 1rem 0;
}

/* SVG text */
.confidence-section-header {
  fill: var(--dark);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.confidence-bar-label {
  fill: var(--darkgray);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
.confidence-bar-count {
  fill: var(--gray);
  font-family: inherit;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.confidence-empty-row {
  fill: var(--gray);
  font-family: inherit;
  font-size: 12px;
  font-style: italic;
}

/* Segment hover behavior — same hover-dim pattern as the Subjects
   treemap. The hovered segment stays full opacity; siblings dim. */
.confidence-segment {
  cursor: default;
  transition: opacity 0.12s ease;
}
.confidence-segment.dimmed {
  opacity: 0.45;
}
.confidence-segment.hovered {
  opacity: 1;
}

/* Tooltip */
.confidence-tooltip {
  position: absolute;
  pointer-events: none;
  background: color-mix(in srgb, var(--light) 96%, var(--dark) 4%);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem;
  color: var(--darkgray);
  max-width: 260px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 100;
  line-height: 1.45;
}
.confidence-tooltip[hidden] {
  display: none;
}
.confidence-tooltip-row-label {
  color: var(--dark);
  font-weight: 600;
  margin-bottom: 0.2rem;
  font-size: 0.92rem;
}
.confidence-tooltip-row-level {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.1rem;
}
.confidence-tooltip-swatch {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 2px;
  flex-shrink: 0;
}
.confidence-tooltip-row-count {
  color: var(--gray);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}
`

export default (() => Confidence) satisfies QuartzComponentConstructor
