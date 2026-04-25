# Jack's Brain — Sort fix + Search page redesign

Two unrelated fixes in one patch:

## 1. Sort headers now actually work

The previous polish patch added click-to-sort behavior to the Title
and Date headers in the Collection tables, but it didn't fire — clicks
on the Title header in the Concepts page (or any of the four
collection tables) did nothing.

**Root cause:** Quartz only collects `afterDOMLoaded` scripts from
components registered via each emitter's `getQuartzComponents()`. The
folder/tag emitters register `FolderContent` and `TagContent` (which
contain the table) but NOT the inner `PageList` (which contains the
sort script). So `PageList.afterDOMLoaded` was attached, but
orphaned — never reached the build output.

The CSS works fine because `FolderContent.css` includes
`PageList.css` via `concatenateResources`. The same propagation
needed to happen for `afterDOMLoaded` and didn't.

**Fix:** Two one-liners — `FolderContent.afterDOMLoaded =
PageList.afterDOMLoaded` and the same for `TagContent`. Now the sort
script ships and clicks bind correctly.

## 2. New SearchPage: research-style card

Replaces the old "Begin Search" button with a roomy card that mirrors
the Research page aesthetic:

- Rounded corners, semi-transparent dark fill (matches `research-card`)
- Wide input field with placeholder text
- Hint line explaining `#tag` syntax
- Search button on the right with the magnifying glass icon
- Results render below the card as a list of cards (no modal)

**How it works under the hood:** The new SearchPage emits the same
`.search > .search-container > .search-space > input.search-bar` DOM
contract that the existing `Search` sidebar component does. The
search engine in `scripts/search.inline.ts` iterates over EVERY
`.search` element on the page and binds to all of them — so this
embedded copy is wired automatically with no engine changes.

The visual difference between the embedded card and the sidebar
modal is purely CSS: `searchPage.scss` overrides `.search-container`
positioning when nested under `#search-page`, flattening the
fixed-position fullscreen modal into an inline-flowing block inside
the card.

A small inline script ensures the engine treats the embedded
container as "active" as soon as you focus or type in the input, so
results render immediately without requiring a click on the search
button.

## Files in this patch

```
quartz/components/pages/FolderContent.tsx   (replaced — afterDOMLoaded propagation)
quartz/components/pages/TagContent.tsx      (replaced — afterDOMLoaded propagation)
quartz/components/SearchPage.tsx            (replaced — research-style card)
quartz/components/styles/searchPage.scss    (added — new stylesheet)
```

Four files. No deletes required.

## Things NOT changed (intentionally)

- **The sidebar Search modal** — still works exactly the same. Cmd/Ctrl+K
  still opens it. Tag prefix `#` still works. The embedded SearchPage
  is purely additive.

- **The Acquisition column order** — left as Document → Acquired →
  Status, matching the SourcesList convention. The Retention table
  already starts with Date and was unchanged.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-search-and-sort/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`

After Cloudflare rebuilds, hard-refresh (`Ctrl+Shift+R`).

To verify the sort fix: open `collection/concepts`, click the Title
header — the OAuth and SAML rows should swap. The chevron should flip
from `▲` to `▼` (or appear if it was missing before).

To verify the new SearchPage: open `learn/search`. You should see a
research-style card with a "Search the wiki" label, a wide input,
and a hint about `#tag` syntax. Type into it — results should appear
below the card as soon as you start typing.
