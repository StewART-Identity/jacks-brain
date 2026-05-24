# Wiki Schema

You are maintaining a personal knowledge wiki. This file defines the structure,
conventions, and workflows you follow. Read it at the start of every session.

## Directory structure

```
content/                # The wiki — you own this layer entirely
  index.md              # Welcome page (custom landing — do not turn into a catalog)
  search/
    wiki.md             # Search the wiki (in-collection search)
    web.md              # Search the web (external research)
  notes/
    index.md            # Notes landing — links to write.md and browse.md
    write.md            # Capture form — creates a new note
    browse.md           # Notes list — every note as an expandable card
    <slug>.md           # Individual notes (slug = YYYYMMDD-HHMMSS timestamp)
  collect/
    selection.md        # Upload form — add a source to the collection
    acquisition.md      # Cataloging — live status of the pipeline
    retention.md        # Chronological audit log of cataloged sources
  reflect/
    sources/            # One summary page per cataloged source
      index.md          # Sources page — intro only; table auto-rendered
    entities/           # People, organizations, tools, systems
      index.md          # Entities page — intro only; table auto-rendered
    concepts/           # Ideas, theories, frameworks, principles
      index.md          # Concepts page — intro only; table auto-rendered
    synthesis/          # Cross-cutting analysis, comparisons, theses
      index.md          # Synthesis page — intro only; table auto-rendered
  study/
    graph.md            # Full-page graph view
    help.md             # Graph view help and shortcuts
static/originals/       # Immutable source documents — never modify these
CLAUDE.md               # This file — read-only during operations
```

Quartz serves everything in `content/` as the browsable wiki. Files in `raw/`
are not published.

### Sidebar structure

The sidebar's top-level groups mirror the directory structure, and the
groups are arranged to express two pairings:

1. **Search and Notes** are peers — both about where information
   *comes from*. Search brings in information gathered by others
   (Wiki, Web); Notes captures information gathered by you (Write,
   Browse). They sit at the top of the sidebar, side by side.
2. **Collect and Reflect** are the cataloging pipeline — Collect is
   the verb (Selection, Acquisition, Retention), Reflect is what
   results from it (Sources, Entities, Concepts, Synthesis).
3. **Study** holds the visualization tools — currently just Graph.

Notes are top-level (peer of Search) rather than sub-pages of Collect
because notes are not part of the cataloging pipeline — they are
first-class captures of the user's own thinking, not downstream of an
acquisition. Don't move them back under Collect or Study.

## Page format

Every wiki page uses this template:

```markdown
---
title: "Page Title"
summary: "One-sentence description (≤140 chars) shown in Reflect table listings."
type: source | entity | concept | synthesis | note
created: YYYY-MM-DD
updated: YYYY-MM-DD
subjects:
  - subject-from-controlled-vocabulary
tags:
  - relevant-tag
sources:
  - "[[reflect/sources/source-filename]]"
confidence: high | medium | low | speculative
---

Content here. Use [[wikilinks]] to link to other pages.
```

The `summary` field is required for every page. It appears as the
"Summary" column on each Reflect sub-page (Sources, Entities,
Concepts, Synthesis) and is what makes the listings scannable. Make it
informative on its own — not just the title rephrased. Examples:

- *OAuth*: "Open standard for delegated access — letting an app access a user's data without their password."
- *Active Directory*: "Microsoft's directory and credential store; the canonical backend behind enterprise SAML and OAuth flows."
- *SAML vs. OAuth*: "Comparison of SAML (authentication) and OAuth (authorization) — what each solves, where they overlap, common confusion."

The `subjects` and `tags` fields are both required for every page and
play different roles. See "Subjects vs. tags" below for the contract;
in brief, `subjects` is a controlled vocabulary you should bias toward
reusing, and `tags` is a freeform folksonomy you can populate liberally.

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

### Note-specific frontmatter

Note pages (`type: note`, optional but encouraged) are simpler than
source pages. They carry no `role:` or `views:`, and the `created:` /
`modified:` timestamps are ISO datetimes rather than YYYY-MM-DD dates
(because notes are precise-time captures, not day-grain catalog
events):

```yaml
title: "Quick observation about X"
created: 2026-05-24T18:32:00.000Z
modified: 2026-05-24T18:32:00.000Z
tags:
  - some-tag
```

The form on `/notes/write` writes notes with this shape. The slug is
the timestamp itself in `YYYYMMDD-HHMMSS` form, so notes sort
chronologically by filename without any frontmatter inspection.

### Naming conventions

