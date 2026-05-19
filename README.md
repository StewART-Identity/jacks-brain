# Jack's Brain

A personal knowledge wiki where Jack Stewart catalogs sources, builds
out a per-domain ontology of entities and concepts, and synthesizes
across them. Built on [Quartz](https://quartz.jzhao.xyz/) and deployed
on Cloudflare Pages, with a thin layer of Cloudflare Functions
providing the cataloging pipeline.

The wiki lives at **[jacks-brain.pages.dev](https://jacks-brain.pages.dev)**
and is gated behind Cloudflare Access — only Jack can read or write.

---

## What it is

A library-science-flavored knowledge base. The vocabulary is
deliberate:

- An **acquisition** is the act of bringing a document into the
  collection — uploading a PDF, a webpage, a YouTube transcript.
- The **catalog** is the automated pipeline that takes an acquired
  document and turns it into wiki content: a source summary plus the
  entity/concept/synthesis pages it spawns.
- **Retention** is the chronological audit log of every cataloging
  operation. It's what the wiki keeps; "memory" was the tech-y
  placeholder before the rename.
- **Reflect** is the catalog itself — the per-document summaries
  (Sources) plus the cross-cutting pages they produce (Entities,
  Concepts, Synthesis).

The wiki uses two-tier classification on every page:
**subjects** (a controlled vocabulary — placement within the wiki's
ontology) plus **tags** (a free-form folksonomy — descriptive
keywords). See `CLAUDE.md` for the full schema.

---

## Top-level structure

The sidebar nav mirrors the directory layout under `content/`:

```
Collect       — the cataloging pipeline
  Selection       (upload form)
  Acquisition     (live processing status)
  Retention       (chronological audit log; inline title edit)
Search        — query tools
  Wiki            (in-collection search)
  Web             (external research)
Reflect       — the cataloged collection
  Sources         (per-document summary pages)
  Entities        (people, organizations, tools, systems)
  Concepts        (ideas, theories, frameworks)
  Synthesis       (cross-cutting analysis, comparisons)
Visualize     — graph view of the wiki
  Graph           (full-page d3 force layout)
  Help            (graph view shortcuts)
Application   — meta-pages about the wiki itself
  Help            (using the wiki)
  Nuke It From Orbit  (wipe-and-reset; confirmation-gated)
```

`content/index.md` is a hand-styled welcome page and is intentionally
not turned into a catalog.

---

## Repo layout

```
content/                       The wiki itself — Quartz serves this as the site
  collect/                       Pipeline pages (Selection, Acquisition, Retention)
  search/                        Search pages (Wiki, Web)
  reflect/                       The collection (Sources, Entities, Concepts, Synthesis)
  visualize/                     Graph view pages
  application/                   Application-meta pages
  index.md                       Welcome page
data/
  retention-log.md               Chronological audit log (markdown table)
  graph-layouts.json             Saved graph view layouts
docs/                          Quartz's own docs (upstream — left untouched)
functions/api/                 Cloudflare Pages Functions (cataloging pipeline)
quartz/                        Quartz source — components, plugins, layouts
scripts/                       Catalog automation
static/originals/              Immutable source documents (acquired uploads)
static/in-flight/              Cataloging-in-progress state
static/queue/                  Pending acquisitions (drives the catalog workflow)
.github/workflows/             GitHub Actions (catalog.yml runs the pipeline)
CLAUDE.md                      Wiki schema and cataloging conventions
quartz.config.ts               Quartz site config
quartz.layout.ts               Sidebar nav, page mounts, conditional renders
```

`docs/` is the upstream Quartz documentation, kept around for reference
when modifying the layout or plugins. It isn't part of the wiki and
isn't served as content.

---

## The cataloging pipeline

How a document becomes wiki content:

1. **Acquisition.** The user drops a file (or URL) on the Selection
   page, or pushes one through the MCP server. The file lands in
   `static/originals/` and a row appears in `static/queue/`.
2. **The catalog workflow fires** (`.github/workflows/catalog.yml`).
   It checks the queue, picks the next item, runs Claude Code against
   the document, and produces:
   - One source page at `content/reflect/sources/YYYY-MM-DD-slug.md`
   - Zero or more entity pages under `content/reflect/entities/`
   - Zero or more concept pages under `content/reflect/concepts/`
   - Zero or more synthesis pages under `content/reflect/synthesis/`
   - One row appended to `data/retention-log.md`
3. **Cloudflare Pages rebuilds** when the catalog commits land on
   `main`, and the new pages appear on the live site.

The catalog is idempotent on re-views: rerunning it against an
already-cataloged document updates the source page in place (replacing
the body, appending to the `views:` log) rather than creating a new
file.

The Acquisition page shows live status for whatever is currently
moving through the pipeline. The Retention page shows the full
historical record.

---

## Deployment

The live site is a Cloudflare Pages project (`jacks-brain`) wired to
this repo's `main` branch with automatic deployments. Every commit
triggers a fresh Quartz build on CF's runners; there is no
intermediate staging branch.

A few things to know:

- **CF builds are serialized per-project.** Large rename pushes
  produce queued builds. Watch the Workers & Pages dashboard if a
  change hasn't reflected on the live site within a couple of minutes.
- **There is no incremental rebuild cache.** Each deployment is a full
  Quartz build (~30-60 seconds). Batching changes into atomic multi-
  file commits keeps the deployment queue short.
- **`.github/workflows/deploy.yml` is orphaned.** It's a leftover
  GitHub Pages publisher from before the CF migration and fails on
  every push. It does not affect the live deployment.

The wiki sits behind **Cloudflare Access** — every request must come
from an authenticated session, and every write Function checks for the
`Cf-Access-Authenticated-User-Email` header as defense in depth.

---

## Working in this repo

Most edits go through one of two tools:

- **[`jacks-brain-mcp`](https://github.com/StewART-Identity/jacks-brain-mcp)**
  — an MCP server that lets Claude.ai read, write, and catalog content
  here. Every write requires explicit per-call approval via the
  Claude.ai tool-call confirmation dialog. This is the everyday
  authoring path.
- **The GitHub Bridge** at `idm-toolbox.pages.dev/bridge/` — a
  multi-file commit UI for when you want to drop a tree of files in
  deliberately, with a commit message and a tree preview.

Direct `git push` works too, but is rarely the fastest path.

Before making any wiki edits — by hand or through MCP — read
**`CLAUDE.md`** at the repo root. It defines:

- The page frontmatter schema (required fields, source-page extras).
- The subjects vs. tags contract (controlled vocabulary vs.
  folksonomy).
- Naming conventions (filenames, source-page date prefixes, wikilinks).
- The Catalog / Query / Lint workflows.
- Normalization rules that take precedence over how source documents
  style things.

---

## Patch history

Cumulative structural changes are documented as `PATCH-YYYY-MM-DD.md`
files at the repo root:

- `PATCH-2026-04-24.md` — Retention/Acquisition rename, inline title
  editing, originals.ts reconstruction.
- `PATCH-2026-04-25.md` — Code-review fixes: HTML escaping,
  count-cap flicker, numeric date sort.
- `PATCH-2026-05-19.md` — Top-level menu refactor (Learn → Collect +
  Search, Collection → Reflect, new Application section).

The README itself describes only the current state of the project.
For the "why did this change?" answer to anything structural, the
matching patch file is where the rationale lives.

---

## License

Code: MIT (`LICENSE.txt`). Wiki content (everything under `content/`
and `static/originals/`): personal knowledge, not licensed for reuse.

The Quartz framework this site is built on is itself MIT-licensed by
its upstream authors. See `QUARTZ-README.md` for the upstream README.
