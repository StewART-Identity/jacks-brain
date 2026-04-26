---
title: "Graph View"
summary: "Interactive map of all wiki pages and their connections. Best in fullscreen mode."
type: concept
created: 2026-04-26
updated: 2026-04-26
subjects:
  - operations
tags:
  - graph
  - visualization
  - navigation
sources: []
confidence: high
---

Interactive map of all pages and their connections. Click a node to navigate to that page.

> [!tip] Best viewed in fullscreen
> The graph fits more naturally and labels are easier to read when the canvas fills your screen. Use the fullscreen button in the graph toolbar (top-right of the graph) for the best experience.

## Reading the graph

**Node colors** indicate your relationship to each page:

- **Orange** — the page you're currently on (or the wiki home, if you're at `/`).
- **Mint green** — pages you've visited before. Visit history is stored locally in your browser.
- **Pale gray-green** — pages you haven't visited yet. New territory.
- **Outlined (no fill)** — tag nodes. These aren't pages of their own; they're connection points showing which pages share a tag.

**Node size** scales with how many connections a page has. A hub like *UNT System* will be visibly larger than a leaf entity with a single reference.

**Edges** are wikilinks between pages. Hover any node to highlight its direct neighbors and dim the rest, so you can read its local neighborhood without the whole graph competing for attention.

## Interactions

- **Click** a node — navigate to that page.
- **Drag** a node — move it around. When the graph is unfrozen, the simulation will gently re-flow around your change. When frozen, the node stays exactly where you drop it (and its neighbors come along, preserving the cluster's shape).
- **Freeze** (toolbar) — pause the physics simulation entirely. Useful when you've arranged a layout you want to keep.
- **Save layout** (toolbar) — capture the current arrangement as a named layout that survives navigation and reloads. Useful for building "views" of the graph that emphasize different relationships.
- **Zoom** — scroll wheel or pinch.
- **Pan** — click-and-drag the empty canvas.

## Why graphs help here

Tables and folders are good for *finding a thing you know exists*. Graphs are good for *seeing what surrounds the thing*. The same concept page might appear in a Sources table and an Entities table, but only the graph shows you that the concept connects to four other pages, three of which you haven't visited yet — surfacing related material you'd otherwise miss.
