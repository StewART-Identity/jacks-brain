# Jack's Brain — "ingest" → "catalog" rename, final cleanup

This zip finishes the rename from "ingest" to "catalog" vocabulary.
After applying this, zero references to "ingest" remain in the codebase
outside of `content/` (which you're nuking anyway).

## Apply

Drop the files in this zip over their corresponding locations in the
repo. All 11 files REPLACE existing files, except `youtube-catalog.yml`
which is NEW.

After applying, DELETE one file locally:

```
git rm .github/workflows/youtube-ingest.yml
```

That's it. No hand-edits required this time.

## What's in this zip

**New file:**
- `.github/workflows/youtube-catalog.yml` — replaces `youtube-ingest.yml`.
  Full vocabulary rename: job name, PR titles/branches/commit messages,
  step labels.

**Replaced API routes:**
- `functions/api/youtube.ts` — now dispatches `youtube-catalog.yml`
  instead of `youtube-ingest.yml`; comment and user-facing message
  updated.
- `functions/api/url.ts` — comment, HTTP User-Agent string, and status
  message updated.
- `functions/api/upload.ts` — two comments and status message updated.
- `functions/api/nuke.ts` — both embedded post-nuke templates (the
  emptyIndex landing page and the emptySources page) updated.

**Replaced frontend files:**
- `quartz/components/UploadZone.tsx` — CSS class `.ingest-card` renamed
  to `.catalog-card`.
- `quartz/components/ResearchPage.tsx` — element IDs
  `ingest-selected-btn` → `catalog-selected-btn` and
  `research-ingest-status` → `research-catalog-status`.
- `quartz/components/styles/uploadZone.scss` — matching `.catalog-card`
  CSS rules plus comment updated.
- `quartz/components/styles/researchPage.scss` — matching
  `.catalog-selected-btn` CSS rules.
- `quartz/components/scripts/uploadZone.inline.ts` — function
  `checkActiveIngest` → `checkActiveCatalog`; section comments updated.
- `quartz/components/scripts/researchPage.inline.ts` — variables
  `ingestBtn` / `ingestStatus` / `updateIngestBtn` renamed with
  `catalog*`; element ID references updated; three user-facing strings
  updated ("for cataloging...", "Queued for cataloging", "Check
  Retention for cataloging status").

## After this zip

The codebase will be fully consistent on "catalog" vocabulary, except
for content files that are getting nuked anyway:

- `content/learn/memory.md` (log entries)
- `content/collection/concepts/neuron-metaphor.md`
- 7 source pages under `content/collection/sources/`
- `content/collection/sources/index.md`

These were intentionally skipped per your "this is fodder, I'll nuke it"
instruction.

## No regressions to worry about

The rename is mechanical:
- CSS classes renamed on both tsx (where they're written) and scss
  (where they're defined) sides together.
- Variable names and element IDs renamed in paired .tsx + .inline.ts
  files together.
- Workflow file renamed, and the API that dispatches it updated to
  point at the new name.
- User-facing strings updated, but no logic changed.

If anything breaks, it'd be a missed rename somewhere — the rename was
done systematically via sed so that's unlikely, but the first thing to
check if something does break is whether the old name (e.g.
`checkActiveIngest` or `.ingest-card`) appears anywhere that should
reference the new one.
