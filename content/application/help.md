---
title: "Help"
---

A guide to navigating and using Jack's Brain.

## Sections

### Search
- **[[search/wiki|Wiki]]** — Search across all wiki content
- **[[search/web|Web]]** — Find candidate sources on the web

### Collect
- **[[collect/selection|Selection]]** — Add a chosen source to the collection
- **[[collect/acquisition|Acquisition]]** — Track documents through cataloging
- **[[collect/retention|Retention]]** — Permanent record of retained documents

### Reflect
- **[[reflect/sources|Sources]]** — Summaries of cataloged documents
- **[[reflect/entities|Entities]]** — People, organizations, tools, systems
- **[[reflect/concepts|Concepts]]** — Ideas, theories, frameworks
- **[[reflect/synthesis|Synthesis]]** — Cross-cutting analysis

### Study
- **[[study/graph|Graph]]** — Interactive map of connections (see the [[application/help#graph-view|Graph view]] section below)
- **[[study/notes|Notes]]** — Quick captures and fragments. Each note becomes a wiki page with wikilinks and tags

### Application
- **[[application/help|Help]]** — This page
- **[[application/nuke|Nuke It From Orbit]]** — Erase all cataloged content and start fresh

## Graph view

A reference for the controls and visual conventions of the [[study/graph|Graph]]. Click a node to navigate to that page.

### Reading the graph

**Node colors** indicate your relationship to each page:

- **Orange** — the page you're currently on (or the wiki home, if you're at `/`).
- **Mint green** — pages you've visited before. Visit history is stored locally in your browser.
- **Pale gray-green** — pages you haven't visited yet. New territory.
- **Outlined (no fill)** — tag nodes. These aren't pages of their own; they're connection points showing which pages share a tag.

**Node size** scales with how many connections a page has. A hub like *UNT System* will be visibly larger than a leaf entity with a single reference.

**Edges** are wikilinks between pages. Hover any node to highlight its direct neighbors and dim the rest, so you can read its local neighborhood without the whole graph competing for attention.

### Interactions

- **Click** a node — navigate to that page.
- **Zoom** — scroll wheel or pinch.
- **Pan** — click-and-drag the empty canvas.
- **Drag** a node — move it. The behavior depends on the toolbar's **drag-mode** toggle (the snowflake button); see below.
- **Save layout** (toolbar) — capture the current arrangement as a named layout that survives navigation and reloads. Useful for building "views" of the graph that emphasize different relationships.

### Drag modes

The graph has two drag modes, toggled by the snowflake button in the top-right toolbar.

**Single-drag** (default, button not pressed). Drag a node and only that node moves; its neighbors stay put. Edges stretch to follow because they're attached at both ends, but the surrounding graph holds still. This is the calm default — useful for nudging individual nodes into place without disturbing what's around them.

When the page first loads, you'll see a brief physics animation as the graph finds its initial shape. Once it settles, the layout locks: the simulation is no longer pushing nodes around, and your drags only affect the node you're holding.

**Group-drag** (button pressed, snowflake lit). Drag a node and its 1-hop neighbors come along as a rigid cluster, preserving the local geometry. Useful when you want to relocate a whole subgraph as a unit — e.g. moving a hub and its satellites to a less crowded part of the canvas.

A small exception: if a node has only one neighbor, group-drag falls back to single-drag for that node. Otherwise dragging a leaf would always drag its hub along, which is rarely what you want.

### Why graphs help here

Tables and folders are good for *finding a thing you know exists*. Graphs are good for *seeing what surrounds the thing*. The same concept page might appear in a Sources table and an Entities table, but only the graph shows you that the concept connects to four other pages, three of which you haven't visited yet — surfacing related material you'd otherwise miss.
