# Jack's Brain — Dark-only + table style cleanup

This patch does three things:

1. **Fixes the table styling bug** — the existing `_jbtable.scss` overrides
   silently lose to `base.scss` because they're imported earlier in the
   compiled CSS and have equal specificity. The new file uses
   `.table-container.jb-table` (specificity 0,2,0) instead of
   `.jb-table` (0,1,0) so the overrides actually win. This is what was
   causing the horizontal scrollbar, the indent off the left edge, and
   the stubborn `min-width: 75px` cells.

2. **Restyles all six tables to "Option B"** — yellow header text on
   dark-green band, horizontal rules only (no vertical cell borders),
   alternating opaque green rows, flush-left to the page title.

3. **Kills light mode** — collapses the theme palette so `lightMode`
   and `darkMode` are identical, removes the Light/Dark Mode sidebar
   link, removes the `DarkModePage` component registration, and removes
   the ConditionalRender wiring for `application/darkmode`.

## What the Bridge will push

These four files are added/replaced via the Bridge:

```
quartz.config.ts                     (replaced — palette collapsed to dark only)
quartz.layout.ts                     (replaced — DarkModePage ConditionalRender removed)
quartz/styles/_jbtable.scss          (replaced — Option B styling, fixed specificity)
quartz/components/index.ts           (replaced — DarkModePage import + export removed)
quartz/components/ApplicationMenu.tsx (replaced — Light/Dark Mode <li> removed)
```

## What you need to delete manually via GitHub web UI

The Bridge can't delete files. After the patch lands, delete these via
the GitHub UI:

- `quartz/styles/jbtable.scss` — the orphan from the original Sass
  partial-name fix. Was already supposed to be cleaned up.
- `quartz/components/DarkModePage.tsx` — no longer imported anywhere
  after this patch lands. Leaving it would just be dead code.
- `content/application/darkmode.md` — the content page that hosted the
  toggle button. With the ConditionalRender removed, this page would
  still build as an empty stub, which is worse than just deleting it.

After the patch lands and these three files are deleted, do a clean
build to confirm everything compiles.

## What is intentionally NOT changed

- `quartz/components/scripts/darkmode.inline.ts` — still imported by
  `ApplicationMenu.beforeDOMLoaded`. This script may set
  `saved-theme="light"` on first visit if the user's OS is in light
  mode. With both palettes identical in `quartz.config.ts`, this has
  no visible effect. Removing the script would require touching
  ApplicationMenu's `beforeDOMLoaded` and the Darkmode component, which
  is more risk than reward for a behavior we've already neutralized.

- `quartz/util/theme.ts` — still emits two CSS color blocks (one for
  `:root`, one for `:root[saved-theme="dark"]`). They'll be identical
  in the compiled output because the config palette is identical. No
  change needed.

- `quartz/components/Darkmode.tsx` — the small toggle component itself
  is no longer placed by the layout, so it doesn't render anywhere.
  Leaving the file in place is harmless.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-dark-only-tables/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Commit message:** `ms2555 04/25/2026`

After Cloudflare's build succeeds, manually delete the three files
listed above via the GitHub web UI and let it rebuild once more.
