# UI and code conventions

This document is the canonical reference for the wiki's UI patterns:
buttons, tables, disclosure widgets, and touch-vs-mouse behavior. Read
it before modifying any component file (`quartz/components/*.tsx`,
`quartz/components/styles/*.scss`) or any of the global stylesheets
(`quartz/styles/custom.scss`, `quartz/styles/_jbtable.scss`).

These conventions were worked out over several rounds of UI cleanup.
Drift is the enemy — every component should use the canonical patterns
even when a one-off ad-hoc variant would be slightly easier. The cost
of inconsistency compounds; the cost of consistency is paid up front.

## Buttons — the `.jb-btn` family

The wiki has exactly one button look. It lives in `quartz/styles/custom.scss`
as a utility class family.

### What it looks like

A rounded pill with a dark-green background, warm sand (brass-100)
text, and a subtle border. The visual is intentionally similar to the
`a.internal` link pills used for in-prose actions like "Download
original" on source pages — that link style is the de facto canonical
"press this" affordance, and the button family extends it to real
`<button>` elements with proper button semantics.

### Variants

| Class | Purpose |
|-------|---------|
| `jb-btn` | Default button. Neutral emphasis. Use for actions that reveal information or perform a non-committal step (e.g. "Show answer"). |
| `jb-btn jb-btn-primary` | Highest-emphasis button. Brass border for visual weight. Use when there's a single decisive action on the page (e.g. "Start", "Take another", "Got it"). |
| `jb-btn jb-btn-secondary` | Lower-emphasis button. Transparent background, lighter border. Use for side actions that shouldn't compete for attention (e.g. "Generate quiz questions" on a source page, "Missed it" in a quiz). |
| `jb-btn jb-btn-sm` | Smaller version. Combine with any of the above. Use in toolbars, inline contexts, or tight layouts. |

### How to use them

Apply the classes to `<button>` or `<a>` elements directly:

```jsx
<button type="button" class="jb-btn jb-btn-primary">Start</button>
<button type="button" class="jb-btn jb-btn-secondary">Cancel</button>
<a href="..." class="jb-btn jb-btn-sm">View details</a>
```

Component-scoped classes (e.g. `quiz-suggest-btn`, `search-page-btn`)
can coexist on the same element for layout positioning, but the
visual styling MUST come from `.jb-btn`. Don't set `background:`,
`border:`, `border-radius:`, or `padding:` on component-scoped button
classes — those properties belong to `.jb-btn`.

### What NOT to do

- Don't create a new bespoke button style for "just this one place."
  If a context genuinely needs a button style outside the family,
  expand the `.jb-btn` family instead — add a new modifier in
  `custom.scss` and document it here.
- Don't reach for inline styles. Buttons are recognizable by their
  class signature; inline styles defeat that.
- Don't use raw `a.internal` styling for action buttons. The link-pill
  look is fine for markdown-authored prose links, but new components
  should use real `<button>` elements with `.jb-btn`.

## Tables — the `.jb-table` system

All six data tables in the wiki (Acquisition, Retention, and the four
Reflect collections: Sources, Entities, Concepts, Synthesis) share a
single look defined by `quartz/styles/_jbtable.scss`.

### Activating it

Wrap the table in a `<div>` with both `table-container` and `jb-table`
classes:

