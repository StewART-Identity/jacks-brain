# Jack's Brain — Consolidated Retention Fix (Re-push)

## The situation

The earlier retention-fix patch only partially applied to the repo:

- ✅ **Content files landed**: `content/learn/retention.md` was stripped
  of its audit table; `data/retention-log.md` was created with the
  IMG_2369 row.
- ❌ **Code files did not land**: the Pages Functions still read the old
  path (`content/learn/retention.md`), still use the broken date-
  stripping slug derivation. `scripts/catalog.mjs` still writes audit
  rows to the old location.

Result: the audit log data exists at the correct new location, but the
code doesn't know to look there. It reads the now-table-less Retention
page, finds no rows, and shows "No documents retained yet."

## What this re-push does

Re-applies the four code-file changes from the retention-fix patch on
top of the current repo state (which includes the recent Collection
rename). Net effect after this lands:

- `functions/api/retention.ts` — reads `data/retention-log.md`; slug
  derivation preserves date prefix so it matches source page filenames
- `functions/api/originals.ts` — same slug fix
- `functions/api/nuke.ts` — `RESET_TEMPLATES` now has entries for both
  the page body (intro only) and the data file (empty audit table);
  stale comment reference to `memory.md` updated
- `scripts/catalog.mjs` — writes audit rows to `data/retention-log.md`

## How to apply

Drop through the Bridge:
- **Strip prefix:** `jbpatch-consolidated/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Four files, one commit.

Commit message suggestion:

```
Actually land the retention-log relocation and slug fix
```

## After deploy

Refresh `/learn/retention`. You should see:

- The IMG_2369 row populated with title "SAML vs. OAuth Diagram"
- Filename in the Document column (read-only, monospace)
- Title clickable for inline rename

## Unrelated cleanup still pending

Still sitting in the repo as orphan files from earlier renames — none
breaking anything but bloating the repo:

- `content/learn/memory.md` — carryover from the Memory → Retention
  rename way back; should have been deleted then
- `quartz/components/Retention.tsx` — orphaned old component
- `quartz/components/scripts/retention.inline.ts`
- `quartz/components/styles/retention.scss`

Delete via GitHub web UI at your convenience.

## Why this happened

The Bridge silently skipped some files on the previous retention-fix
push. We didn't verify each file post-deploy, so the partial application
went unnoticed until you opened the Retention page and saw it empty.
Lesson for the future: after any multi-file Bridge push, explicitly
verify each target file's contents match what was in the zip before
calling the deploy done.
