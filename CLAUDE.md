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
    index.md            # Notes landing — links to add.md, update.md, entries/
    add.md              # Capture form — creates a new note
    update.md           # Notes list — every note as an expandable card with inline edit
    entries/            # The notes themselves (timestamp-slug files land here)
      index.md          # entries listing (auto-rendered)
      <slug>.md         # Individual notes (slug = YYYYMMDD-HHMMSS timestamp)
  journal/
    index.md            # Journal landing — links to add.md, update.md, entries/
    add.md              # Capture form — creates a new journal entry
    update.md           # Journal entries list with inline edit
    entries/            # The journal entries themselves
      index.md          # entries listing (auto-rendered)
      <slug>.md         # Individual entries (slug = YYYYMMDD-HHMMSS timestamp)
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
  visualize/
    graph.md            # Full-page graph view
    timeline.md         # Activity over time, by page type
    subjects.md         # Treemap of pages by controlled-vocabulary subject
    tags.md             # Tag cloud / tag co-occurrence view
    confidence.md       # Distribution of confidence levels across the wiki
  quiz/
    take.md             # Subject-filtered free-recall quiz session
  upskill/              # Self-directed study material — DATA-DRIVEN, see below
    index.md            # Section landing — hand-curated intro prose
    add.md              # Topic-create form (registers a new study area)
    update.md           # Topic-management form (Edit/Hide/Delete existing topics)
    topics.md           # Card-grid view of every topic in the wiki
    <topic>/
      index.md          # Topic landing page (auto-created by /api/upskill/topics)
      <slug>.md         # Individual study pages for the topic
data/                   # Machine-managed data outside the wiki
  retention-log.md      # The cataloging audit log
  upskill/              # Per-topic metadata driving the Upskill sidebar
    <topic>/
      meta.json         # Topic descriptor: slug, title, order, summary, hidden
static/originals/       # Immutable source documents — never modify these
docs/                   # Developer documentation (not served as wiki content)
  ui-conventions.md     # UI patterns, button family, table system — read before modifying components
  upskill-authoring.md  # How to author Upskill study pages — read before writing topic content
CLAUDE.md               # This file — read-only during operations
```

Quartz serves everything in `content/` as the browsable wiki. Files in `raw/`
are not published. `data/` is read by build-time emitters and runtime API
endpoints but is never served as wiki content.

### Sidebar structure

The sidebar is organized into four **zones** — non-clickable scaffolding
labels that group related sections. Each section under a zone is a
collapsible link list (chevron toggle, click-through heading), with
per-page auto-expand: the section containing the user's current page
opens by default, everything else stays collapsed.

```
DOING       — capture and curate raw inputs
  Search    — Wiki, Web
  Notes     — Add, Update
  Journal   — Add, Update
  Collect   — Selection, Acquisition, Retention

SEEING      — survey what's accumulated
  Reflect   — Sources, Entities, Concepts, Synthesis
  Visualize — Graph, Timeline, Subjects, Tags, Confidence

STUDYING    — build and test your own knowledge
  Upskill   — Add, Update, Topics, plus dynamic sub-links from data/upskill/
  Quiz      — Take

META        — the workshop itself
  Application — Help, Nuke It From Orbit
