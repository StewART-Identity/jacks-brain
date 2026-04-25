# Jack's Brain — Selection + Collection Rename Patch

Renames the sidebar vocabulary to match library-science conventions:

- **`learn/knowledge`** → **`learn/selection`** (the act of selecting a
  source to add to the collection)
- **Study section / `recall/`** → **Collection section / `collection/`**
  (the noun describing what the library holds)

After this patch, the Learn sidebar reads as a complete collection-
development lifecycle: **Research → Selection → Acquisition → Retention.**

## What changed

### Renamed (full filesystem move)

- `content/learn/knowledge.md` → `content/learn/selection.md`
- `content/recall/**` (10 files) copied to `content/collection/**` with
  all internal `[[recall/...]]` wikilinks rewritten to `[[collection/...]]`

### Updated

- `quartz.layout.ts` — sidebar title/slug for both renames
- `CLAUDE.md` — directory-structure block, all `content/recall/` path
  refs, every `[[recall/...]]` wikilink in example blocks
- `scripts/catalog.mjs` — prompt text and path construction for source/
  entity/concept/synthesis pages
- `functions/api/*.ts` (5 files: nuke, source, retention, originals,
  status) — every `content/recall/` path reference
- `content/application/help.md` — Learn section rewritten (now shows all
  four lifecycle pages), Study→Collection heading, all wikilinks
- `README.md`, `PACKAGING_NOTES.md` — root-level path references

## How to apply

Drop through the Bridge:

- **Strip prefix:** `jbpatch-collection/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

One commit, all files atomic.

Suggested commit message:

```
Rename Knowledge → Selection and Study/recall → Collection
```

## REQUIRED CLEANUP after deploy

The Bridge can only add or overwrite files — it can't delete. After this
patch lands and the build succeeds, the OLD files/directories will still
exist in the repo alongside the new ones. The sidebar won't show them
(layout.ts only references the new paths), but they'll remain browsable
at their old URLs and leak into search.

### Cleanup checklist (do after deploy succeeds)

Via GitHub web UI, delete these files/directories:

- [ ] `content/learn/knowledge.md` (the old upload page)
- [ ] Entire `content/recall/` directory and all its contents:
  - [ ] `content/recall/index.md`
  - [ ] `content/recall/sources/index.md`
  - [ ] `content/recall/sources/2026-04-23-img-2369.md`
  - [ ] `content/recall/entities/index.md`
  - [ ] `content/recall/entities/active-directory.md`
  - [ ] `content/recall/concepts/index.md`
  - [ ] `content/recall/concepts/oauth.md`
  - [ ] `content/recall/concepts/saml.md`
  - [ ] `content/recall/synthesis/index.md`
  - [ ] `content/recall/synthesis/saml-vs-oauth.md`

Fastest path: open each file in GitHub web UI, trash can, "Delete file",
commit. Alternatively, `git rm -r content/recall/` in a local clone.

Also carryover from earlier patches (never cleaned up):
- [ ] `quartz/components/Retention.tsx` (orphaned component)
- [ ] `quartz/components/scripts/retention.inline.ts`
- [ ] `quartz/components/styles/retention.scss`

## What you should see after deploy + cleanup

Sidebar:

- **Learn** — Research, Selection, Acquisition, Retention
- **Collection** — Sources, Entities, Concepts, Synthesis, Search
- **Visualize** — Graph View

URLs:

- `/learn/selection` loads the upload form
- `/collection/sources` loads the Sources index
- `/collection/concepts/oauth` loads the OAuth concept page
- `/collection/synthesis/saml-vs-oauth` loads the synthesis page

Existing wikilinks in the new collection pages should all resolve
(they were rewritten during the copy). The Graph view should also
update to show the new paths.
