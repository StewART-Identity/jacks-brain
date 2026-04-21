# Wiki Schema

You are maintaining a personal knowledge wiki. This file defines the structure,
conventions, and workflows you follow. Read it at the start of every session.

## Directory structure

```
content/                # The wiki — you own this layer entirely
  index.md              # Master catalog of all pages (you maintain this)
  learn/
    knowledge.md        # Upload / acquisition page
    memory.md           # Chronological record of operations
  recall/
    sources/            # One summary page per cataloged source
    entities/           # People, organizations, tools, systems
    concepts/           # Ideas, theories, frameworks, principles
    synthesis/          # Cross-cutting analysis, comparisons, theses
static/originals/       # Immutable source documents — never modify these
CLAUDE.md               # This file — read-only during operations
```

Quartz serves everything in `content/` as the browsable wiki. Files in `raw/`
are not published.

## Page format

Every wiki page uses this template:

```markdown
---
title: "Page Title"
type: source | entity | concept | synthesis
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - relevant-tag
sources:
  - "[[recall/sources/source-filename]]"
confidence: high | medium | low | speculative
---

# Page Title

Content here. Use [[wikilinks]] to link to other pages.
```

### Source-page-specific frontmatter

Source pages (`type: source`) carry additional fields that other page
types do not:

```yaml
role: argument | evidence | reference | primary-data | narrative | analysis
views:
  - date: YYYY-MM-DD
    note: "One-line summary of what this viewing contributed."
```

- **`role`** describes the source document's rhetorical function in the
  wiki's knowledge graph. A single document's role can change across
  re-views as its place in the graph matures. Use the value that fits
  the document's *current* role, updated whenever a re-view reframes it.
  - `argument` — a document making a case for a position
  - `evidence` — a document serving as the evidence base for an argument
    made elsewhere
  - `reference` — a normative document (spec, policy, standard)
  - `primary-data` — raw observations or records
  - `narrative` — a story, case study, or account
  - `analysis` — a document that synthesizes or interprets other sources
