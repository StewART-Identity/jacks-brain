# Jack's Brain

A personal knowledge wiki built on [Quartz 4](https://quartz.jzhao.xyz/).
Documents are acquired into `static/originals/` and then cataloged into
structured wiki pages by `scripts/catalog.mjs`.

## Vocabulary

Terminology matters in this project — it shapes how you think about the
wiki:

- **Acquisition** — a document lands in `static/originals/`. You do this.
- **Cataloging** — the script produces wiki artifacts from an acquisition.
  Driven by Claude Code CLI; typically results in a source page plus
  entity / concept / synthesis pages that cross-reference the new entry.
- **View** — the act of examining a document during cataloging. Each
  source page's `views:` frontmatter records every viewing.
- **Re-view** — cataloging a source that already has a wiki page. The
  existing page is updated in place; a new `views:` entry is appended.
  Re-views never create sibling files.

See `CLAUDE.md` for the full conventions.

## Structure

```
content/              The wiki Quartz serves
  index.md
  learn/              Meta-pages: knowledge upload, memory log
  recall/
    sources/          One page per cataloged document
    entities/         People, organizations, tools
    concepts/         Ideas, frameworks
    synthesis/        Cross-cutting analysis
  application/        UI help pages
  visualize/          Graph view
static/originals/     Acquired source documents (immutable)
scripts/
  catalog.mjs         The cataloging pipeline
  youtube-transcript.mjs
functions/api/        Cloudflare Pages Functions (originals, status)
quartz/               Quartz 4 source
.github/workflows/
  catalog.yml         CI: auto-catalogs acquisitions pushed to originals/
```

## Commands

- `npm run docs` — build and serve the wiki locally
- `npm run build` — production build
- `npm run catalog [file-path]` — catalog an acquisition (or all un-cataloged
  if no arg). Requires `CLAUDE_CODE_OAUTH_TOKEN` in env.
- `npm run yt` — YouTube transcript helper

## Cataloging workflow

1. Drop a document into `static/originals/`, naming it
   `YYYY-MM-DD-<descriptor>.<ext>`.
2. Push. The `catalog.yml` GitHub Actions workflow runs automatically.
3. The workflow calls `scripts/catalog.mjs`, which invokes Claude Code
   CLI to view the document and write wiki pages.
4. The workflow commits the result back to `main`.

Alternatively, catalog locally: `npm run catalog static/originals/foo.docx`.

## Conventions

Read `CLAUDE.md` at the start of any session that modifies the wiki. It
defines the page format, naming conventions, and workflows. In particular:

- Source pages have a stable filename across re-views. The date prefix
  is the *initial cataloging* date and never changes.
- Re-views replace the body prose entirely and append to `views:`.
  They do NOT create a new file.
- Cross-reference aggressively — links between pages are as valuable as
  the pages themselves.