```jsx
<div class="table-container jb-table">
  <table>
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

The compound class `.table-container.jb-table` is what beats Quartz's
base table styling in CSS specificity. See `_jbtable.scss` for the
detailed cascade explanation.

### What `.jb-table` gives you

- Yellow header text on a dark-green band, centered labels
- Horizontal cell rules only (no vertical borders)
- `table-layout: fixed` (column widths are percentages or rem-based,
  not content-determined)
- No horizontal scrollbar regardless of viewport width
- `min-width: 0` on cells (cancels Quartz base's 75px minimum which
  would force overflow on narrow viewports)
- Flush-left alignment with surrounding prose
- Sortable header styling (cursor, hover, sort-indicator opacity)

### Shared classes for special columns

Both `_jbtable.scss` and component CSS use a few reusable column
classes. Anchor styling on these instead of positional `nth-child`
selectors so column reordering doesn't silently break layout:

| Class | Effect | Where used |
|-------|--------|------------|
| `col-date` | Centers cell content | Any column showing a date or timestamp |
| `col-status` | Centers cell content | Any column showing a lifecycle state or action label |
| `col-disclose` | (PageList only) Narrow leading column for the tag-disclosure button | PageList's Reflect tables |
| `col-title` | (PageList only) Title/Name column | PageList's Reflect tables |
| `col-summary` | (PageList only) Summary column | PageList's Reflect tables |
| `col-subjects` | (PageList only) Subjects column | PageList's Reflect tables |
| `queue-checkbox-cell`, `queue-acquired-cell`, `queue-document-cell` | Acquisition-specific column classes | acquisition.inline.ts + acquisition.scss |

When adding a new table, prefer adding new reusable classes (in the
component's own scope) over positional selectors. The pattern: name
the class after the column's *semantic role*, not its position.

### Striping

`_jbtable.scss` deliberately does NOT define a default odd/even
striping rule because some tables render two rows per logical item
(PageList's primary-row + disclosure tag-row pairs, where naive
odd/even would alternate within a single item rather than between
items). Striping is the responsibility of each component's own CSS:

- **Per-row striping** (one `<tr>` per item, simple case): see
  `RetentionList.tsx` — uses straightforward `nth-child(odd)` /
  `nth-child(even)`.
- **Pair-aware striping** (two `<tr>` per item, PageList case): see
  `PageList.tsx` — uses `nth-child(4n+1)` and `nth-child(4n+2)` for
  group A (primary + disclosure together), `nth-child(4n+3)` and
  `nth-child(4n+4)` for group B. Open-disclosure rows inherit the
  same background fill as their primary row above, so an item reads
  as one continuous shaded block whether disclosed or collapsed.

## Tag-disclosure pattern

The four Reflect collection tables (Sources, Entities, Concepts,
Synthesis) render their per-row tags via a click-to-expand disclosure
button rather than a permanently-visible tag column. This avoids the
"tag tower" problem (20+ tags wrapping inside a narrow column to a
vertical stack).

### Structure

Each list item is two `<tr>` elements:

1. **Primary row** — title, date, summary, subjects, plus a leading
   `col-disclose` cell containing a chevron-plus-count-plus-noun
   button ("▸ 12 tags").
2. **Tag row** — initially `hidden`, full-width via `colspan`, contains
   the wrapping pill list of tags.

The pair is identified by DOM adjacency — the tag-row is always the
primary-row's `nextElementSibling`. Sorting preserves this by moving
both rows together.

### Persistence

Open/closed state per slug is persisted to localStorage under the key
`jb-tag-open` as a JSON object `{ slug: true }`. Only open entries are
stored (no `false` values) — the absence of a slug means closed.
Persistence survives sort, SPA nav, and full reload.

### Glyphs

- Closed: `▸` (right-pointing triangle)
- Open: same glyph, CSS-rotated 90° via `transform: rotate(90deg)` to
  become a downward-pointing chevron. The rotation is animated
  (0.15s ease).
- Inactive sort indicator: `▾` (muted, same glyph family as the active
  ▲/▼). Opacity is dropped via CSS — only the character changes when
  active.

### Don't change

- The button must include the noun "tag" or "tags" — the count alone
  is not self-explanatory. Don't shorten back to "▸ 12".
- The button text uses the same warm sand yellow (`#F0DDB3`) as the
  column headers, anchoring it visually to the "Tags" column header
  above.
- The chevron lives on the LEFT of the count. (Conventional disclosure
  pattern; right-side chevrons read as "more" links instead.)

## Tag-page card layout

