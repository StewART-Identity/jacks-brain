# Jack's Brain — Pre-Nuke Fixes

Two files replacing their counterparts in `jacks-brain/`, to apply before
you nuke and restart the wiki.

## What's changed

### `scripts/ingest.mjs`

Three changes, all in service of fixing the duplicate-source-page bug:

1. **Dedup now normalizes the date prefix.** The existing `findUningestedFiles`
   checked `2026-04-18-CONTRACT.md` against `2026-04-18-2026-04-18-contract`
   and concluded they didn't match. New behavior: strip any leading
   `YYYY-MM-DD-` from both sides before comparing, and lowercase. Re-ingesting
   the same source file on a different day now correctly identifies it as
   an existing page.

2. **Filename construction no longer double-prepends the date.** If the
   original filename already starts with `YYYY-MM-DD-`, today's date is
   not prepended again. `2026-04-18-CONTRACT.md` ingested today becomes
   `2026-04-18-contract.md`, not `2026-04-20-2026-04-18-contract.md`.

3. **Re-reads update in place.** When the target source filename already
   exists on disk, the ingest prompt switches to a "re-read" mode that
   instructs Claude Code to update the existing page (adding an "Updates
   from [date] re-read" section) rather than create a sibling page.
   The memory log distinguishes these as "Re-read" vs "Ingested" rows.

### `CLAUDE.md`

Two changes:

1. **"Prefer updates over new pages" now covers source pages** too, not
   just concept pages. Re-reading a source updates the existing page.

2. **New "Normalization rules" section** with the Jack Stewart title
   convention: the wiki always uses "IAM Engineer" regardless of how
   source documents style the title. This prevents the source's
   "Architect/Engineer" from propagating to entity pages.

## How to apply

Copy the two files over their counterparts in the `jacks-brain/` repo,
commit, push. Using the GitHub Bridge at `idm-toolbox.pages.dev/bridge/`:

1. Target repo: `jackstewart/jacks-brain` (or wherever it lives)
2. Branch: `main`
3. Drop both files preserving the directory structure (`CLAUDE.md` at
   repo root, `scripts/ingest.mjs` in the scripts folder).
4. Commit message: `Fix ingest dedup and add re-read workflow`

No code changes are needed in the wiki content itself — you're going to
nuke that anyway.

## What this does NOT fix

The `content/index.md` file being nearly empty (the CLAUDE.md describes
it as a master catalog but the per-category index files are doing that
job per-category). That discrepancy is still present. When you rebuild
the wiki post-nuke, pick one model — master catalog or per-category
indexes — and update CLAUDE.md to match.
