# Jack's Brain — Unified Table Style

Single source of truth for all six tables (Acquisition, Retention, and
the four Collection sub-pages). Every table in the wiki now uses the
same visual look:

- **Header row**: solid dark green band (var(--secondary)), white-ish
  bold text, no vertical borders between header cells, 2px bottom
  border separating header from body.
- **Body rows**: full 1px borders on every cell, joined cleanly at
  corners via `border-collapse: collapse`.
- **Body rows**: alternating opaque backgrounds — odd rows
  `var(--light)`, even rows `var(--lightgray)`. Neuron wallpaper no
  longer bleeds through.
- **Flush left**: zero margin/padding on the table-container wrapper
  so the table edge aligns with the page title above it.

## Architecture

A new `quartz/styles/jbtable.scss` partial holds the shared rules.
`base.scss` imports it via `@use`, so the styles are always loaded
site-wide. Any element with `class="jb-table"` (typically alongside
`class="table-container"`) picks them up automatically.

Per-component CSS files (`acquisition.scss`, `RetentionList.tsx`'s
inline styles, `PageList.tsx`'s inline styles) have been stripped of
their visual overrides — they now only define column widths and any
component-specific extras (badges, inline-edit states, tag pills).

If you ever want to change the table look — say, swap to a different
header color or remove cell borders — change `jbtable.scss` and every
table updates at once.

## Files

Six files:
- `quartz/styles/jbtable.scss` — NEW shared partial
- `quartz/styles/base.scss` — adds `@use "./jbtable.scss"`
- `quartz/components/PageList.tsx` — Collection tables now use `.jb-table`
- `quartz/components/RetentionList.tsx` — Retention table now uses `.jb-table`
- `quartz/components/scripts/acquisition.inline.ts` — Acquisition table now uses `.jb-table`
- `quartz/components/styles/acquisition.scss` — stripped of visual overrides

## Apply

Bridge:
- **Strip prefix:** `jbpatch-unified/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Single commit.

## After deploy

All six tables should look identical: same dark green header band, same
flush-left positioning, same alternating row colors, same cell borders.
The only differences between them are the columns themselves (Acquisition
has 3 columns; Retention has 4; Collection sub-pages have 3 or 4
depending on whether Date applies).