Tag pages (e.g. `/tags/lead-exposure`) render their item listings via
`PageList`'s default branch, which produces this DOM:

```html
<ul class="section-ul">
  <li class="section-li">
    <div class="section">
      <p class="meta">{date}</p>
      <div class="desc"><h3>{title}</h3></div>
      <ul class="tags">...</ul>
    </div>
  </li>
</ul>
```

The styling (in `quartz/components/styles/listPage.scss`) lays this
out as a card:

- **Top row**: date and title side-by-side via a flex row. Date is
  fixed-width; title takes the rest.
- **Bottom row**: tags wrapping horizontally across the card's full
  width, separated from the top row by a soft top border.
- **Mobile**: tags are hidden (existing behavior); the top row stacks
  vertically when there isn't horizontal room.

The old 3-column grid (`grid-template-columns: fit-content(8em) 3fr 1fr`)
was what caused the vertical tag tower problem. Don't restore it.

## Popovers and touch devices

Link-preview popovers (`quartz/components/styles/popover.scss`) are
disabled on touch devices, not just mobile-width viewports:

```scss
@media all and ($mobile) {
  display: none !important;
}
@media (hover: none) and (pointer: coarse) {
  display: none !important;
}
```

The second rule catches iPad-in-landscape and other tablets above the
800px mobile breakpoint that still have touch-only input. Without it,
tapping an internal link would show the popover and leave it stuck
visible (because `:hover` is sticky on touch devices until the next
tap elsewhere).

Don't add JS-based popover dismissal logic to work around this. The
CSS gate is simpler and more reliable.

## Date format

Dates rendered to users always include the day, never just month+year.
Examples:

- ✅ "March 6, 2026"
- ✅ "May 25, 2026"
- ❌ "March 2026"

This applies to:
- Document cover pages (report covers, brief headers)
- Wiki content with explicit dates in prose
- Component-rendered date cells (when the underlying ISO date includes
  a day, which it always does for wiki sources)

## Anchoring on classes, not positions

When defining column widths or column-specific styling, prefer class
selectors over `nth-child` positional selectors. The reason: column
order changes are common (we've reordered Acquisition twice during
the UI cleanup work), and positional selectors break silently when
columns move.

Pattern:

```scss
/* ❌ Breaks if Source moves to a different column */
#acquisition-app tbody td:nth-child(4) {
  overflow-wrap: anywhere;
}

/* ✅ Stays attached to the Source column wherever it ends up */
#acquisition-app tbody td.queue-document-cell {
  overflow-wrap: anywhere;
}
```

Naming convention for these column classes: `<scope>-<column-semantic>`
(e.g. `queue-document-cell`, `col-status`, `col-disclose`). Lowercase
hyphens, semantic role first, never positional words like "first" or
"left".

## Where things live

| Concern | File |
|---------|------|
| Site-wide button family | `quartz/styles/custom.scss` (`.jb-btn` and modifiers) |
| Site-wide table look | `quartz/styles/_jbtable.scss` (`.jb-table` and `.col-*` shared classes) |
| Theme variables and palette | `quartz/styles/custom.scss` (light/dark `:root` definitions) |
| Per-component styles | `quartz/components/styles/<component>.scss` or inline in the `.tsx` file via `<Component>.css` |
| Per-component scripts | `quartz/components/scripts/<component>.inline.ts` or inline in the `.tsx` file via `<Component>.afterDOMLoaded` |
| Tag-disclosure logic | Inline in `quartz/components/PageList.tsx` |
| Sorting helpers | Inline in PageList (sort-with-pairs) and acquisition.inline.ts (column sort) |

## When in doubt

- Read this file first.
- Read the relevant `_jbtable.scss` / `custom.scss` docstrings — they
  explain the cascade reasoning in detail.
- Look at how an existing component solves the same problem before
  inventing a new pattern. If your "new pattern" is just the existing
  one with a different class name, drop it and use the existing one.
- If a genuine new pattern is needed, add it to this file in the same
  commit that introduces it.
