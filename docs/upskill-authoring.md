---
title: "Authoring Upskill study pages"
---

# Authoring Upskill study pages

This is the playbook for **writing the study pages inside an Upskill topic** —
the concept pages and the topic landing page, their structure, frontmatter,
cross-linking, and the drawn inline-SVG examples some topics carry.

It is deliberately separate from the root `CLAUDE.md`. `CLAUDE.md` covers
*topic management* — the `data/upskill/<slug>/meta.json` + `content/upskill/<slug>/index.md`
two-file contract and the `/api/upskill/topics` CRUD endpoints, i.e. WHERE study
pages live and how a topic is created/hidden/deleted. This file covers HOW to
write good study pages once a topic exists.

It exists because authoring a topic from scratch the first time meant
rediscovering the palette, the SVG conventions, the fact that Quartz renders
raw inline SVG, and the page structure all over again — slow. Read this first
and it's fast.

---

## TL;DR — the fast path

1. **Confirm the topic is registered.** Check `data/upskill/<slug>/meta.json`
   exists (`repo_list_directory data/upskill`). If not, create the topic via
   `/upskill/add` (or the API) — see `CLAUDE.md`. Do **not** hand-write
   `meta.json`. The topic may already be pre-registered with a `summary` that
   promises a particular shape (e.g. ui-elements' meta promised "a drawn
   example of each") — honor it.
2. **Load the wiki tools.** The Jack's Brain `wiki_push_page` / `wiki_push_pages`
   tools are **deferred** — they are not preloaded. Run `tool_search` for
   "wiki push page" first, or the call will fail. For any StewART-Identity
   repo, use the **Jack's Brain MCP**, never the GitHub MCP server.
3. **Plan the page set.** One landing `index.md` plus N concept pages, one per
   coherent sub-topic. Decide the split before writing so cross-links resolve.
4. **Write the landing `index.md`** — `cssclasses: [hide-folder-listing]`, an
   intro paragraph, then a hand-rolled bulleted list of `[[wikilink|Label]]`
   entries, each with a short `— what it covers` tail. (See below.)
5. **Write each concept page** — `type: concept` frontmatter with
   `subjects: [<topic-slug>]`, intro framing the *why*, `##` sections with bold
   **term** definitions, a closing mental-model paragraph, and `[[wikilinks]]`
   to siblings and related topics.
6. **Add drawn examples only if the topic is visual** — inline SVG in the
   dark-only palette below. Text-only topics (e.g. web-styling) carry no images
   and that's correct; don't force them.
7. **Push.** `wiki_push_page` per page, or `wiki_push_pages` for one atomic
   commit. Both commit straight to `main` → Cloudflare Pages rebuilds.
8. **If something doesn't render, suspect browser cache first** (hard refresh).
   The site is dark-only; see gotchas below.

---

## Where study pages live

```
data/upskill/<slug>/meta.json      # descriptor — drives the sidebar (API-managed)
content/upskill/<slug>/index.md    # topic landing page
content/upskill/<slug>/<page>.md   # one study page per sub-topic
```

Study pages are ordinary Quartz wiki pages. Drop them at
`content/upskill/<slug>/<page>.md` with full frontmatter and they go through the
standard pipeline — breadcrumbs, dates, search indexing — and auto-list on the
landing page via `FolderContent`. **No API call is needed to add a study page**;
the API is only for creating/editing/deleting the *topic* itself.

Filenames are lowercase kebab-case (`form-controls.md`, not `Form Controls.md`).
The `index.md` slug is reserved for the landing page.

---

## The landing page (`index.md`)

The topic-create API initializes `index.md` to the topic's summary. Enrich it
into a real landing page. Observed, working shape (from `web-styling` and
`ui-elements`):

```markdown
---
title: "UI Elements"
created: 2026-05-29T20:00:00.000Z
modified: 2026-05-29T20:00:00.000Z
cssclasses: [hide-folder-listing]
tags: []
---

One or two paragraphs framing the topic and why the vocabulary matters.

## The six families

- [[upskill/ui-elements/buttons|Buttons & actions]] — the things you click to *do* something.
- [[upskill/ui-elements/form-controls|Form controls]] — where the user types or chooses.
- ...

## How to use this

A short note on how to read the topic.
```

Key points:

- **`cssclasses: [hide-folder-listing]`** suppresses the automatic
  `FolderContent` file listing so you can hand-roll a curated, described list
  instead of a bare filename dump. If you omit it, you get the auto-listing —
  fine for a rough topic, but the curated list reads far better.
- Landing-page frontmatter is light: `title`, `created`/`modified` as **ISO
  datetimes** (not date-only), `cssclasses`, `tags`. No `summary`/`type` needed
  here — those belong on the concept pages.
- Each link gets a one-line `— description` tail. Link out to related topics
  too (ui-elements' landing links to `[[upskill/web-styling/index|CSS]]`).

---

## Study (concept) pages — frontmatter

Every study page uses `type: concept` and the standard wiki frontmatter:

```yaml
---
title: "Form controls"
summary: "Where the user types or chooses — fields, checkboxes, radios, toggles, selects, sliders, and their labels and states."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements          # the topic slug — clusters the page under its topic
tags:
  - ui
  - form
  - input
  - checkbox             # liberal, kebab-case (see CLAUDE.md § subjects vs tags)
confidence: high
sources: []              # empty is fine for pages built from general knowledge
---
```

- **`subjects: [<topic-slug>]`** — the convention for Upskill study pages is to
  use the topic slug as the single subject (`web-styling`, `ui-elements`). This
  clusters the topic's pages together in subject-based views. This is a
  pragmatic exception to the "bias toward a broad controlled vocabulary"
  guidance in `CLAUDE.md` — for self-study material, grouping by topic is the
  useful axis.
- **`created`/`updated`** are **date-only** (`YYYY-MM-DD`) on concept pages —
  unlike the landing page's ISO datetimes.
- **`summary`** should be informative on its own (it can run a full sentence;
  the live corpus is not strict about the ≤140 char target). It surfaces in
  listings.
- **`tags`** liberal, **`confidence: high`** for material you're confident in,
  **`sources: []`** when not drawn from a cataloged source.

---

## Study pages — body structure

The house style for a concept page (consistent across web-styling and
ui-elements):

1. **Intro paragraph** that frames the *why* — what problem this family of
   things solves, what axis distinguishes its members. Not a definition dump;
   a mental model.
2. **`##` sections**, one per sub-idea. Within them, define each term in
   **bold** at first use (`A **drawer** is…`). Prose, not bullet lists, for
   explanation; bullets are fine for enumerating discrete variants.
3. **A closing paragraph** — "## Why this matters" or a one-paragraph recap
   that ties the family together into a single takeaway.
4. **Cross-links throughout** (next section).

Keep the voice explanatory and concrete. Jack is upskilling in frontend/UX, so
frontend pages should explain decisions in a bit more depth; lean into the
"when would you actually reach for this" framing.

---

## Cross-linking

Every new page links to **at least two** existing pages (a hard rule from
`CLAUDE.md`). For Upskill specifically:

- Link **siblings** within the topic (`[[upskill/ui-elements/feedback|badge]]`)
  whenever one page mentions a thing another page owns.
- Link **out to related topics** (`[[upskill/web-styling/index|CSS]]`).
- Wikilink format is path-based with an optional label:
  `[[upskill/<topic>/<slug>|Display text]]`. Quartz resolves it.
- The landing page links down to every concept page; concept pages link back up
  to the landing (`[[upskill/<topic>/index|...overview]]`) and sideways to
  siblings.

---

## Drawn examples: inline SVG

Some topics are inherently visual (UI elements, diagrams, layout). For those,
each concept gets a **drawn example** so the word attaches to a picture. These
are hand-authored inline `<svg>` blocks embedded directly in the markdown — no
external image files, no hosting, no copyright or broken-link risk, and they
render in the site's own colors.

### Why raw SVG works in this wiki

Quartz is configured to pass raw HTML/SVG through the markdown pipeline:
`quartz/processors/parse.ts` enables `remarkRehype` with
`allowDangerousHtml: true`, and `quartz/plugins/transformers/ofm.ts` runs
`rehypeRaw` first in its `htmlPlugins()`. So an `<svg>…</svg>` block written
directly in a `.md` file renders as-is. **Put a blank line before and after the
SVG block** so the parser treats it as a raw HTML block, not inline text.

### When to draw

Draw when the subject is visual and a sketch makes the term click. Do **not**
force images onto text topics — web-styling (box model, flexbox, specificity)
carries none, and that's the right call. A drawing should be a *schematic of the
pattern*, not a pixel-perfect mockup.

### The dark-only palette

The site is **dark-only** (no light mode — the Darkmode component is removed,
`saved-theme="dark"` is never set, `custom.scss` ships dark values as `:root`
defaults). SVGs therefore **hardcode hex colors** from the dark theme. This is a
deliberate tradeoff: inline-SVG-in-markdown can't reliably pull CSS custom
properties through the pipeline, and since there's only one theme, hardcoding is
predictable. If the theme ever changes, these SVGs must be updated by hand.

The palette these pages use (matches the rendered dark theme):

| Role | Hex |
|------|-----|
| Page background | `#0F2418` |
| Surface | `#15301E` |
| Elevated surface | `#1A3A26` |
| Panel stroke / divider | `#2E5C40` |
| Input border | `#3C6B4E` |
| Body text | `#E3E0DB` |
| Heading / cream | `#F0DDB3` |
| Muted green text | `#7BBF95` |
| Dimmer green | `#5E866E` |
| Gold accent / primary | `#D4AD5A` (use `#0F2418` for text *on* gold) |
| Disabled fill / track | `#213A2B` |
| Destructive red fill | `#B5524A` |
| Destructive red stroke / error | `#C9685E` |

Semantic alert tints (fill on background):

| Severity | Accent | Tinted background |
|----------|--------|-------------------|
| Info | `#5B8AA6` | `#16303A` |
| Success | `#4FAE6F` | `#163A28` |
| Warning | `#D4AD5A` | `#3A3320` |
| Error | `#C9685E` | `#3A2120` |

### SVG conventions

Every embedded SVG follows this shape:

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 160" role="img"
     aria-label="Plain-language description of what the drawing shows"
     style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <!-- shapes, using the palette hexes above -->
</svg>
```

Rules:

- **`xmlns`** is required (it's a standalone SVG, not JSX).
- **`role="img"` + `aria-label`** on every drawing — these are content, so they
  need an accessible description.
- **`style`** pins `width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0`
  so the drawing scales down on mobile but never balloons on desktop. `560` is
  the working canvas width; set `viewBox` height to fit the content.
- **`font-family`** inside the SVG is `'Source Sans Pro',system-ui,sans-serif`
  to match the site body font.
- Label parts of the drawing with small muted-green (`#7BBF95`) captions so the
  picture is self-explanatory.
- Interleave drawings with prose: introduce the term, show the drawing, then
  explain. One drawing per concept cluster; don't stack multiple SVGs with no
  prose between them.

---

## Tooling notes

- **Deferred tools.** `wiki_push_page`, `wiki_push_pages`, and the other Jack's
  Brain tools are not preloaded into context. Call `tool_search` (e.g. "wiki
  push page") to load their schemas before first use, or the call errors.
- **Right MCP.** For StewART-Identity repos (jacks-brain included) use the
  **Jack's Brain MCP**, not the GitHub MCP server.
- **Push granularity.** `wiki_push_page` = one page, one commit. `wiki_push_pages`
  = many pages, one atomic commit — use it when filing a whole topic at once so
  the landing page and its concept pages land together.
- **Path rule.** Wiki tools require paths under `content/`. Files outside
  `content/` (like this doc) go through `repo_push_file` / `repo_push_files`,
  which conversely refuse `content/`.

---

## Rendering & cache gotchas

- **Suspect browser cache first** when a change doesn't appear — especially CSS
  or SVG. Hard refresh before debugging anything deeper. (Don't go fingerprint
  CSS; it's almost always cache.)
- **jacks-brain is behind Cloudflare Access** and dark-only. Inspect deployed
  source via the Jack's Brain MCP rather than trying to fetch the live site.
- Commits to `main` trigger a Cloudflare Pages rebuild; give it a moment before
  concluding something didn't take.

---

## Worked example

The **ui-elements** topic is the reference implementation of everything above:
one curated landing page plus six concept pages (buttons, form-controls,
navigation, containers, feedback, data-display), each with hand-drawn inline-SVG
examples in the dark palette. Read those pages under
`content/upskill/ui-elements/` when you want a concrete model to match.

The **web-styling** topic is the reference for a *text-only* topic — same
landing-page and concept-page structure, no drawings. Use it as the model when
the subject isn't visual.

---

## See also

- **`CLAUDE.md`** § "Dynamic sections (Upskill)" and § "Upskill (topic
  management)" — topic creation, the meta.json contract, the API endpoints.
- **`CLAUDE.md`** § "Subjects vs. tags" — the classification contract these
  pages follow (with the topic-slug-as-subject exception noted above).
- **`docs/ui-conventions.md`** — for changing how the wiki *displays* content
  (components, button family, table system). Different concern from authoring
  study-page content.
