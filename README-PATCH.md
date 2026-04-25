# Jack's Brain — Table polish + SourcesList unification (combined)

This combines two previously-separate patches into a single deploy:
the PageList polish (column reorder, sortable headers, darker even
rows) and the SourcesList unification (dynamic table on
`collection/sources` brought under the same `jb-table` look).

## Changes

### PageList tables (Sources / Synthesis / Concepts / Entities)

- **Even-row color** darkened from `#244D34` to `#1F4429` so the
  stripe contrast is gentler and the wallpaper doesn't perceptually
  peek through.

- **Column reorder**: Title → Date → Summary → Tags. Date moves up
  from rightmost to second column, sitting next to the fixed-width
  Title. Summary and Tags become the two variable-width columns
  that absorb narrow viewports.

- **Sortable Title and Date columns**:
  - Click Title → toggle A→Z / Z→A
  - Click Date → toggle newest/oldest first
  - Default sort on page load: newest first (date descending). On
    Concepts and Entities (which have no Date column), default is
    title ascending.
  - Chevron indicator: `⇅` on inactive sortable columns, `▲` or
    `▼` on the active one.

- Sort happens entirely client-side after the SSR render. Quartz's
  SSR sorter still produces the initial "newest first" order so
  there's no flash of unsorted content.

### SourcesList dynamic table (collection/sources)

The dynamic table that lists raw uploaded files via `/api/originals`
now uses the same `.jb-table` styling as the PageList tables.

- Host `<div id="sources-list">` now has `class="table-container
  jb-table"`, so the unified styling applies automatically.

- Column order: **File → Acquired → Status**, matching the
  PageList convention of "primary identifier first, fixed-width
  metadata second".

- Sortable headers use the same `.sortable` / `.sort-active` /
  `.sort-indicator` classes as PageList, with `⇅`/`▲`/`▼` chevrons.

- **Default sort: pending first**, by Status with ascending
  direction (false=pending sorts before true=cataloged).

- Per-column "first click" direction defaults: File → A→Z,
  Acquired → newest first, Status → pending first. Subsequent
  clicks toggle.

- **Status badges retuned for dark-row backgrounds**:
  - **Cataloged**: sage green pill (`#3A7D53` background,
    `#EBF5EE` text). Reads as "approved" without screaming.
  - **Pending**: warm amber pill (`#6B4D1A` background, `#F0DDB3`
    text). Ties to the existing dark-mode `textHighlight`
    palette.

- Filename links in the File column are now warm sand (`#F0DDB3`,
  matching the header text) instead of secondary green, which
  would have read as muted green-on-green on the new dark
  backgrounds.

- Bonus fix: the old default `sortField = "uploaded"` wasn't a
  valid field, so the sort fell through to comparing the
  `cataloged` boolean and accidentally produced pending-first by
  coincidence. Now it's explicit and intentional.

- Bonus hardening: filenames are now HTML-escaped before being
  inserted into the table. The previous code interpolated
  `f.name` directly into innerHTML.

## Files in this patch

```
quartz/styles/_jbtable.scss            (replaced — even-row color, sortable header styles)
quartz/components/PageList.tsx         (replaced — column reorder, sort markup, inline sort script)
quartz/components/SourcesList.tsx      (replaced — jb-table look, retuned badges, pending-first default)
```

Three files. No deletes required.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-tables-combined/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`

After Cloudflare rebuilds, hard-refresh to clear the cached CSS
(`Ctrl+Shift+R`).
