---
title: "Flexbox"
summary: "CSS layout system for arranging items in a single row or column with flexible sizing, alignment, and ordering. The first layout system that made dynamic UIs straightforward instead of arcane."
type: concept
created: 2026-05-25
updated: 2026-05-25
subjects:
  - web-styling
tags:
  - css
  - flexbox
  - flex
  - layout
  - justify-content
  - align-items
  - flex-direction
  - gap
  - main-axis
  - cross-axis
confidence: high
sources: []
---

**Flexbox** is a CSS layout system designed for arranging items along a single axis — a row of buttons, a column of menu links, a navbar with items spaced apart. It replaced the dark ages of `float`, `clear`, and table hacks for one-dimensional layout, and it's the right tool any time you have a sequence of items that need to align and distribute themselves nicely.

## The two-element structure

Flexbox always involves two roles:

- A **flex container** — the parent. You make it a flex container by setting `display: flex`.
- The **flex items** — its direct children. These are automatically affected by the container's flex rules.

The container controls how items are laid out; the items can override specific behaviors for themselves. You don't need to add a class to the items; being a direct child of `display: flex` is enough.

## Main axis vs. cross axis

Flexbox thinks in terms of two axes:

- **Main axis** — the direction items flow. Default is horizontal (left to right). Changed by `flex-direction: row` (default), `column`, `row-reverse`, or `column-reverse`.
- **Cross axis** — perpendicular to the main. If items flow horizontally, the cross axis is vertical.

This matters because the alignment properties are named after the axis they affect:

- **`justify-content`** aligns items along the *main* axis (`flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly`).
- **`align-items`** aligns items along the *cross* axis (`stretch` is default, plus `flex-start`, `flex-end`, `center`, `baseline`).

Memorizing which is which is easier once you know "justify is the main direction the items flow, align is across that flow."

## The three flex-item properties

Each item can declare how it grows and shrinks:

- **`flex-grow`** (default `0`) — if there's extra space along the main axis, how much of it does this item claim? `0` means it doesn't grow; `1` means it grows equally with other `1`s; `2` claims twice as much as a `1`.
- **`flex-shrink`** (default `1`) — if there isn't enough space, how willing is this item to shrink? `0` means it refuses to shrink (useful for fixed-width sidebars).
- **`flex-basis`** (default `auto`) — the item's starting size along the main axis, before grow/shrink kicks in.

The shorthand `flex: 1` is `flex: 1 1 0` — grow equally, shrink equally, start at 0. `flex: none` is `flex: 0 0 auto` — fixed at the item's natural size.

## `gap` — the modern replacement for margin tricks

Older Flexbox tutorials taught complicated margin tricks to put space between items without putting space on the outside. `gap: 1rem` on the container does exactly that — a uniform gap between items, with no extra space at the edges. Use `gap`; you almost never need the old margin tricks anymore.

## Where flexbox stops and Grid begins

Flexbox is one-dimensional. If you want to align items in both a row direction *and* a column direction simultaneously (a true grid), CSS Grid is the better tool. The rule of thumb: if you're arranging things along a line — a navbar, a card row, a vertical menu — use Flexbox. If you're filling a two-dimensional layout where rows AND columns need to align, use Grid.
