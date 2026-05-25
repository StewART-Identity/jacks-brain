import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * Subjects — treemap visualization of the corpus's controlled
 * subject vocabulary.
 *
 * The component shell is small; all the rendering happens in the
 * inline script after fetching /static/corpus.json. Two reasons to
 * defer to runtime:
 *
 *   1. The data is needed at runtime anyway for tooltips and
 *      navigation. Pre-rendering only saves a fetch, not actual
 *      compute.
 *   2. Keeping the geometry in one place (the inline script) makes
 *      the layout algorithm easier to reason about than splitting
 *      it across server-render and client-hover.
 */
const Subjects: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <div class={displayClass} id="subjects-app">
      <div class="search-page-card">
        <h3 class="search-page-label">Subjects</h3>

        <div class="subjects-svg-wrap" id="subjects-svg-wrap">
          <p class="muted subjects-loading">Loading the corpus…</p>
        </div>

        <div class="subjects-tooltip" id="subjects-tooltip" hidden></div>

        <div class="subjects-legend" aria-label="Type legend">
          <span class="subjects-legend-item">
            <span class="subjects-legend-swatch" data-type="source"></span> Sources
          </span>
          <span class="subjects-legend-item">
            <span class="subjects-legend-swatch" data-type="entity"></span> Entities
          </span>
          <span class="subjects-legend-item">
            <span class="subjects-legend-swatch" data-type="concept"></span> Concepts
          </span>
          <span class="subjects-legend-item">
            <span class="subjects-legend-swatch" data-type="synthesis"></span> Synthesis
          </span>
          <span class="subjects-legend-item">
            <span class="subjects-legend-swatch" data-type="note"></span> Notes
          </span>
        </div>
      </div>
    </div>
  )
}

