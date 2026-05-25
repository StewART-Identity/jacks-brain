---
title: "Help"
---

Reference for the two interactive visualizations that aren't self-explanatory: the [[visualize/graph|Graph]] view and the [[visualize/tags|Tags]] view. Both let you click nodes to navigate; the conventions and controls below are everything else worth knowing.

## Graph view

A reference for the controls and visual conventions of the [[visualize/graph|Graph]]. Click a node to navigate to that page.

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

## Tags view

A different kind of network: the [[visualize/tags|Tags]] view shows tag co-occurrence rather than wiki-link structure. Each node is one tag; edges connect tags that appear together on the same page.

### Reading the tag network

**Node colors** carry semantic weight:

- **Gold** — tags that are also subjects in the controlled vocabulary. These are the established ontology terms.
- **Gray-green** — tag-only. These are folksonomy terms — free-form descriptors that aren't part of the controlled subject list.

The distinction matters because a tag is *promotable* to a subject if it cluster strongly with the gold core. If you see a gray-green node pulled deep into the dense gold center, that's a visual flag: it's behaving like a subject already, and probably belongs in the controlled vocabulary.

**Node size** scales logarithmically with how many pages use that tag. Heavy hubs are larger; singletons are minimum-size dots that drift to the periphery.

**Edge thickness and opacity** scale with co-occurrence weight. A thicker, darker edge between two tags means many pages use both — they travel together. A thin, faint edge means just one page connects them.

### Interactions

- **Click** a tag — navigate to `/tags/<tag>`, the auto-generated listing page showing every page with that tag.
- **Hover** a tag — dim non-neighbors and show a tooltip with the tag's page count, whether it's also a subject, and its top 5 co-occurring tags ranked by weight.
- **Zoom in / Zoom out** (toolbar) — the **+** and **−** buttons zoom centered on the viewport. Mouse-wheel also zooms, centered on the cursor.
- **Pan** — click-and-drag the empty canvas.
- **Full screen** (toolbar) — the **⛶** button takes the network to the full viewport for closer inspection.

### What to look for

The gold-vs-gray-green coloring is the most useful reading frame. Cluster a tag-only node deep inside the dense gold center? That's a promotion candidate — it's already acting like an organizing principle, just without the controlled-vocabulary status. A gray-green node way out on the periphery is the opposite signal: a once-used descriptor that hasn't formed any organizing role and probably isn't worth promoting.
