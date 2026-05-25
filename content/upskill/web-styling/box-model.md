---
title: "The CSS box model"
summary: "Every HTML element renders as a rectangle made of four concentric layers — content, padding, border, margin — and which of those layers width and height refer to depends on box-sizing."
type: concept
created: 2026-05-25
updated: 2026-05-25
subjects:
  - web-styling
tags:
  - css
  - box-model
  - padding
  - border
  - margin
  - box-sizing
  - content-box
  - border-box
  - layout
confidence: high
sources: []
---

Every HTML element renders as a rectangle. The CSS **box model** describes the structure of that rectangle: four concentric layers, working outward from the content itself.

## The four layers

**Content.** The innermost area — the text, image, or child elements the box actually contains. Its width and height are what you set with the `width` and `height` properties (subject to `box-sizing`, below).

**Padding.** Transparent space *inside* the border, between the border and the content. Padding inherits the element's background, so a colored background extends through the padding area. Set with `padding`, `padding-top`, `padding-left`, etc.

**Border.** A drawn line around the padding. Has its own width, style, and color (`border: 1px solid green`). Borders are visible and have visual weight; padding does not.

**Margin.** Transparent space *outside* the border, separating this element from its neighbors. Set with `margin`, `margin-top`, etc. Margin does NOT inherit the element's background — it's the gap to the next element.

A quick mnemonic from the outside in: margin → border → padding → content. Margin pushes other things away; padding pushes content inward.

## `box-sizing` — the one property that changes everything

By default (`box-sizing: content-box`), when you set `width: 300px`, you're setting only the *content* width. The actual rendered width of the box on the page is `300px + left padding + right padding + left border + right border`. This is almost never what you want, because it means you can't easily say "make this box exactly 300px wide."

Setting **`box-sizing: border-box`** changes that calculation: `width: 300px` now includes padding and border. The content area shrinks to make room for them. The total rendered width is exactly 300px regardless of how much padding or border you add. This is so much more useful that nearly every modern codebase sets it globally:

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

If you've ever wondered why a CSS file at the top of every project does this — that's why.

## Margin collapse — the weird one

Vertical margins between adjacent block elements **collapse**: if the bottom margin of one element is 20px and the top margin of the next is 30px, the gap between them is 30px (the larger), not 50px (the sum). This is a deliberate design choice from the era of document layout — paragraphs flowing down a page shouldn't accumulate space between them — but it causes a lot of surprise in modern UI work where you'd reasonably expect margins to add. Horizontal margins do not collapse, only vertical. Padding never collapses. Flex and grid children do not have collapsing margins either.

## Why this matters

Nearly every layout bug — "why is this so much bigger than I told it to be," "why isn't there a gap here," "why does this overflow its container" — traces back to the box model. Once `box-sizing: border-box` is set globally and you've internalized that margin is *outside* the box and padding is *inside*, most sizing math becomes obvious.
