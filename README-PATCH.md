# Jack's Brain — Search card width + textarea fix

Two related fixes to the SearchPage:

1. **Width matches Research card.** The `.search` element wrapping
   our card had `max-width: 14rem` from the sidebar's `search.scss`,
   which was constraining our embedded copy to a narrow column. Now
   overridden inside `#search-page` to fill the full 720px article
   column width — same as the Research card.

2. **Single-line input replaced with 2-row textarea.** Matches the
   Research card's textarea aesthetic. Two rows instead of four
   because search queries are typically short — four rows would be
   visually misleading. A small `keydown` handler suppresses the
   Enter-key newline so Enter still navigates to the highlighted
   result instead of inserting a literal newline into the textarea.

## Files in this patch

```
quartz/components/SearchPage.tsx          (replaced — textarea, rows=2, Enter handler)
quartz/components/styles/searchPage.scss  (replaced — width override, textarea sizing)
```

Two files. No deletes.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-search-textarea/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`
