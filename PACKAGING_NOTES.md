# Jack's Brain — rename to "catalog" vocabulary

## What this zip contains

A partial rename from "ingest" to "catalog" vocabulary across the
codebase, plus the structural re-view fix from earlier in the session.

**Files in this zip have been fully converted.** Files NOT in this zip
still use the old vocabulary.

## Apply carefully — this is not a blind copy

Drop each file from this zip into its corresponding location in the
jacks-brain repo. Some files in the zip are NEW (no existing file to
replace); some REPLACE existing files; two existing files must be
DELETED after this zip is applied.

### Replace these existing files:
- `CLAUDE.md`
- `README.md`
- `package.json` (only the `catalog` npm script line changed)
- `scripts/youtube-transcript.mjs` (one line changed)
- `content/application/help.md`
- `content/application/nuke.md`
- `content/learn/retention.md`
- `content/learn/research.md`
- `functions/api/originals.ts`
- `functions/api/status.ts`
- `quartz/components/SourcesList.tsx`
- `quartz/components/styles/retention.scss`
- `quartz/components/scripts/retention.inline.ts`

### Add as new files:
- `scripts/catalog.mjs`
- `.github/workflows/catalog.yml`

### DELETE locally after the zip is applied:
```
git rm scripts/ingest.mjs
git rm .github/workflows/ingest.yml
```

## CRITICAL: one-line hand-edit required before deploy

`.github/workflows/youtube-ingest.yml` is NOT in this zip, but it still
references `scripts/ingest.mjs` — which will be deleted. The YouTube
catalog workflow will break at runtime if you don't patch this one line:

File: `.github/workflows/youtube-ingest.yml`, line 56
Change: `run: node scripts/ingest.mjs "${{ steps.transcript.outputs.file }}"`
   To:  `run: node scripts/catalog.mjs "${{ steps.transcript.outputs.file }}"`

Everything else in that file can stay as-is for now and be renamed in a
follow-up. The critical bit is that the workflow's actual command points
at the new script.

## NOT renamed in this pass

These still say "ingest" but won't break anything:

- `.github/workflows/youtube-ingest.yml` — filename + most contents (see
  patch above for the critical line)
- `functions/api/youtube.ts` — comments + workflow dispatch reference
- `functions/api/nuke.ts` — UI strings in the "emptyIndex" / "emptySources"
  templates it writes when nuking
- `functions/api/url.ts` — comments + HTTP User-Agent string + one status
  message
- `functions/api/upload.ts` — comments + one status message
- `quartz/components/UploadZone.tsx` — uses `.ingest-card` CSS class
- `quartz/components/ResearchPage.tsx` — has `ingest-selected-btn` ID
- `quartz/components/styles/researchPage.scss` — `.ingest-selected-btn`
- `quartz/components/styles/uploadZone.scss` — `.ingest-card`
- `quartz/components/scripts/uploadZone.inline.ts` — variable names
- `quartz/components/scripts/researchPage.inline.ts` — variable names +
  user-facing strings about "ingestion status"

These are cosmetic and can be finished in a follow-up session. The app
will work correctly.

## What's really changed in this rename

### The structural re-view fix (unchanged from earlier in the session)

`scripts/catalog.mjs` fixes the bug where re-cataloging a source produced
a second file with a double-date prefix. Two root causes, both addressed:

1. The slug normalization in `findExistingSourcePage` now handles
   underscores and multi-hyphen runs, so `Case_Study--1-.docx` and
   `case-study-1` hash to the same slug.
2. When a re-view is detected, the script uses the existing file's
   actual filename verbatim and tells Claude Code the exact path to
   update. Claude Code is no longer guessing.

### The vocabulary rename

- `ingest` / `ingestion` → `catalog` / `cataloging`
- `ingested` field in API → `cataloged`
- `uploaded` field in API → `acquired` (in the limited places it's
  actually about the human step of placing a file into the repo)
- `read` / `reads` field → `view` / `views` (in source frontmatter)
- `re-read` → `re-view`
- workflow file `ingest.yml` → `catalog.yml`
- npm script `ingest` → `catalog`
- script `scripts/ingest.mjs` → `scripts/catalog.mjs`
- function `findUningestedFiles` → `findUncatalogedAcquisitions`
- function `ingestWithClaude` → `catalogWithClaude`
- UI strings, table headers, copy — all updated in files covered above

### CLAUDE.md: structural + vocabulary changes

- New "Source-page-specific frontmatter" section documenting `role:`
  and `views:` fields
- Naming convention clarified: source-page date is *initial cataloging*
  date, stable forever
- "Prefer updates over new pages" split into separate principles for
  concept pages vs. source pages
- "Source re-views replace, don't sibling" codifies the replacement
  semantics + `views:` list + role updates
- Ingest workflow section renamed to Catalog workflow, re-view steps
  explicit