Subjects.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const root = document.getElementById("subjects-app")
  if (!root) return

  const wrap = document.getElementById("subjects-svg-wrap")
  const tooltip = document.getElementById("subjects-tooltip")
  if (!wrap || !tooltip) return

  // ─── Constants ───────────────────────────────────────────────────
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

  // SVG viewBox dimensions. Width matches the card's content width;
  // height is fixed at 480 to give the treemap room to breathe even
  // when one or two subjects dominate.
  const VB_W = 720
  const VB_H = 480

  function escapeXml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  // ─── Squarified treemap layout ───────────────────────────────────
  //
  // Bruls, Huijing & van Wijk (2000), "Squarified Treemaps".
  //
  // Given a rectangle and a list of items (each with a numeric value),
  // place each item as a sub-rectangle inside the parent. At each
  // step the algorithm tries to add the next item to the current
  // "row" of rectangles, and only commits the row when adding another
  // item would make the worst aspect ratio worse than it is now.
  //
  // This produces rectangles that are as close to square as possible
  // given the constraints — which is what makes squarified treemaps
  // visually scannable. The naive alternative (slice-and-dice) gives
  // long thin rectangles for small items, which are unreadable.

  function worst(row, w) {
    // Worst aspect ratio in a row of given total side length w.
    let rMax = -Infinity, rMin = Infinity, total = 0
    for (const r of row) {
      if (r > rMax) rMax = r
      if (r < rMin) rMin = r
      total += r
    }
    const s2 = total * total
    const w2 = w * w
    return Math.max((w2 * rMax) / s2, s2 / (w2 * rMin))
  }

  function layoutRow(items, row, x, y, w, h, horizontal) {
    // Place a committed row of items into the available rectangle.
    // Returns the new available rectangle (remaining space after
    // this row is consumed).
    const total = row.reduce((a, b) => a + b.value, 0)
    if (horizontal) {
      // Row occupies a horizontal strip of height (total / w).
      const stripH = total / w
      let cursor = x
      for (const item of row) {
        const itemW = item.value / total * w
        item.rect = { x: cursor, y, w: itemW, h: stripH }
        cursor += itemW
      }
      return { x, y: y + stripH, w, h: h - stripH }
    } else {
      // Row occupies a vertical strip of width (total / h).
      const stripW = total / h
      let cursor = y
      for (const item of row) {
        const itemH = item.value / total * h
        item.rect = { x, y: cursor, w: stripW, h: itemH }
        cursor += itemH
      }
      return { x: x + stripW, y, w: w - stripW, h }
    }
  }

  function squarify(items, x, y, w, h) {
    // Scale item values so they sum exactly to (w * h). This makes
    // the worst-ratio calculation in worst() use comparable units.
    const totalValue = items.reduce((a, b) => a + b.value, 0)
    if (totalValue === 0) return items
    const area = w * h
    const scale = area / totalValue
    const scaledItems = items.map((it) => ({
      ...it,
      value: it.value * scale,
    }))

    let remaining = { x, y, w, h }
    let queue = scaledItems.slice()
    let row = []

    while (queue.length > 0) {
      const next = queue[0]
      const shortSide = Math.min(remaining.w, remaining.h)
      if (shortSide === 0) break

      const candidate = row.concat([next])
      const candidateValues = candidate.map((r) => r.value)
      const rowValues = row.map((r) => r.value)
      const horizontal = remaining.w >= remaining.h

      // If adding next would make the worst ratio worse, commit the
      // current row and start a new one (with next at its head).
      if (
        row.length > 0 &&
        worst(candidateValues, shortSide) > worst(rowValues, shortSide)
      ) {
        remaining = layoutRow(items, row, remaining.x, remaining.y, remaining.w, remaining.h, horizontal)
        row = []
      } else {
        row.push(next)
        queue.shift()
      }
    }

    // Flush the final row.
    if (row.length > 0) {
      const horizontal = remaining.w >= remaining.h
      layoutRow(items, row, remaining.x, remaining.y, remaining.w, remaining.h, horizontal)
    }

    // Copy the rect from scaledItems back to the original items
    // (same indices, since we only re-mapped, not reordered).
    for (let i = 0; i < items.length; i++) {
      items[i].rect = scaledItems[i].rect
    }
    return items
  }

  // ─── Aggregation ────────────────────────────────────────────────
  //
  // From the corpus, produce one entry per subject:
  //   { subject, total, byType: {source: N, entity: N, ...},
  //     multiSubject: N }
  // multiSubject = count of pages tagged with this subject that
  // ALSO have at least one other subject.

  function aggregate(corpus) {
    const bySubject = new Map()
    for (const page of corpus.pages) {
      if (!page.subjects || page.subjects.length === 0) continue
      const isMulti = page.subjects.length > 1
      for (const s of page.subjects) {
        if (!bySubject.has(s)) {
          bySubject.set(s, {
            subject: s,
            total: 0,
            byType: { source: 0, entity: 0, concept: 0, synthesis: 0, note: 0 },
            multiSubject: 0,
          })
        }
        const entry = bySubject.get(s)
        entry.total += 1
        if (page.type && entry.byType[page.type] !== undefined) {
          entry.byType[page.type] += 1
        }
        if (isMulti) entry.multiSubject += 1
      }
    }
    // Return as a list, sorted by total descending. Squarification
    // works best when the items are sorted largest-first.
    return Array.from(bySubject.values()).sort((a, b) => b.total - a.total)
  }

  // ─── Rendering ──────────────────────────────────────────────────

  function renderTreemap(subjects) {
    if (subjects.length === 0) {
      wrap.innerHTML = '<p class="muted" style="text-align:center;padding:2rem 0">No subjects in the corpus yet. Add a <code>subjects:</code> field to your page frontmatter to start filling this in.</p>'
      return
    }

    // Layout: full viewBox.
    const items = subjects.map((s) => ({ ...s, value: s.total }))
    squarify(items, 0, 0, VB_W, VB_H)

    let svg = '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Subject distribution treemap">'

    for (const item of items) {
      const r = item.rect
      if (!r || r.w <= 0 || r.h <= 0) continue

      // Outer group acts as the click target and hover-detect surface.
      svg += '<g class="subjects-cell" data-subject="' + escapeXml(item.subject) + '" tabindex="0" role="button" aria-label="' + escapeXml(item.subject) + ', ' + item.total + ' pages">'

      // The cell is composed of type-colored horizontal strips
      // proportional to that type's count within this subject.
      // Strips are stacked top-to-bottom in TYPE_ORDER, with a 1px
      // gap between them so the divisions are visible without
      // needing extra borders.
      let cursorY = r.y
      const totalForType = TYPE_ORDER.reduce((a, t) => a + item.byType[t], 0)
      for (const t of TYPE_ORDER) {
        const count = item.byType[t]
        if (count === 0) continue
        const stripH = (count / totalForType) * r.h
        if (stripH <= 0) continue
        svg += '<rect class="subjects-strip" data-type="' + t + '" x="' + r.x + '" y="' + cursorY + '" width="' + r.w + '" height="' + stripH + '" fill="' + TYPE_COLOR[t] + '"/>'
        cursorY += stripH
      }

      // Border for the cell, to separate it from neighbors.
      svg += '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" fill="none" stroke="var(--light)" stroke-width="1.5" pointer-events="none"/>'

      // Label, only if the cell is big enough to fit.
      if (r.w > 60 && r.h > 28) {
        const lx = r.x + 8
        const ly = r.y + 18
        const labelText = item.subject
        const countText = String(item.total)
        // The text is clipped via the cell's own bounding box (the
        // background rects). Using a foreignObject would let HTML
        // ellipsize natively, but SVG <text> is faster and the wiki
        // doesn't have subject names long enough to need it.
        svg += '<text class="subjects-label" x="' + lx + '" y="' + ly + '" pointer-events="none">' + escapeXml(labelText) + '</text>'
        // Count text below the label, in a smaller, dimmer style.
        if (r.h > 38) {
          svg += '<text class="subjects-count" x="' + lx + '" y="' + (ly + 14) + '" pointer-events="none">' + countText + '</text>'
        }
      }

      svg += '</g>'
    }

    svg += '</svg>'
    wrap.innerHTML = svg
    bindEvents(items)
  }

  function bindEvents(items) {
    const svg = wrap.querySelector("svg")
    if (!svg) return

    // Map subject → item so the hover handler can look up the
    // tooltip data without rescanning.
    const lookup = new Map()
    for (const it of items) lookup.set(it.subject, it)

    function onMove(e) {
      const cell = e.target.closest(".subjects-cell")
      if (!cell) {
        hideTooltip()
        clearHoverDim()
        return
      }
      const subject = cell.getAttribute("data-subject")
      const item = lookup.get(subject)
      if (!item) return
      setHoverDim(cell)
      showTooltip(item, e.clientX, e.clientY)
    }
    function onLeave() {
      hideTooltip()
      clearHoverDim()
    }
    function onClick(e) {
      const cell = e.target.closest(".subjects-cell")
      if (!cell) return
      const subject = cell.getAttribute("data-subject")
      if (subject) {
        window.location.href = "/subjects/" + encodeURIComponent(subject)
      }
    }
    function onKey(e) {
      if (e.key !== "Enter" && e.key !== " ") return
      const cell = e.target.closest && e.target.closest(".subjects-cell")
      if (!cell) return
      e.preventDefault()
      const subject = cell.getAttribute("data-subject")
      if (subject) {
        window.location.href = "/subjects/" + encodeURIComponent(subject)
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

  function setHoverDim(activeCell) {
    const cells = wrap.querySelectorAll(".subjects-cell")
    cells.forEach((c) => {
      if (c === activeCell) c.classList.add("hovered")
      else c.classList.add("dimmed")
    })
  }
  function clearHoverDim() {
    const cells = wrap.querySelectorAll(".subjects-cell")
    cells.forEach((c) => {
      c.classList.remove("hovered")
      c.classList.remove("dimmed")
    })
  }

  function showTooltip(item, clientX, clientY) {
    const wrapRect = wrap.getBoundingClientRect()
    const breakdown = TYPE_ORDER
      .filter((t) => item.byType[t] > 0)
      .map((t) =>
        '<div class="subjects-tooltip-row"><span class="subjects-tooltip-swatch" style="background:' + TYPE_COLOR[t] + '"></span>' + TYPE_LABEL[t] + ' <span class="subjects-tooltip-count">' + item.byType[t] + '</span></div>'
      )
      .join("")
    const multiBadge = item.multiSubject > 0
      ? '<div class="subjects-tooltip-multi">' + item.multiSubject + ' ' + (item.multiSubject === 1 ? 'page spans' : 'pages span') + ' multiple subjects</div>'
      : ''

    tooltip.innerHTML =
      '<div class="subjects-tooltip-title">' + escapeXml(item.subject) + '</div>' +
      '<div class="subjects-tooltip-total">' + item.total + ' ' + (item.total === 1 ? 'page' : 'pages') + '</div>' +
      '<div class="subjects-tooltip-breakdown">' + breakdown + '</div>' +
      multiBadge
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
      const aggregated = aggregate(data)
      renderTreemap(aggregated)
    })
    .catch((err) => {
      wrap.innerHTML = '<p class="muted">Could not load the corpus: ' + escapeXml(err.message) + '</p>'
    })
})
`

Subjects.css = `
#subjects-app {
  max-width: 720px;
  padding-bottom: 2rem;
}

