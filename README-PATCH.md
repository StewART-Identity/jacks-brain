# Jack's Brain — Collection Table Patch

Replaces the Collection sub-page index layout with proper data tables,
adds a `summary:` frontmatter field, and backfills it on all five
existing collection pages.

## The bug we found

Each Collection sub-page (Sources, Entities, Concepts, Synthesis) was
rendering two unrelated UI elements stacked on top of each other:

1. An empty markdown table (the "Content / Summary / Date" header row
   in each `index.md` — never populated, purely decorative)
2. Quartz's auto-generated `PageList`, which renders each page as a
   flex layout with the date on the left, title in the middle, and tags
   floated to the far right

Visually this read as "tags floating randomly, disconnected from
titles." Your instinct that they "should be in the table" was exactly
right — they should, and now they are.

## What this patch does

### 1. Rewrites `quartz/components/PageList.tsx`

PageList now detects when it's rendering one of the four Collection
sub-pages and emits an actual `<table>` with proper columns:

- **Sources**: Title / Summary / Tags / Date
- **Synthesis**: Title / Summary / Tags / Date
- **Concepts**: Title / Summary / Tags (no date — evergreen)
- **Entities**: Title / Summary / Tags (no date — evergreen)

For all other contexts (tag pages, search results, custom listings),
PageList still renders the original flex layout. Backward-compatible.

### 2. Strips the empty markdown tables from index pages

Each of the four Collection sub-page `index.md` files had a manual
markdown table header with no rows. They're now intro prose only;
the actual listing is the auto-rendered table from PageList.

### 3. Introduces a `summary:` frontmatter field

Every collection page now carries a one-sentence summary in its
frontmatter, used to populate the Summary column. Existing pages
backfilled in this patch:

- `oauth.md`: "Open standard for delegated access — letting an app
  access a user's data without their password."
- `saml.md`: "XML-based SSO protocol that lets enterprises federate
  authentication via Identity Provider assertions."
- `active-directory.md`: "Microsoft's directory and credential store;
  the canonical backend behind enterprise SAML and OAuth flows."
- `2026-04-23-img-2369.md`: "Side-by-side instructional diagram
  comparing the request flow of SAML and OAuth, captured as a photo."
- `saml-vs-oauth.md`: "Comparison of SAML (authentication) and OAuth
  (authorization) — what each solves, where they overlap, common
  confusion."

### 4. Updates `scripts/catalog.mjs`

The catalog prompt now:

- Instructs the model to write a `summary:` field on every page it
  creates or updates (≤140 chars, informative on its own)
- Tells it not to modify `content/index.md` (welcome page) or any
  per-category `index.md` files (intro-only)
- (Re-applies the retention-log path fix from the consolidated patch
  in case any of those changes weren't fully synced)

### 5. Updates `CLAUDE.md`

Adds the `summary:` field to the standard frontmatter template, with
example summaries showing the expected style (informative, not
title-restated).

## How to apply

Bridge:
- **Strip prefix:** `jbpatch-collectiontable/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Twelve files. Single commit.

Commit message suggestion:

```
Render Collection sub-pages as proper tables; add summary frontmatter
```

## After deploy

Visit each Collection sub-page in turn. You should see:

- **`/collection/sources`** — Single table. Columns: Title, Summary,
  Tags, Date. The "Fred" entry (or whatever you renamed it to) has all
  four columns populated.
- **`/collection/synthesis`** — Single table. Same four columns.
  SAML vs. OAuth Comparison entry visible with summary.
- **`/collection/concepts`** — Three columns: Title, Summary, Tags.
  OAuth and SAML entries with their respective summaries.
- **`/collection/entities`** — Three columns: Title, Summary, Tags.
  Active Directory entry with its summary.

In all cases, tags should appear in their own column right next to the
title, scannable as a unified table — not floating to the right edge of
the page.

## Verification

After Cloudflare reports a green build, three quick checks:

1. **Visit `/collection/sources`** — confirm one table, four columns,
   summary populated.
2. **View page source** of any collection sub-page index — search for
   `class="table-container collection-table"`. Present = patch active.
3. **Visit a tag page** like `/tags/saml` — confirm the page list there
   still uses the old flex layout (because the slug is `tags/saml`, not
   `collection/*`). This proves the fallback path is intact and we
   didn't accidentally break tag/search pages.

## What's NOT in this patch (still pending)

Carryover orphan files from earlier sessions, none breaking anything
but worth deleting eventually:

- `content/learn/memory.md`
- `quartz/components/Retention.tsx`
- `quartz/components/scripts/retention.inline.ts`
- `quartz/components/styles/retention.scss`
