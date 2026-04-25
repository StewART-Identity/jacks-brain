# Jack's Brain — Search card visual parity (real fix)

The previous Search card had two visible problems:
1. The Search button was stretched across the full row.
2. Layout didn't match the Research card.

## Root cause

I had put `class="search-button"` on the visible Search button so the
search engine could find it. But that class is heavily styled in
`search.scss` for the **sidebar's compact modal trigger** —
specifically `.search .search-button { width: 100%; height: 2rem;
border-radius: 4px; ... }`. Those styles leaked onto my visible
button and overrode (or merged with) my Research-style button rules,
giving it the wrong width, height, and border radius.

## Fix

Architectural separation. The DOM now has TWO buttons:

1. A **hidden** `<button class="search-button">` that exists solely
   so the engine's `setupSearch` lookup succeeds. It's
   visually-hidden via the standard 1px / clip-rect technique. The
   engine binds its handlers to it, but it's never seen or focused.

2. A **visible** `<button class="search-page-btn">` with NO
   engine-relevant classes. The sidebar's `.search-button` CSS
   doesn't match it, so it gets only the styles I write — which are
   exact copies of `.research-btn`.

## What it should look like

Identical to the Research card, with two differences:

- 2-row textarea instead of 4 (search queries are short)
- Controls row: "Number of results" + count input on the left;
  "Search" button on the right. No "Rank with Claude" toggle.

## Files in this patch

```
quartz/components/SearchPage.tsx          (replaced — hidden button + visible button architecture)
quartz/components/styles/searchPage.scss  (replaced — hides engine button, mirrors .research-btn)
```

Two files. No deletes.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-search-card-fix2/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`