```

The zone labels (`DOING`, `SEEING`, etc.) are typography-only — small,
uppercase, muted-gray, non-clickable. The user navigates by clicking a
section heading (which goes to the section's index page) or by
expanding a section via its chevron.

**Why this grouping:**

- **Doing** is verbs — actions the user performs on the world (searching, capturing, collecting). These are the intake side of the wiki.
- **Seeing** is contemplation — surveying what's been gathered. Reflect organizes the corpus into typed pages; Visualize provides views over it.
- **Studying** pairs Upskill (the self-directed study material) with Quiz (testing what you've learned). Quiz used to sit alone as a peer of Visualize; moving it next to Upskill captures that they're both about building and verifying personal knowledge.
- **Meta** is the workshop itself — application-level controls that don't fit any of the content zones.

The flow reads: bring stuff in (Doing) → make sense of it (Seeing) → expand and verify your foundation (Studying) → maintain the workshop (Meta). Notes and Journal are top-level under Doing (peers of Search) rather than sub-pages of Collect because they're not part of the cataloging pipeline — they're first-class captures of the user's own thinking, not downstream of an acquisition.

**The Add / Update pattern.**

Three sections — Notes, Journal, and Upskill — share the same shape:
an **Add** route (a form for creating something new) and an **Update**
route (a list of what already exists, each row expandable for inline
edit). The pattern reads as verb → verb: "I want to write a new
thing" → Add; "I want to revise something I already wrote" → Update.
Upskill carries a third entry, **Topics**, the card-grid view of every
topic; Notes and Journal expose the equivalent "list everything"
surface as `entries/`, which is the actual folder of captured files.

**Section collapse behavior:**

Each section's open/closed state is computed per-page from the current
slug. A section is "open" if `fileData.slug === sectionSlug` or
`fileData.slug.startsWith(sectionSlug + "/")`. Everything else is
collapsed. No localStorage persistence — defaults derive fresh on every
navigation. User chevron clicks during a single page view are honored
until the next navigation.

The section's heading text is a real link to the section's index page
(e.g. `/notes`). The chevron beside the heading is the collapse toggle.
Two click targets, two meanings — direct navigation vs. show me what's
in it.

### Dynamic sections (Upskill)

Upskill is the wiki's first **dynamic section**: its sidebar sub-links
come from data files scanned at build time, and topics are created at
`/upskill/add` and edited / hidden / deleted at `/upskill/update`, not
by hand-editing JSON files.

**The two-file contract per topic.**

Every Upskill topic is represented on disk by *two files*, both of which
are managed automatically by the API. You should not normally write
either by hand.

```
data/upskill/<slug>/meta.json     # descriptor — drives sidebar
content/upskill/<slug>/index.md   # landing page — gets full Quartz pipeline
```

- `meta.json` is the source of truth for the sidebar:

  ```json
  {
    "slug": "git",
    "title": "Git",
    "order": 1,
    "summary": "Object model, refs, internals, history-rewriting safely."
  }
  ```

  - `slug` — must match the directory name. Authoritative source for
    the URL is the directory name; the field is informational.
  - `title` — display label in the sidebar.
  - `order` — ascending sort priority. Lower numbers come first.
    Topics without `order` sort to the end.
  - `summary` — short description, surfaced on the manage page.
  - `hidden: true` (optional) — exclude from the sidebar without
    deleting anything. Use to park a half-written topic.

- `content/upskill/<slug>/index.md` is a normal Quartz page. It gets
  breadcrumbs, dates, the `FolderContent` listing of any study pages
  under it, search indexing, etc. — all the standard wiki machinery,
  for free. The body is initialized to the topic's summary at create
  time; you can edit it later to add a longer intro for the topic.

**Topic management workflow:**

`/upskill/add` is the only correct way to create a new topic.
`/upskill/update` is the only correct way to edit, hide, or delete
existing topics. Both forms post to the same set of endpoints:

- `GET    /api/upskill/topics`         — list all topics
- `POST   /api/upskill/topics`         — create a new topic (writes both files atomically)
- `GET    /api/upskill/topics/:slug`   — read one topic's meta.json
- `PUT    /api/upskill/topics/:slug`   — update meta.json (title, order, summary, hidden)
- `DELETE /api/upskill/topics/:slug`   — remove meta.json AND content/upskill/:slug/index.md

The create endpoint uses GitHub's Git Data API to commit both files in
a single atomic commit, so there's no window where the sidebar entry
exists without a landing page or vice versa.

**Adding a study page to a topic:**

Once a topic exists, drop study pages at `content/upskill/<topic>/<slug>.md`
as normal wiki pages with full frontmatter. They go through the
standard Quartz pipeline and auto-list on the topic's landing page via
`FolderContent`. No API call needed.

**Authoring the study pages themselves** — page structure, the
concept-page frontmatter shape, the landing-page link pattern, and how
to embed drawn inline-SVG examples in the site's dark-only palette —
follows a separate playbook documented in
**[docs/upskill-authoring.md](docs/upskill-authoring.md)**. Read it
before writing a topic's study pages; it exists specifically so that
authoring a topic from scratch is fast instead of a from-first-
principles rediscovery. This section covers WHERE study pages live and
how topics are managed; the playbook covers HOW to write good ones.

**When to write to the data files directly:**

Almost never. The API enforces invariants (slug validity, file pairing,
atomic commits) that direct edits skip. Hand-edit only if the API is
broken or you're recovering from a partial commit; if you do, write both
`data/upskill/<slug>/meta.json` and `content/upskill/<slug>/index.md`
together to keep them in sync.

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

The form on `/notes/add` writes notes with this shape. The slug is
the timestamp itself in `YYYYMMDD-HHMMSS` form, so notes sort
chronologically by filename without any frontmatter inspection.

Journal entries (under `content/journal/`) follow the same shape as
notes — same form-driven capture, same timestamp slug pattern. The two
are kept separate by directory so they list and browse independently,
but their frontmatter contract is identical.

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
- Note pages: `notes/entries/YYYYMMDD-HHMMSS.md` (timestamp slug,
  generated automatically by the form). Notes can also be given
  descriptive slugs for hand-written reference notes — the
  `notes/graph-theory-glossary.md` page is an example.
- Journal entries: `journal/entries/YYYYMMDD-HHMMSS.md`. Same
  convention as notes.
- Upskill study pages: `upskill/<topic>/<slug>.md` where `<topic>`
  matches a `data/upskill/<topic>/` directory and `<slug>` is a
  descriptive kebab-case name (e.g. `upskill/git/object-model.md`).
  The `index.md` slug is reserved — it's the topic landing page,
  managed by the API.

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

**Upskill exception.** Study pages under `content/upskill/<topic>/` use
the **topic slug** as their single subject (`web-styling`,
`ui-elements`). For self-study material the useful grouping axis is the
topic itself, so this intentionally departs from the
bias-toward-broad-vocabulary rule above. See
[docs/upskill-authoring.md](docs/upskill-authoring.md).

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
`content/notes/entries/` with a timestamp slug.

1. Decide whether the user wants a note or a wiki page. If the content
   is a thought, observation, or fragment — call it a note. If the
   content is a structured reference (a glossary, a how-to, a
   summary of a topic), it can still live in `content/notes/` but
   should be given a descriptive slug rather than a timestamp slug
   (e.g. `notes/graph-theory-glossary.md`).

2. For a fresh capture, POST to `/api/notes` with `{ title, tags,
   body }`. The endpoint generates the timestamp slug, writes the
   file under `content/notes/entries/`, and returns the published URL.
   Don't write the file directly via the repo tools when the
   form-driven flow (`/notes/add`) will do — let the endpoint handle
   the slug and frontmatter shape.

3. For a structured reference note, write the file directly under
   `content/notes/<descriptive-slug>.md` with full frontmatter and
   cross-references. Use the standard page frontmatter (`title`,
   `summary`, `created`, `subjects`, `tags`, etc.) — same shape as
   any other wiki page.

4. Cross-reference. Notes connect to other notes and to cataloged
   pages via `[[wikilinks]]` exactly as other pages do. If you create
   a note that connects to existing concepts or sources, link them.

Journal entries follow the same workflow, against `/api/journal` and
`content/journal/entries/`. Use journal for longer, more reflective
passages where note-style fragments feel too short; both share the
same timestamp-slug shape so they sort the same way. The form-driven
flow is `/journal/add`; the inline-edit list is `/journal/update`.

### Upskill (topic management)

Trigger: user wants to add a new study area, hide an existing one,
rename it, or delete it.

Direct the user to the right form for the operation: `/upskill/add`
for creating a new topic, `/upskill/update` for editing, hiding, or
removing an existing one. Both forms talk to `/api/upskill/topics`
and keep the two-file contract (meta.json + content/upskill/<slug>/index.md)
consistent.

Don't hand-write to `data/upskill/<slug>/meta.json` or to
`content/upskill/<slug>/index.md` unless the API is broken and you're
recovering from a partial commit. If you do need to write directly,
update both files in a single multi-file commit so they stay paired.

Adding study material to an existing topic does NOT go through
`/api/upskill/topics`. Write the study page directly at
`content/upskill/<topic>/<slug>.md` with full wiki frontmatter; it
appears on the topic's landing page automatically. Before writing those
pages, read **[docs/upskill-authoring.md](docs/upskill-authoring.md)** —
the canonical playbook for study-page structure, frontmatter, the
landing-page link pattern, and how to embed drawn inline-SVG examples.

### Query

Trigger: user asks a question about the wiki's domain.

1. Find candidate pages with `list_wiki_pages` (filter by prefix:
   `content/reflect/sources/`, `content/reflect/entities/`,
   `content/reflect/concepts/`, `content/reflect/synthesis/`,
   `content/notes/`, `content/journal/`).
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
| **Status** | The lifecycle state of a source on a pipeline-status table: `pending`, `in_progress`, `cataloged`, `failed`. Also the Retention column showing log-entry type. | Acquisition column header, Retention column header, Reflect → Sources second-table column header |
| **Title** | The human-readable name of a wiki page (the `title:` frontmatter field). Distinct from Source: a source is a filename, a title is a page name. On the Entities table, this column is labeled "Name" instead, because entities have names, not titles. | Reflect tables (Sources, Concepts, Synthesis use "Title"; Entities uses "Name"), Retention table |
| **Cataloging** | The pipeline section header on the Acquisition page (was "Document Processing"). Names the process the table is showing. | Acquisition page header |
| **Topic** | A study area under Upskill. Backed by a `data/upskill/<slug>/meta.json` descriptor AND a `content/upskill/<slug>/index.md` landing page, both managed atomically via `/api/upskill/topics`. | Upskill sidebar group, Upskill landing pages |

## UI and code conventions

This file covers WHAT the wiki contains. Modifying HOW the wiki
displays its contents — components, stylesheets, button styles, table
layouts — follows a separate set of conventions documented in
**[docs/ui-conventions.md](docs/ui-conventions.md)**. Read that file
before changing anything under `quartz/components/` or
`quartz/styles/`.

Authoring Upskill study-page *content* (not components) follows its own
playbook in **[docs/upskill-authoring.md](docs/upskill-authoring.md)** —
study-page structure, frontmatter, cross-linking, and the inline-SVG
example pattern in the dark-only palette.

The most-important invariants, stated inline so you can't miss them:

1. **Buttons use `.jb-btn`.** The wiki has exactly one button look
   (brass background, dark-green text, rounded pill). The only
   modifier in active use is `.jb-btn-sm` for compact contexts
   (inline row actions, toolbars). Don't create new bespoke button
   styles — extend the family in `custom.scss` if a new variant is
   genuinely needed.

2. **Data tables use `.jb-table`.** Wrap with `<div class="table-container jb-table">`.
   The class gives you the yellow-header dark-green-band styling,
   horizontal rules only, fixed table layout, and centered headers.

3. **Anchor column styles on classes, not positions.** Use `.col-date`
   for date columns (centers content), `.col-status` for status
   columns (centers content), and component-scoped classes
   (`queue-document-cell`, etc.) for everything else. Positional
   selectors (`nth-child(3)`) break silently when columns are
   reordered.

4. **Popovers are disabled on touch devices.** The media query
   `(hover: none) and (pointer: coarse)` in `popover.scss` catches
   iPad, tablets, and phones regardless of viewport width. Don't
   re-enable popovers there without a JS-based dismissal mechanism.

5. **Dates always include the day.** "March 6, 2026", not "March
   2026". Applies to document covers, wiki content, and component-
   rendered cells.

When introducing a new UI pattern that doesn't fit an existing
convention, update `docs/ui-conventions.md` in the same commit. The
detail doc is the canonical reference; this section is just the
short pointer.

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