- Filenames: lowercase, hyphens for spaces. `quantum-entanglement.md`, not
  `Quantum Entanglement.md`.
- Source pages: `reflect/sources/YYYY-MM-DD-short-descriptor.md` where the
  date is the date of **initial cataloging**, never re-cataloging. A source
  page's filename is stable across re-views — re-views never create new
  files.
- Entity pages: `reflect/entities/entity-name.md`
- Concept pages: `reflect/concepts/concept-name.md`
- Synthesis pages: `reflect/synthesis/descriptive-title.md`
- Note pages: `notes/YYYYMMDD-HHMMSS.md` (timestamp slug, generated
  automatically by the form). Notes can also be given descriptive
  slugs for hand-written reference notes — the
  `notes/graph-theory-glossary.md` page is an example.

### Wikilinks

Use `[[relative-path]]` format: `[[reflect/concepts/gradient-descent]]`,
`[[reflect/entities/claude-shannon]]`. Quartz resolves these automatically.

When referencing a page, always use a wikilink. Cross-reference generously —
links are what make the wiki valuable. Every new page should link to at least
two existing pages, and you should update existing pages to link back.

## Subjects vs. tags

Every page carries two classification fields with different jobs.
Understanding the distinction is essential — fill them in poorly and
the wiki's organizational coherence degrades over time.

### `subjects:` — controlled vocabulary subject headings (ontology)

A *deliberate* classification of what the page is fundamentally about.
Subjects answer "where does this page belong in the wiki's overall
organization?" — they place each page within an emerging ontology of
the wiki's domain.

**Rules for choosing subjects:**

1. **Read existing subjects first.** Before proposing a subject for a
   new page, query the wiki for the current subject vocabulary.
   `list_wiki_pages` then `read_wiki_page` for a sampling of pages
   across types is a reasonable approach. Inspect the `subjects:` field
   on each.

2. **Bias hard toward reuse.** If an existing subject covers the
   page's conceptual territory, use it — even if a more descriptive
   new subject could be coined. The strength of a controlled vocabulary
   comes from consistency: a subject only earns its keep by being
   reused across many pages.

3. **One concept per subject.** Subjects must be atomic. Use
   `identity-management` as a subject and `migration` as a tag — never
   `identity-management-migrations` as a subject. Compound subjects
   defeat the controlled vocabulary by inflating it with one-off
   entries.

4. **Subjects are short — typically one to three per page.** A page
   with five subjects probably has the wrong subjects (too narrow);
   reach for tags instead.

5. **Lowercase, kebab-case.** `identity-management`, not
   `Identity Management` or `identity_management` or `identityManagement`.

6. **New subjects are introduced only when no existing subject fits.**
   When introducing a new subject, briefly explain in the page body
   why no existing subject covered the territory. This makes ontology
   evolution legible to future cataloging — and to the user, who may
   want to revise.

7. **When uncertain between a broader and a narrower subject, prefer
   the broader.** A page about provisioning specifically should still
   take `identity-management` as its subject if that's the closest
   existing umbrella, with `provisioning` as a tag to capture the
   specificity. Subjects describe categorical position; tags describe
   surface detail.

### `tags:` — descriptive keywords (folksonomy)

A free-form list of words and short phrases that describe the page's
content surface. Tags answer "what is this page about, in detail?" —
they catch every way a topic might be referenced, regardless of
conceptual hierarchy.

**Rules for choosing tags:**

1. **Be liberal.** Five to ten tags per page is normal; more is fine
   if the content warrants. Tags don't carry ontological weight, so
   over-tagging is far less harmful than over-subjecting.

2. **Tags can be specific or general, technical or thematic.** A page
   about Active Directory migration can tag `active-directory`,
   `migration`, `ldap`, `kerberos`, `unt-system`, and any other
   descriptive term that captures something in the content.

3. **Lowercase, kebab-case.** Same convention as subjects.

4. **Reuse where natural, but don't strain.** If you've used `migration`
   on three other pages and this page is about something migration-
   adjacent, use `migration` here too. But tags don't require the
   ontology-discipline of subjects — coining a new tag is cheap.

### Why both?

Library and information science research shows that
controlled-vocabulary subject headings and free-text keywords
*together* produce better retrieval than either alone. Subjects give
*precision* (find me everything about this topic, regardless of
phrasing); tags give *recall* (find me everywhere this word appears,
regardless of categorization). The two-tier system lets you query the
wiki both ways.

### Examples

A source page documenting a 2026 Entra ID migration runbook:

```yaml
subjects:
  - identity-management
tags:
  - entra-id
  - migration
  - adfs
  - defederation
  - cisco-duo
  - authentication-methods
  - unt-system
```

The single subject `identity-management` places this page within the
wiki's IAM bucket. The seven tags capture the descriptive surface of
what the page is about — every term someone might search for or
associate with this content.

A concept page about authentication methods policy:

```yaml
subjects:
  - identity-management
tags:
  - authentication-methods
  - entra-id
  - policy
  - mfa
```

Same subject — `identity-management` — because conceptually this is
also about IAM. Different and fewer tags because a concept page has
narrower descriptive surface than a source page.

A synthesis page comparing two migrations:

```yaml
subjects:
  - identity-management
  - operations
tags:
  - migration
  - patterns
  - orphaned-state
  - entra-id
  - idm
```

Two subjects because the synthesis genuinely spans two conceptual
domains: IAM-as-a-domain and operational-patterns-as-a-domain. Tags
capture the descriptive specifics of the synthesis.

## Workflows

### Catalog

Trigger: user says "catalog [source]" or drops a file. (Related: a file
appearing in `static/originals/` is an *acquisition* — the upstream step
the human performs before cataloging.)

The catalog has three phases: **register, enrich, verify.** Registration
gets the document into the audit trail; enrichment fills in the
substantive content; verification confirms nothing was missed. Do them
in order — registration is cheap and recoverable, enrichment is
expensive and shouldn't run if registration failed, and verification
depends on both.

#### Register

1. View the acquired document in `static/originals/`.

2. Discuss key takeaways with the user. Ask what to emphasize.

3. Check whether a source page already exists for this document (match
   by slug, not by filename — see "Naming conventions"). If it does,
   this is a **re-view**; if not, this is the **initial cataloging**.

4. Create or update the source summary page in `content/reflect/sources/`.
   On a re-view: replace the body, append a `views:` entry, update `role:`
   if the interpretation changed. On an initial cataloging: create the
   file with a single `views:` entry.

5. Log the retention entry. Call `append_retention_entry` with the
   action (`Cataloged` for an initial, `Re-viewed` for a re-view) and
   the original filename from `static/originals/`.

#### Enrich

6. For each significant entity mentioned: create or update its page in
   `content/reflect/entities/`. Prefer enriching an existing page
   over creating a near-duplicate.

7. For each significant concept: create or update its page in
   `content/reflect/concepts/`. Prefer enriching an existing page
   over creating a near-duplicate.

8. If the source connects to or contrasts with existing wiki content,
   create or update a synthesis page in `content/reflect/synthesis/`.
   Good synthesis pages compare sources, identify patterns, or surface
   tensions between documents.

#### Verify

