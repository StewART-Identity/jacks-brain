# Jack's Brain — Two Fixes

Fixes the slug-detection bug in PageList that meant the Collection
table layout never rendered, and constrains the Search modal so it
doesn't cover the sidebar.

## What's wrong (and why the previous patch didn't fix it)

**Bug 1: Collection sub-pages still rendering as the old flex layout.**

PageList.tsx was supposed to detect when it was rendering a Collection
sub-page index and emit a `<table>`. The detection compared `fileData.slug`
against keys like `"collection/sources"`. But Quartz passes the full
slug for an index page as `"collection/sources/index"` (with the trailing
`/index` segment). The lookup never matched, so PageList fell through to
the original layout. Result: the empty markdown table did go away (that
fix landed), but the new table never appeared — every page still rendered
the date / title / floating-tags layout.

I should have caught this before shipping. The Quartz path utilities
explicitly call out two slug types — `FullSlug` (which keeps `/index`)
and `SimpleSlug` (which strips it) — and I built the lookup table
assuming SimpleSlug behavior on a FullSlug input.

**Bug 2: Search modal covers the entire viewport including the sidebar.**

The Search modal is positioned `fixed` with `left: 0; width: 100vw`,
making it a true full-viewport overlay. On desktop where the sidebar
is permanently visible, this looks like the modal "extends over the
menu" — which is exactly what you described.

## Fixes

### `quartz/components/PageList.tsx`

One-line addition: strip `/index` from `fileData.slug` before looking
up the table config. With this, the Collection sub-page indexes will
finally match and render as tables.

### `quartz/components/styles/search.scss`

Two-line addition: on desktop (≥1200px), shift the modal `left` to
`320px` (Quartz's standard `$sidePanelWidth`) and reduce its `width`
to `calc(100vw - 320px)`. The modal now opens within the content area,
leaving the sidebar visible and accessible. Mobile behavior is
unchanged (still full-width, since sidebar is collapsed there anyway).

## How to apply

Bridge:
- **Strip prefix:** `jbpatch-fixes/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Two files. Single commit.

Suggested commit message:

```
Fix PageList slug match and constrain search modal width
```

## After deploy

1. **`/collection/sources`** — should now show a real `<table>` with
   columns: Title / Summary / Tags / Date. Fred's row populated with
   summary "Side-by-side instructional diagram comparing the request
   flow of SAML and OAuth, captured as a photo."
2. **`/collection/concepts`** — three-column table (no Date), OAuth
   and SAML rows with their respective summaries.
3. **`/collection/entities`** — three-column table, Active Directory.
4. **`/collection/synthesis`** — four-column table with the SAML vs.
   OAuth Comparison row.
5. **`/learn/search` → click Begin Search** — modal opens shifted
   right, leaving the sidebar visible.
