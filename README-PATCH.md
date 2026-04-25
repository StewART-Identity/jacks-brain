# Jack's Brain — Search card mirrors Research card

The Search card now structurally mirrors the Research card:

- 720px wide, semi-transparent dark fill, rounded corners
- "Search the wiki" label (parallels "Ask Claude to find sources")
- 2-row textarea (Research uses 4 — search queries are short)
- Controls row: **Number of results** input on the left (default 5,
  max 8), **Search** button on the right
- No "Rank with Claude" toggle (Research-only)

## How "Number of results" works

The wiki search engine in `scripts/search.inline.ts` caps results at
8 internally (`numSearchResults = 8` at module scope). The count
input here can ask for fewer — typing 5 hides the 6th-8th cards
client-side via a MutationObserver that watches the results
container and reapplies the cap on every render. The input is
`min=1 max=8` to be honest about the engine's hard cap.

If you ever want to ask for more than 8, that's a follow-up: edit
`numSearchResults` in `search.inline.ts` (or read it from a global
the SearchPage writes to). Out of scope for this patch.

## Files in this patch

```
quartz/components/SearchPage.tsx            (replaced)
quartz/components/styles/searchPage.scss    (replaced)
```

Two files. No deletes.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-search-card-final/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`
