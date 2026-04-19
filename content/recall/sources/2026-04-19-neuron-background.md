---
title: "Neuron Background Texture"
type: source
created: 2026-04-19
updated: 2026-04-19
tags:
  - visual-identity
  - branding
  - neuron
  - wiki
  - texture
sources: []
confidence: high
---

Tileable background texture for Jack's Brain. A wide-format PNG depicting a repeating network of golden neurons on a dark forest-green background, designed for use as a site-wide CSS background or decorative surface.

[Download original](/originals/neuron_background.png)

## Visual Description

Unlike the single-neuron [[recall/sources/2026-04-18-neuron-icon-1024|app icon]] and [[recall/sources/2026-04-18-neuron-transparent|transparent overlay]], this asset shows a **network** of neurons tiled across the entire canvas:

- **Multiple somata (cell bodies)** — Several luminous golden spheres distributed across the image, each serving as a convergence hub for its local dendrite tree.
- **Dendrites** — Branching filaments radiate outward from each soma, with fine terminal branches visible at higher branch orders.
- **Axons with nodes of Ranvier** — Long, thin processes run between neurons. Regularly spaced nodes of Ranvier are visible along the axon shafts, adding biological detail absent from the icon variants.
- **Axon terminals** — Small rounded buttons mark the synaptic endpoints where one neuron's axon reaches toward a neighboring soma or dendrite, making the inter-neuron connectivity explicit.
- **Seamless tiling** — The composition is designed to repeat; the network pattern continues unbroken across tile boundaries, suitable for CSS `background-repeat: repeat` or `background-size` scaling.

The color palette is identical to the icon family — warm gold/amber neurons against deep forest-green — maintaining visual consistency across all brand assets.

## Relationship to Other Neuron Assets

| Attribute | This file | [[recall/sources/2026-04-18-neuron-icon-1024\|neuron_icon_1024.png]] | [[recall/sources/2026-04-18-neuron-transparent\|neuron_transparent.png]] |
|---|---|---|---|
| Neuron count | Many (network) | One | One |
| Background | Dark forest-green | Dark forest-green | Transparent |
| Primary use | Site background texture | App icon / home screen | Overlays, PWA |
| Tiling | Yes (seamless) | No | No |
| Nodes of Ranvier | Visible | Not visible | Not visible |
| Inter-neuron connections | Explicit | N/A | N/A |

## Purpose and Context

This texture extends the [[recall/concepts/neuron-metaphor|neuron metaphor]] from the individual icon into the ambient environment of the wiki itself. Where the app icon says "this is a neuron," the background says "you are inside a neural network." The shift from singular to plural is significant: knowledge in Jack's Brain is not a single neuron but an interconnected mesh — sources firing signals to concepts, concepts linking to syntheses, syntheses referencing back to sources.

The visibility of axon terminals and nodes of Ranvier in this asset — details absent from the icon — reflects the background's role as a texture to be experienced at larger scale, where biological fidelity rewards closer attention.

## See Also

- [[recall/concepts/neuron-metaphor]] — the conceptual framework all neuron assets instantiate
- [[recall/sources/2026-04-18-neuron-icon-1024]] — single-neuron app icon, same color palette
- [[recall/sources/2026-04-18-neuron-transparent]] — single-neuron transparent overlay variant
