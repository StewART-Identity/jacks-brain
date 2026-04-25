# Jack's Brain — Two Final Polish Fixes

## Fixes

**Collection table — remove horizontal scrollbar.** My fixed column
widths (Title 12rem + Tags 14rem + Date 7rem) plus padding added up to
more than the content area provided, forcing horizontal scroll. Replaced
with flexible widths: Title is `nowrap` (sized to its longest cell),
Tags is `nowrap`, Date is `nowrap`, and Summary takes `width: 100%`
(the rest of the row). Also overrode `.table-container { overflow-x: auto }`
to `visible` so even if there's a small overrun, no scrollbar appears.

**Search modal — center it.** Switched the modal from
`display: inline-block` + top margin to `display: flex` with
`align-items: center; justify-content: center`. The search input now
sits in the visual center of the content area (still leaving the
sidebar visible on desktop, full-width on mobile).

## Files

Two:
- `quartz/components/PageList.tsx` (column widths)
- `quartz/components/styles/search.scss` (flex centering)

## Apply

Bridge:
- **Strip prefix:** `jbpatch-finetune/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Commit message:

```
Make Collection tables fit content area; center search modal
```
