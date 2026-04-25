# Jack's Brain — Retention Fix Patch

Six files that fix the two bugs you found on the live Retention page:

1. **Two tables rendering** (a markdown table from the page body AND the
   RetentionList component table)
2. **Inline title edit broken** (Title column showed `—` and clicking did
   nothing)

## What's in this patch

### Bug fixes

- **Slug derivation rewritten in `functions/api/retention.ts` and
  `functions/api/originals.ts`.** The previous derivation was stripping
  the `YYYY-MM-DD-` date prefix from filenames. But source pages
  preserve their date prefix in the filename (`2026-04-23-img-2369.md`),
  so the derived slug from `2026-04-23-IMG_2369.png` was `img-2369`,
  which never matched the source page's slug `2026-04-23-img-2369`.
  Result: the API said `sourcePresent: false` for every row, the UI
  showed `—`, edits were disabled. Fixed: keep the date prefix.

- **Audit log moved out of `content/learn/retention.md` to
  `data/retention-log.md`.** Quartz was rendering both the page's
  markdown body (which had the audit table) AND the RetentionList
  component (which rendered its own table from the same data). Result:
  duplicate tables. Fix: move the audit data outside `content/` so
  Quartz doesn't render it as a page. The Retention page body is now
  just intro prose; the RetentionList component is the only renderer.

### Touched files

- `functions/api/retention.ts` — slug fix + reads from `data/retention-log.md`
- `functions/api/originals.ts` — slug fix
- `functions/api/nuke.ts` — `RESET_TEMPLATES` resets the audit table at
  the new path; the page body resets to intro-only (no table)
- `scripts/catalog.mjs` — writes catalog rows to the new audit log path
- `content/learn/retention.md` — table removed, intro prose only
- `data/retention-log.md` — NEW. Pre-populated with the existing
  IMG_2369 row so no manual migration is needed.

## How to apply

Drop the patch contents through the Bridge:
- **Strip prefix:** `jbpatch-fix/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`
- **Upload target:** repo root

Suggested commit message:

```
Fix Retention page: slug derivation + move audit log out of content/
```

Cloudflare will auto-rebuild. The Retention page should then show:
- One table (not two)
- IMG_2369 row populated with title "SAML vs. OAuth Diagram"
- Inline edit working — click title, edit, blur or Enter saves

## Important: directory creation

The Bridge needs to create a new top-level `data/` directory for
`data/retention-log.md`. If the Bridge supports directory creation
implicitly (creates the parent path when a file in it is uploaded),
it'll work. If not, create the directory by uploading the file with
the path `data/retention-log.md` exactly — most GitHub-API-based
tools handle this correctly because GitHub creates parent
directories on file PUT.

## Cleanup steps NOT in this zip

Same as last time, still pending:
- Delete `quartz/components/Retention.tsx` (orphaned old component)
- Delete `quartz/components/scripts/retention.inline.ts`
- Delete `quartz/components/styles/retention.scss`

Not blocking; just clutter.

## Why this slipped past me the first time

Two design assumptions baked into the previous patch turned out wrong:

1. **Slug stripping** — I assumed source pages dropped the date prefix
   from their filenames during cataloging. They don't. (catalog.mjs
   actually keeps it, and I should have read the file more carefully
   before designing the matching logic.)

2. **Single-source-of-truth for audit data** — I put the audit log in
   the page that displayed it, expecting Quartz to "know" the component
   was the renderer. Quartz just renders both the body and the
   `afterBody` mounts; neither knows about the other.

Both bugs are fully internal to my code. The repo's underlying state
(source pages, originals, catalog logic) was always correct; my
adapter functions were just looking in the wrong places.
