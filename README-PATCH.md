# Jack's Brain — Graph Opacity Patch

Two-file patch that makes the Graph View container opaque so the
neuron-network wallpaper doesn't compete visually with the graph's own
edges.

## Why

The neuron wallpaper has faint glowing connecting lines that happen to
look exactly like the graph's own edges. When the graph container is
transparent, the eye can't separate real node-to-node connections from
the background noise. Fullscreen mode was already opaque (via a
`:fullscreen` rule), but the default embedded view was see-through.

## Change

Adds `background-color: var(--light)` to:

1. `#full-graph > .graph-container` (the main Graph View page container)
2. `.graph-outer` (the sidebar inline mini-graph shown on content pages)

Everything else about the graph behaviour is untouched.

## How to apply

Bridge:
- **Strip prefix:** `jbpatch-graph/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Two files, one commit.

Commit message suggestion:

```
Make graph view container opaque
```

## After deploy

Refresh `/visualize/graph-view`. The graph area should have a solid
light-on-dark panel matching the rest of the site's card surfaces,
with nodes and edges clearly visible against the uniform background
instead of blurring into the neuron wallpaper.
