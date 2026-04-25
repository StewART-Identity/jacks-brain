# Jack's Brain — Retention Style Patch

Single-file patch that makes the Retention table match the Acquisition
table's visual style.

## What changed

The Retention table was styled from scratch and ended up looking
different from the Acquisition table — missing the dark header band,
tighter cell padding, no visual title/refresh-button header.

Root cause: the Acquisition component wraps its `<table>` in a
`<div class="table-container">` that inherits Quartz's base table styles
(`quartz/styles/base.scss` defines `th` with a bottom border and `td`
with padding that together produce the banded look). My RetentionList
rendered a bare `<table>` with hand-written CSS, so it got none of
those base styles.

## Fix

Rewrote `quartz/components/RetentionList.tsx` to:

1. Wrap the table in `<div class="table-container">` so it inherits
   base.scss table styling
2. Add the "Retention Log" h3 header with a refresh button, matching
   Acquisition's `.recent-runs-header` pattern
3. Drop the redundant hand-written table CSS (header backgrounds,
   cell padding, row borders, font sizes) — all now inherited
4. Keep the Retention-specific bits:
   - Column widths (Date 7rem, Action 6.5rem, Document 13rem, Title auto)
   - Document column uses `<code>` for a slightly-muted filename
   - `.title-edit` interaction states (hover, editing, saving, saved, error)
   - `.title-missing` muted-italic dash for orphaned rows

## How to apply

Drop through the Bridge:
- **Strip prefix:** `jbpatch-style/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Single file, single commit. Cloudflare auto-rebuilds.

Commit message suggestion:

```
Style Retention table to match Acquisition
```

## After deploy

Refresh `/learn/retention`. You should see:

- Matching dark header band across Date / Action / Document / Title
- "Retention Log" header above the table with a refresh button in the
  top-right corner (mirroring "Document Processing" on Acquisition)
- Cell padding and row spacing consistent between the two pages
- Document column shows the filename in slightly-muted monospace
- Title column still editable; click to rename