#subjects-app .search-page-card {
  padding: 1.25rem 1.25rem 1.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 12px;
  background: color-mix(in srgb, var(--light) 92%, transparent);
}

#subjects-app .search-page-label {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  color: var(--dark);
}

/* SVG wrap — relative so the tooltip can be absolutely-positioned
   inside it, anchored to the wrap rather than the page. */
.subjects-svg-wrap {
  position: relative;
  width: 100%;
  min-height: 320px;
  margin: 0.5rem 0;
}
.subjects-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}
.subjects-loading {
  margin: 0;
  padding: 1rem 0;
}

/* Cells. The hover behavior mirrors Quartz's graph node hover: the
   hovered cell stays full-opacity, every other cell dims. This is
   pre-attentively obvious — your eye locks onto the hovered cell
   without conscious effort. */
.subjects-cell {
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.subjects-cell.dimmed {
  opacity: 0.55;
}
.subjects-cell.hovered {
  opacity: 1;
}
.subjects-cell:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: -2px;
}

/* SVG text */
.subjects-label {
  fill: var(--light);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  /* Background-blend technique would be ideal but isn't widely
     supported in SVG <text>. The cells are dark enough on every
     palette swatch that --light reads cleanly without a halo. */
}
.subjects-count {
  fill: var(--light);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  opacity: 0.75;
}

