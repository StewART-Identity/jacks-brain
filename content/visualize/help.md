---
title: "Help"
aliases:
  - "application/help"
---

Reference for the interactive visualizations in the Visualize section — the color conventions, controls, and encodings that aren't obvious at a glance. Most of them let you click through to the underlying pages; the notes below cover everything else worth knowing. The sections run in the same order as the pages under Visualize.

## Confidence view

The [[visualize/confidence|Confidence]] view is a read-only dashboard of how well-grounded the collection is. Where the Graph and Tags views are networks you explore, this one is a set of stacked bars you *read* — there's nothing to click.

### Reading the dashboard

Every bar is a **100%-width stacked bar**: the share of pages at each confidence level, drawn left to right from most to least certain.

**The five levels** (legend at the top):

- **High** (mint green), **Medium** (cream), **Low** (brown), and **Speculative** (deep green) — the value from each page's `confidence:` frontmatter.
- **Missing** (gray) — pages that don't set a `confidence:` value at all.

The bars are grouped into three stacked blocks:

- **Overall** — one bar for the entire corpus.
- **By subject** — one bar per subject, largest subjects first.
- **By type** — one bar each for Sources, Entities, Concepts, Synthesis, and Notes.

### Interactions

- **Hover** a segment — a tooltip names the row and level and gives the exact figure (e.g. *12 of 40, 30%*). Hovering also dims the other segments so the one you're reading stands out.
- Nothing is clickable here; the view is purely diagnostic.

### What to look for

A subject or type bar dominated by **Low**, **Speculative**, or **Missing** is the signal worth acting on — that slice of the collection wants sourcing or review. A solid wall of gray under a subject usually just means you haven't been recording confidence there yet, rather than that the material is weak.

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

## Subjects view

The [[visualize/subjects|Subjects]] view is a treemap of the controlled vocabulary: every subject drawn as a rectangle sized by how much of the collection sits under it. Click a cell to open that subject's listing page.

### Reading the treemap

**Cell size** is the number of pages carrying that subject — the big rectangles are your centers of gravity, the slivers are subjects with only a page or two.

**The colored strips inside each cell** break that subject down by page type, using the legend at the bottom:

- **Sources** (gold), **Entities** (mint green), **Concepts** (cream), **Synthesis** (rose), and **Notes** (violet).

Strip heights are proportional, so a cell that's almost all gold is almost all raw sources, while one carrying a visible rose band has synthesis built on top of its material.

A page tagged with more than one subject is counted in *each* of its subjects' cells, so the treemap's totals add up to more than the page count — by design.

### Interactions

- **Click** a cell (or focus it and press Enter) — go to `/subjects/<subject>`, the listing of every page under that subject.
- **Hover** a cell — dims the rest and shows a tooltip with the subject, its total page count, the per-type breakdown, and how many of those pages span multiple subjects.

### What to look for

The type mix inside a cell is the real read. A large subject that's all Sources and Entities with no Synthesis is unprocessed — raw material you've gathered but haven't woven together yet. The multi-subject figure in the tooltip flags the cross-cutting subjects that stitch different parts of the collection together.

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

## Timeline view

The [[visualize/timeline|Timeline]] view plots catalog activity over time — when each page entered the collection — so you can see your working rhythm and where attention has been going. Click any dot to open its page.

### Reading the timeline

**Five horizontal lanes**, one per page type, top to bottom: Sources, Entities, Concepts, Synthesis, Notes. Lane colors match the legend, and a lane with no pages in view is dimmed.

**Each dot** is a page, placed by its `created` date along the time axis and on its type's lane.

**Hollow dots joined by a dashed line** are source re-views. When a source records more than one view date in its `views:` history, the first sits as a solid dot and each later re-view is a hollow dot, with a dashed line running from first to last — a quick read of which sources you keep coming back to.

### Interactions

- **Last 90 days / All time** (the buttons up top) — switch the window. *90 days* shows your recent cadence against weekly gridlines; *All time* stretches from your earliest page to now, with monthly or quarterly ticks.
- **Hover** a dot — a tooltip gives the page title and date, tagged *re-view* for the hollow ones.
- **Click** a dot (or focus it and press Enter) — open that page.

### What to look for

Clusters and gaps show the rhythm of the work — bursts of cataloging against quiet stretches. The balance across lanes is the other read: a long row of Source dots with little beneath them in Concepts and Synthesis means raw material is arriving faster than you're processing it. The dashed re-view lines mark the sources earning repeat attention.