- **`views`** is an append-only log of each time the source was examined
  as part of cataloging. Newest view last. Each entry notes what that
  viewing contributed — whether it was the initial catalog ("Initial
  cataloging.") or a re-view with a specific outcome ("Reframed from
  argument to evidence base; added four concept links").

### Naming conventions

- Filenames: lowercase, hyphens for spaces. `quantum-entanglement.md`, not
  `Quantum Entanglement.md`.
- Source pages: `recall/sources/YYYY-MM-DD-short-descriptor.md` where the
  date is the date of **initial cataloging**, never re-cataloging. A source
  page's filename is stable across re-views — re-views never create new
  files.
- Entity pages: `recall/entities/entity-name.md`
- Concept pages: `recall/concepts/concept-name.md`
- Synthesis pages: `recall/synthesis/descriptive-title.md`

### Wikilinks

Use `[[relative-path]]` format: `[[recall/concepts/gradient-descent]]`,
`[[recall/entities/claude-shannon]]`. Quartz resolves these automatically.

When referencing a page, always use a wikilink. Cross-reference generously —
links are what make the wiki valuable. Every new page should link to at least
two existing pages, and you should update existing pages to link back.

## Workflows

### Catalog

Trigger: user says "catalog [source]" or drops a file. (Related: a file
appearing in `static/originals/` is an *acquisition* — the upstream step
the human performs before cataloging.)

1. View the acquired document in `static/originals/`.
2. Discuss key takeaways with the user. Ask what to emphasize.
3. Check whether a source page already exists for this document (match
   by slug, not by filename — see "Naming conventions"). If it does,
   this is a **re-view**; if not, this is the **initial cataloging**.
4. Create or update the source summary page in `content/recall/sources/`.
   On a re-view: replace the body, append a `views:` entry, update `role:`
   if the interpretation changed. On an initial cataloging: create the
   file with a single `views:` entry.
5. For each significant entity mentioned: create or update its page in
   `content/recall/entities/`.
6. For each significant concept: create or update its page in
   `content/recall/concepts/`.
7. If the source connects to or contrasts with existing wiki content,
   create or update a synthesis page in `content/recall/synthesis/`.
8. Update `content/index.md` with new or changed pages.
9. Append an entry to `content/learn/memory.md` marking this as
   "Cataloged" (initial) or "Re-viewed" (subsequent).
10. Report what you created and updated.

A single source typically touches 5–15 pages. Take your time. Quality of
cross-references matters more than speed.

### Query

Trigger: user asks a question about the wiki's domain.

1. Read `content/index.md` to find relevant pages.
2. Read those pages.
3. Synthesize an answer with `[[wikilinks]]` to supporting pages.
4. If the answer is substantial and reusable, offer to file it as a new
   synthesis page. Good answers shouldn't disappear into chat history.

### Lint

Trigger: user says "lint" or "health check".

Check for and report:
- Contradictions between pages
- Stale claims superseded by newer sources
- Orphan pages (no inbound links)
- Important concepts mentioned but lacking their own page
- Missing cross-references
- Broken wikilinks
- Pages missing required frontmatter fields
- `index.md` out of sync with actual pages

Suggest fixes. Ask before applying them.

## Index format

`content/index.md` is a categorized catalog:

```markdown
---
title: "Wiki Index"
---

# Wiki Index

## Sources
| Page | Summary | Date |
|------|---------|------|
| [[recall/sources/2026-04-14-example]] | Brief description | 2026-04-14 |

## Entities
| Page | Summary |
|------|---------|
| [[recall/entities/example-entity]] | One-line description |

## Concepts
| Page | Summary |
|------|---------|
| [[recall/concepts/example-concept]] | One-line description |

## Synthesis
| Page | Summary | Date |
|------|---------|------|
| [[recall/synthesis/example-analysis]] | One-line description | 2026-04-14 |
```

## Log format

`content/log.md` is append-only, newest first:

```markdown
## [2026-04-14] catalog | Source Title
- Created: recall/sources/2026-04-14-source-title.md
- Created: recall/entities/new-entity.md
- Updated: recall/concepts/existing-concept.md (added section on X)
- Updated: index.md

## [2026-04-14] query | What is the relationship between X and Y?
- Filed as: recall/synthesis/x-and-y-relationship.md

## [2026-04-14] lint
- Found 2 orphan pages
- Fixed 3 broken wikilinks
- Suggested 1 new concept page
```

## Principles

- **You write the wiki, the user curates.** The user decides what to catalog
  and what questions to ask. You do the summarizing, cross-referencing, filing,
  and bookkeeping.
- **Cross-reference aggressively.** The links between pages are as valuable as
  the pages themselves. When you update a page, scan for opportunities to link
  to and from other pages.
- **Flag contradictions, don't silently resolve them.** If a new source
  contradicts existing wiki content, note the contradiction explicitly on both
  pages and let the user decide.
- **Prefer updates over new pages.** If a concept page already exists, enrich
  it rather than creating a near-duplicate.
- **Source re-views replace, don't sibling.** If a source page already
  exists for an underlying document being re-viewed, update the existing
  page in place: replace the body with the new viewing's interpretation,
  update the `updated:` date, update the `role:` if the view reframed it,
  and append an entry to the `views:` list. Do NOT create a new file with
  a different date prefix. The previous view's prose is intentionally
  superseded — `views:` records the history; the body is always the latest
  interpretation. If a previous view contained something specific worth
  preserving, quote or summarize it in the new body under a "## Previous
  viewings" section.
- **Keep source summaries faithful.** Source pages summarize what the source
  says, not your interpretation. Interpretation belongs in concept and synthesis
  pages.
- **Confidence tags matter.** Mark speculative connections as `confidence: speculative`.
  Mark well-sourced claims as `confidence: high`. This helps the user trust the wiki.

## Normalization rules

These rules take precedence over how the source documents style things.
The wiki is the user's own knowledge layer; it is not bound to the
conventions of the external documents it catalogs.

- **Jack Stewart's title** is **"IAM Engineer"** — never "Architect",
  "Architect/Engineer", or any other variant. Source documents may use
  other styling for external audiences; the wiki always uses "IAM Engineer".
  This applies to entity pages, source summary byline attribution, and
  any other place the title appears.