/* Legend */
.subjects-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin-top: 0.75rem;
  font-size: 0.82rem;
  color: var(--gray);
}
.subjects-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.subjects-legend-swatch {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
}
.subjects-legend-swatch[data-type="source"]    { background: #D4AD5A; }
.subjects-legend-swatch[data-type="entity"]    { background: #7BBF95; }
.subjects-legend-swatch[data-type="concept"]   { background: #F0DDB3; }
.subjects-legend-swatch[data-type="synthesis"] { background: #C75B7A; }
.subjects-legend-swatch[data-type="note"]      { background: #9F7BB8; }

/* Tooltip */
.subjects-tooltip {
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
.subjects-tooltip[hidden] {
  display: none;
}
.subjects-tooltip-title {
  color: var(--dark);
  font-weight: 600;
  margin-bottom: 0.1rem;
  font-size: 0.92rem;
}
.subjects-tooltip-total {
  color: var(--gray);
  font-size: 0.78rem;
  margin-bottom: 0.4rem;
}
.subjects-tooltip-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.subjects-tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}
.subjects-tooltip-swatch {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 2px;
  flex-shrink: 0;
}
.subjects-tooltip-count {
  margin-left: auto;
  color: var(--gray);
  font-variant-numeric: tabular-nums;
}
.subjects-tooltip-multi {
  margin-top: 0.5rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--lightgray);
  color: var(--secondary);
  font-size: 0.78rem;
  font-weight: 500;
}
`

export default (() => Subjects) satisfies QuartzComponentConstructor