9. Confirm the retention row landed. Use `read_repo_file` to read
   `data/retention-log.md` (it lives outside `content/`, so
   `read_wiki_page` doesn't reach it) and check that the row you
   appended in step 5 is present. If it isn't, call
   `append_retention_entry` again with the same arguments — the tool
   is idempotent enough that a duplicate row is much less harmful than
   a missing one. If `read_repo_file` is not available in the current
   session, ask the user to confirm the retention entry landed before
   reporting completion.

10. Report what you created and updated.

A single source typically touches 5–15 pages. Take your time. Quality of
cross-references matters more than speed.

Do NOT modify any of the per-category `index.md` files in `reflect/`,
or `content/index.md` (the welcome page). The Reflect page listings
are rendered automatically by Quartz's `FolderContent` + `PageList`
components from each page's frontmatter — title, summary, dates, tags.
The index files contribute only the page title and intro paragraph
above the auto-generated table; their bodies stay empty. Putting a
markdown table in an index.md would duplicate the auto-rendered listing
and create drift between the two views.

### Capture (notes)

Trigger: user shares a thought, observation, or fragment they want
recorded — not a cataloging task.

Notes are first-class wiki pages, but they don't go through the
cataloging pipeline. There is no source document, no `views:` log, no
retention entry. A note is just a captured thought, filed under
`content/notes/` with a timestamp slug.

1. Decide whether the user wants a note or a wiki page. If the content
   is a thought, observation, or fragment — call it a note. If the
   content is a structured reference (a glossary, a how-to, a
   summary of a topic), it can still live in `content/notes/` but
   should be given a descriptive slug rather than a timestamp slug
   (e.g. `notes/graph-theory-glossary.md`).

2. For a fresh capture, POST to `/api/notes` with `{ title, tags,
   body }`. The endpoint generates the timestamp slug, writes the
   file, and returns the published URL. Don't write the file directly
   via the repo tools when the form-driven flow will do — let the
   endpoint handle the slug and frontmatter shape.

3. For a structured reference note, write the file directly under
   `content/notes/<descriptive-slug>.md` with full frontmatter and
   cross-references. Use the standard page frontmatter (`title`,
   `summary`, `created`, `subjects`, `tags`, etc.) — same shape as
   any other wiki page.

4. Cross-reference. Notes connect to other notes and to cataloged
   pages via `[[wikilinks]]` exactly as other pages do. If you create
   a note that connects to existing concepts or sources, link them.

### Query

Trigger: user asks a question about the wiki's domain.

1. Find candidate pages with `list_wiki_pages` (filter by prefix:
   `content/reflect/sources/`, `content/reflect/entities/`,
   `content/reflect/concepts/`, `content/reflect/synthesis/`,
   `content/notes/`).
2. Read the relevant pages with `read_wiki_page`.
3. Synthesize an answer with `[[wikilinks]]` to supporting pages.
4. If the answer is substantial and reusable, offer to file it as a new
   synthesis page or note. Good answers shouldn't disappear into chat
   history.

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

Suggest fixes. Ask before applying them.

## Per-category index format

Each `reflect/<category>/index.md` is intro-only — a title and a
one-paragraph description of what the category contains. The page
listing below the intro is rendered automatically by Quartz's
`FolderContent` + `PageList` components from page frontmatter (title,
summary, dates, tags). Do not put a markdown table in the body — the
auto-rendered table would duplicate it.

```markdown
---
title: "Sources"
---

Acquired documents and their cataloging status. Click a filename to
download the original.
```

The auto-rendered table includes Title, Summary, and Tags for every
category, plus a Date column on Sources and Synthesis. The Title column
is sortable alphabetically; the Date column (when present) is sortable
chronologically.

`content/index.md` is a hand-styled welcome page and should never be
turned into a catalog.

## Retention log format

`data/retention-log.md` is the chronological audit log of cataloging
operations. It's a markdown table read by the `/api/retention` endpoint
and rendered by the RetentionList component on `content/collect/retention.md`,
where titles can be inline-edited (the underlying filename is preserved).
The rendered page itself contains no table — only the data file does.
Always write to the data file, never to the rendered page.

```markdown
| Date | Action | Details |
|------|--------|---------|
| 2026-04-14 | Cataloged | 2026-04-14-source-title.png |
| 2026-04-15 | Re-viewed | 2026-04-14-source-title.png |
```

The raw `Date` column on disk is rendered as `Acquired` in the UI
table — same concept, named to align with the rest of the
cataloging-pipeline vocabulary. Don't rename the column header in
`retention-log.md`; only the UI display label changed.

Action values:
- `Cataloged` — first catalog of an acquisition
- `Re-viewed` — subsequent re-catalog (updates the source page in place)
- `Renamed` — title-only change via inline edit on the Retention page

## Terminology

The cataloging-pipeline and table-rendering vocabulary is pinned —
consistent naming makes the user's UX coherent across pages. When
adding or modifying a table-rendering component, use these words.
Don't drift back to older names (Document, File, Date) if you find
them in legacy code; fix them.

| Term | Meaning | Used on |
|------|---------|---------|
| **Source** | The filename of a thing being cataloged — whether queued, in-flight, or already cataloged. Multimodal: a PDF, an image, a YouTube transcript, a web page. The wiki's central noun. | Acquisition column header, Reflect → Sources second-table column header, Retention column header |
| **Acquired** | When a source entered the pipeline (its acquisition timestamp). | Acquisition column header, Reflect → Sources second-table column header, Retention column header (UI label; on-disk column stays `Date` for backward compatibility) |
| **Status** | The lifecycle state of a source on a pipeline-status table: `pending`, `in_progress`, `cataloged`, `failed`. | Acquisition column header, Reflect → Sources second-table column header |
| **Action** | The log-entry type on the Retention table: `Cataloged`, `Re-viewed`, `Renamed`. Distinct from Status (which is lifecycle state); Action is "what kind of log entry this is." | Retention column header |
| **Title** | The human-readable name of a wiki page (the `title:` frontmatter field). Distinct from Source: a source is a filename, a title is a page name. | Reflect main tables (Sources, Entities, Concepts, Synthesis), Retention table |
| **Cataloging** | The pipeline section header on the Acquisition page (was "Document Processing"). Names the process the table is showing. | Acquisition page header |

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
