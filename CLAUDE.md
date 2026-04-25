# Wiki Schema

You are maintaining a personal knowledge wiki. This file defines the structure,
conventions, and workflows you follow. Read it at the start of every session.

## Directory structure

```
content/                # The wiki — you own this layer entirely
  index.md              # Welcome page (custom landing — do not turn into a catalog)
  learn/
    selection.md        # Upload form — add a source to the collection
    acquisition.md      # Live status of the cataloging pipeline
    retention.md        # Chronological audit log of cataloged documents
  collection/
    sources/            # One summary page per cataloged source
      index.md          # Sources catalog (auto-rendered, do maintain rows here)
    entities/           # People, organizations, tools, systems
      index.md          # Entities catalog
    concepts/           # Ideas, theories, frameworks, principles
      index.md          # Concepts catalog
    synthesis/          # Cross-cutting analysis, comparisons, theses
      index.md          # Synthesis catalog
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
summary: "One-sentence description (≤140 chars) shown in Collection table listings."
type: source | entity | concept | synthesis
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - relevant-tag
sources:
  - "[[collection/sources/source-filename]]"
confidence: high | medium | low | speculative
---

Content here. Use [[wikilinks]] to link to other pages.
```

The `summary` field is required for every page. It appears as the
"Summary" column on each Collection sub-page (Sources, Entities,
Concepts, Synthesis) and is what makes the listings scannable. Make it
informative on its own — not just the title rephrased. Examples:

- *OAuth*: "Open standard for delegated access — letting an app access a user's data without their password."
- *Active Directory*: "Microsoft's directory and credential store; the canonical backend behind enterprise SAML and OAuth flows."
- *SAML vs. OAuth*: "Comparison of SAML (authentication) and OAuth (authorization) — what each solves, where they overlap, common confusion."

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
- Source pages: `collection/sources/YYYY-MM-DD-short-descriptor.md` where the
  date is the date of **initial cataloging**, never re-cataloging. A source
  page's filename is stable across re-views — re-views never create new
  files.
- Entity pages: `collection/entities/entity-name.md`
- Concept pages: `collection/concepts/concept-name.md`
- Synthesis pages: `collection/synthesis/descriptive-title.md`

### Wikilinks

Use `[[relative-path]]` format: `[[collection/concepts/gradient-descent]]`,
`[[collection/entities/claude-shannon]]`. Quartz resolves these automatically.

When referencing a page, always use a wikilink. Cross-reference generously —
links are what make the wiki valuable. Every new page should link to at least
two existing pages, and you should update existing pages to link back.

## Workflows

### Catalog

Trigger: user says "catalog [source]" or drops a file. (Related: a file
appearing in `static/originals/` is an *acquisition* — the upstream step
the human performs before cataloging.)

The catalog has three phases: **register, enrich, verify.** Registration
gets the document into the audit trail and the per-category indexes
quickly; enrichment fills in the substantive content; verification
confirms nothing was missed. Do them in order — registration is cheap
and recoverable, enrichment is expensive and shouldn't run if
registration failed, and verification depends on both.

#### Register

1. View the acquired document in `static/originals/`.

2. Discuss key takeaways with the user. Ask what to emphasize.

3. Check whether a source page already exists for this document (match
   by slug, not by filename — see "Naming conventions"). If it does,
   this is a **re-view**; if not, this is the **initial cataloging**.

4. Create or update the source summary page in `content/collection/sources/`.
   On a re-view: replace the body, append a `views:` entry, update `role:`
   if the interpretation changed. On an initial cataloging: create the
   file with a single `views:` entry.

5. Log the retention entry. Call `append_retention_entry` with the
   action (`Cataloged` for an initial, `Re-viewed` for a re-view) and
   the original filename from `static/originals/`.

6. Update `content/collection/sources/index.md` with the new or changed row.

#### Enrich

7. For each significant entity mentioned: create or update its page in
   `content/collection/entities/`. Update `content/collection/entities/index.md`
   accordingly.

8. For each significant concept: create or update its page in
   `content/collection/concepts/`. Update `content/collection/concepts/index.md`
   accordingly.

9. If the source connects to or contrasts with existing wiki content,
   create or update a synthesis page in `content/collection/synthesis/`,
   and update `content/collection/synthesis/index.md`.

#### Verify

10. Read back what was committed. Specifically:
    - `data/retention-log.md` contains a row for this catalog.
    - `content/collection/sources/index.md` lists the new or updated source.
    - Each entity and concept page created in steps 7–8 appears in its
      respective index file.

    Use the `read_repo_file` tool to read `data/retention-log.md` (it lives
    outside `content/`, so `read_wiki_page` doesn't reach it). If
    `read_repo_file` is not available in the current session, ask the
    user to confirm the retention entry landed before reporting completion.

    If any of these are missing, fix them now before reporting completion.
    The wiki's audit and navigation depend on these being in sync; a
    catalog that produced beautiful prose but didn't update the indexes
    is an incomplete catalog.

11. Report what you created and updated.

A single source typically touches 5–15 pages. Take your time. Quality of
cross-references matters more than speed.

### Query

Trigger: user asks a question about the wiki's domain.

1. Read the relevant per-category index file(s) to find pages
   (`content/collection/sources/index.md`, `collection/concepts/index.md`, etc.).
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
- Per-category index files out of sync with actual pages

Suggest fixes. Ask before applying them.

## Per-category index format

Each `collection/<category>/index.md` is a flat table of the pages in that
category. The wiki has no top-level master catalog; per-category indexes
are authoritative. `content/index.md` is a hand-styled welcome page and
should not be turned into a catalog.

```markdown
---
title: "Sources"
---

Acquired documents and their cataloging status.

| Content | Summary | Date |
|---------|---------|------|
| [[collection/sources/2026-04-14-example]] | Brief description | 2026-04-14 |
```

(Entities and Concepts indexes have two columns; Sources and Synthesis
have three including the date.)

## Retention log format

`data/retention-log.md` is the chronological audit log of cataloging
operations. It's a markdown table read by the `/api/retention` endpoint
and rendered by the RetentionList component on `content/learn/retention.md`,
where titles can be inline-edited (the underlying filename is preserved).
The rendered page itself contains no table — only the data file does.
Always write to the data file, never to the rendered page.

```markdown
| Date | Action | Details |
|------|--------|---------|
| 2026-04-14 | Cataloged | 2026-04-14-source-title.png |
| 2026-04-15 | Re-viewed | 2026-04-14-source-title.png |
```

Action values:
- `Cataloged` — first catalog of an acquisition
- `Re-viewed` — subsequent re-catalog (updates the source page in place)
- `Renamed` — title-only change via inline edit on the Retention page

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
