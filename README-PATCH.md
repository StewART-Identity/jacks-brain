# Jack's Brain — Final Polish (third try)

Three fixes:

1. **Search modal centered on entire viewport, not content area.** Removed
   the desktop sidebar offset that constrained the modal to the right
   side. Modal now spans the full screen with the input in the absolute
   visual center. (Yes, the sidebar is covered by the backdrop while
   active — that's the price of true centering.)

2. **Horizontal scrollbar on Collection tables — gone.** Switched from
   fixed-rem column widths to percentage-based widths with
   `table-layout: fixed`. The table now mathematically can't exceed
   its container width regardless of content. Also raised the
   specificity of the `overflow: visible` override.

3. **Tags column widened.** Tags now get 35% of the table width
   (40% on Concepts/Entities where there's no Date column). Pills
   wrap on multiple rows naturally rather than getting crammed into a
   narrow strip.

## Column proportions

Sources & Synthesis (with Date):
- Title 18%, Summary 32%, Tags 35%, Date 15%

Concepts & Entities (no Date):
- Title 22%, Summary 38%, Tags 40%

## Files

Two:
- `quartz/components/PageList.tsx` (column layout)
- `quartz/components/styles/search.scss` (centering)

## Apply

Bridge:
- **Strip prefix:** `jbpatch-final/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

```
Final polish: full-viewport search center, no table scrollbar, wider tags
```
