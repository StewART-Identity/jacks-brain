# Jack's Brain — Patch (April 24, 2026)

A bundle that ships several bug fixes plus the Retention/Acquisition
rename and the new inline title-edit feature.

> **Note (May 19, 2026):** Since this patch notes was written, the
> top-level menu has been renamed: "Learn" → "Collect", "Collection"
> → "Reflect", with a new "Search" section. Path references in this
> file have been updated to the new layout for accuracy, but the
> historical "renamed from X to Y" narrative below describes the
> April 2026 changes that originally shipped in this patch.

## What's in this patch

### Bug fixes

- **`functions/api/originals.ts`** — reconstructed. The previous file at
  this path had been silently overwritten with a Node CLI script, which
  the Workers runtime can't execute. The Sources page in the wiki has
  therefore been broken (silently — the page caught the fetch error and
  showed "Could not load sources"). This restores it.

- **`scripts/catalog.mjs`** — restored from git history. The version in
  the repo today is a stale duplicate of `nuke.ts`. The recovered file
  is the original first commit's content with one small adjustment: the
  prompt now references `content/collect/retention.md` instead of
  `memory.md` to match this patch's renames.

- **`CLAUDE.md`** — brought into alignment with the actual wiki:
  - Removes the "Master catalog" framing from `content/index.md`. The
    wiki uses per-category index files (`reflect/sources/index.md`,
    `reflect/concepts/index.md`, etc.) as the actual catalogs;
    `content/index.md` is a hand-styled welcome page and shouldn't be
    turned into a catalog.
  - Replaces references to `memory.md` and `content/log.md` with
    `content/collect/retention.md`.
  - Updates the workflow descriptions to reflect the per-category index
    model.

- **Defense in depth on write endpoints.** All four write Functions
  (`nuke.ts`, `upload.ts`, `url.ts`, `youtube.ts`) plus the new
  `source.ts` and `retention.ts` now check for the
  `Cf-Access-Authenticated-User-Email` header that Cloudflare Access
  sets on every authenticated request. If the header is missing, the
  function returns 403. This means a misconfiguration that disabled
  Cloudflare Access in front of the Pages project would not result in
  unauthenticated callers being able to wipe the wiki — they'd hit 403
  at the Function layer too.

### Renames

- **`content/learn/retention.md` → `content/learn/acquisition.md`**:
  the page that tracks document-processing status (queued / in progress
  / cataloged) keeps its function. It's now called Acquisition because
  that's what librarianship calls the act of bringing something into
  the collection.

- **`content/learn/memory.md` → `content/learn/retention.md`**: the
  chronological audit log is renamed to Retention. "Retention" is the
  library term for the long-term record of what's been kept; "Memory"
  was the tech-y placeholder.

- **Component renames**: `Retention.tsx` → `Acquisition.tsx`. The
  inline script and SCSS files follow. The new page named Retention
  uses a brand-new component, `RetentionList.tsx`, which has the
  inline-edit table.

- **Navigation**: under Learn, the order is now Research → Knowledge →
  Acquisition → Retention. (Acquisition before Retention, matching the
  workflow: you acquire a document, then it lives in retention.)

### New feature: inline title editing on the Retention page

The Retention page (the new audit log) renders a four-column table:
Date, Action, Document (filename, read-only), Title (editable).

Click a title to edit. Blur or Enter to save. Escape to cancel. The
save commits a change to the source page's frontmatter `title:` field
via the new `PATCH /api/source` endpoint. The original filename in
`static/originals/` is never touched — only the display title changes.

If a source page no longer exists (e.g. it was nuked), its row's title
column shows a muted dash and editing is disabled.

The data comes from a new `GET /api/retention` endpoint, which parses
the markdown table in `content/collect/retention.md` and joins each row
with the current title from the corresponding source page's
frontmatter.

## Files in this zip

```
content/learn/acquisition.md           — was content/learn/retention.md (now lives at content/collect/acquisition.md)
content/learn/retention.md             — was content/learn/memory.md (now lives at content/collect/retention.md; mounts RetentionList)
functions/api/nuke.ts                  — RESET_TEMPLATES updated, Access header check
functions/api/originals.ts             — reconstructed from scratch
functions/api/retention.ts             — NEW
functions/api/source.ts                — NEW (PATCH endpoint)
functions/api/upload.ts                — Access header check
functions/api/url.ts                   — Access header check
functions/api/youtube.ts               — Access header check
quartz/components/Acquisition.tsx      — renamed from Retention.tsx
quartz/components/RetentionList.tsx    — NEW
quartz/components/index.ts             — updated import map
quartz/components/scripts/acquisition.inline.ts  — renamed from retention.inline.ts
quartz/components/styles/acquisition.scss        — renamed from retention.scss
quartz.layout.ts                       — sidebar links + ConditionalRender mounts
scripts/catalog.mjs                    — recovered from git history (with retention.md patch)
CLAUDE.md                              — vocabulary + structure update
```

## How to apply via the GitHub Bridge

The simplest path: drop the entire `jacks-brain-patch/` directory's
contents into the Bridge with strip-prefix set to `jacks-brain-patch/`,
target repo `StewART-Identity/jacks-brain`, branch `main`. The Bridge
will write each file to its correct location preserving directory
structure. One commit covers everything.

Suggested commit message:

```
Rename Memory → Retention, Retention → Acquisition; add inline title edit; fix originals.ts
```

## Cleanup steps NOT in this zip

A few cleanups can't be done by adding files — they require deleting
files or directly removing nav entries from the live repo. Do these
right after pushing the patch:

1. **Delete `content/learn/memory.md` from the repo.** The patch
   creates `content/learn/retention.md` (the new name), but the old
   file at `content/learn/memory.md` will still exist and will appear
   as a stale "Memory" page in the nav. Delete it via GitHub web UI
   (open the file → trash icon → commit) or via local `git rm`.

2. **Delete `quartz/components/Retention.tsx` and friends.** The patch
   creates `Acquisition.tsx` and the renamed inline/scss files but
   leaves the old `Retention.tsx`, `scripts/retention.inline.ts`, and
   `styles/retention.scss` orphaned. They aren't imported anywhere
   (the new `index.ts` imports `Acquisition` instead) so they're dead
   code, but they'll bloat the repo. Delete them at your convenience.

3. **Set the Cloudflare Pages env var if not already set.** The new
   Functions assume `GITHUB_TOKEN` and `GITHUB_REPO` env vars are
   already configured (they were set when `nuke.ts` and `upload.ts`
   were originally deployed). No new env vars are needed.

## Testing checklist

After deploy, in a fresh InPrivate window (so Access auth is fresh):

- [ ] `/collect/acquisition` loads the Document Processing tracker
- [ ] `/collect/retention` loads the audit table with four columns
- [ ] Sidebar order under Collect is Selection / Acquisition / Retention
- [ ] `/reflect/sources` loads the SourcesList table without a "Could
      not load sources" error
- [ ] On Retention, clicking a title turns it into an editable cell
- [ ] Blur after edit shows the saved-state visual flash; refresh
      confirms the title persisted
- [ ] Escape during edit cancels and reverts
- [ ] If a row's source page is gone, the title cell shows a muted dash
      and clicking it does nothing
      

If any of those fail, check Cloudflare Pages → your project → Functions
logs (live) for the failing endpoint's error message.
