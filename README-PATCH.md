# Jack's Brain — SourcesList unification

Brings the dynamic SourcesList table on `collection/sources` under the
same visual contract as the four PageList tables.

## Changes

- The host `<div id="sources-list">` now has `class="table-container
  jb-table"`, so the unified `.jb-table` styling from `_jbtable.scss`
  applies automatically. The script writes a bare `<table>` into that
  container (no inner wrapper).

- Column order: **File → Acquired → Status**, matching the PageList
  convention of "primary identifier first, fixed-width metadata
  second".

- Sortable headers use the same `.sortable` / `.sort-active` /
  `.sort-indicator` classes as PageList, with `⇅`/`▲`/`▼` chevrons.

- **Default sort: pending first**, by clicking-through Status with
  ascending direction (false=pending sorts before true=cataloged).
  This was a pre-existing intent that the previous code couldn't
  actually deliver — the default `sortField` was set to "uploaded"
  which wasn't a valid field, so it fell through to status order
  inadvertently. Now it's explicit.

- Per-column "first click" direction defaults: File → A→Z, Acquired
  → newest first, Status → pending first. Subsequent clicks toggle.

## Visual changes

- The old gray-on-white `sources-table` styles are gone. Cells now
  use the same alternating dark-green stripes (`#1B3F29` / `#1F4429`)
  as the PageList tables.

- Filename links in the File column are now warm sand (`#F0DDB3`,
  matching the header text) instead of secondary green, which would
  have read as muted green-on-green on the new dark backgrounds.

- Status badges retuned for dark-row backgrounds:
  - **Cataloged**: sage green pill (`#3A7D53` background, `#EBF5EE`
    text). Reads as "approved" without screaming.
  - **Pending**: warm amber pill (`#6B4D1A` background, `#F0DDB3`
    text). Ties to the existing dark-mode `textHighlight` palette.

## Files in this patch

```
quartz/components/SourcesList.tsx   (replaced)
```

One file. No deletes. No styling file changes — everything inherits
from the existing `_jbtable.scss`.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-sourceslist/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`

## Notes

- The XSS-safe filename rendering (`safeName` with `<` and `>`
  escaped) is new. The previous code interpolated `f.name` directly
  into innerHTML, which would have rendered HTML if the API ever
  returned a filename containing markup. Cheap to add, free
  hardening.

- Loading and empty states still use the global `.muted` class
  (gray italic). Unchanged.
