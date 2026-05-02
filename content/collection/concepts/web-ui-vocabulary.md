---
title: "Web UI Vocabulary"
summary: "Standard HTML/UX terminology for describing web interface elements — from page anatomy (sidebar, content column) to form controls, buttons, and spacing."
type: concept
created: 2026-05-01
updated: 2026-05-01
subjects:
  - web-development
tags:
  - ui-vocabulary
  - ux
  - html
  - design-language
  - sidebar
  - card
  - form-controls
  - layout
  - frontend
  - technical-communication
sources:
  - "[[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
confidence: high
---

Standard vocabulary for describing the visual and structural elements of web interfaces. These terms are drawn from established HTML and UX conventions — not invented — and are the words that designers and developers use across the industry. Sourced from the [[collection/entities/iam-toolbox]] team's internal reference document; see [[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]] for the full annotated version with screenshots.

The underlying principle: most communication failures in interface design are not about taste — they are about not having a shared word for what both people are looking at. Adopting this vocabulary closes that gap. The same precision discipline applies here as in any technical writing: identify the smallest unit at fault, name it correctly, describe what should change.

## Page Anatomy

The page-level skeleton shared by virtually any web application:

| Term | Meaning |
|------|---------|
| Viewport | The browser window itself |
| Sidebar | Vertical navigation column (typically left); a page can have one, two, or none |
| Content column | Central area for main page content; also: main area, primary content |
| Footer | Bottom strip containing copyright, attribution, or supplementary navigation |
| Gutter | Empty space between columns or outer margins |
| Hero | Large visual at the top of a page intended to set tone or identity |

### Sidebar Parts

| Term | Meaning |
|------|---------|
| Masthead | Top of the sidebar; displays branding (application name or logo) |
| Nav section | Grouped links under a section heading |
| Section heading | Bold label opening a nav section |
| Nav link | A single clickable row inside a nav section |
| Section divider | Horizontal line visually separating nav sections |

### Content Column Parts

| Term | Meaning |
|------|---------|
| Breadcrumb | Hierarchical position trail — e.g., "Home › Learn › Research" |
| Page title | The main heading (H1 in HTML) |
| Metadata | Descriptive line beneath the title (date, tags, reading time); also: byline, post meta |
| Body | Everything below the title: prose, tables, images, embedded interactive elements |

## Components

Named composite elements assembled from simpler controls:

| Term | Meaning |
|------|---------|
| Card | Bordered, rounded container grouping related content or controls |
| Card heading | H3 at the top of a card; also: section label |
| Dropzone | Dashed-border drop target accepting file drops, paste events, and click-to-browse |
| Input row | Horizontal arrangement of an input and a button; input flexes, button is fixed-width |

## Form Controls

"Field" is acceptable casual shorthand when type doesn't matter; use the specific term when it does.

| Term | Meaning |
|------|---------|
| Text input | Single-line text entry (names, titles, URLs) |
| Textarea | Multi-line text entry (paragraphs, code, prose) |
| Number input | Numeric entry with spinner buttons; also: spinner, stepper |
| Dropdown / select | Clickable control revealing mutually-exclusive options |
| Checkbox | Square toggle for boolean values |
| Toggle switch | Pill-shaped boolean slider; same data as checkbox, different animation |
| Radio button | Circular selector, one of a mutually-exclusive group |
| Label | Text describing an input; should sit visually adjacent to its control |

## Buttons, Badges, and Tables

| Term | Meaning |
|------|---------|
| Primary button | Filled, high-prominence; reserved for the main card or form action |
| Secondary button | Less-prominent (outlined or text-only); for supporting or cancel actions |
| Icon button | Small square button containing only an icon; for auxiliary actions |
| Badge | Small rounded status tag (e.g., "CATALOGED"); also: pill (when decorative) |
| Callout | Boxed aside standing out from surrounding flow; for warnings, tips, notes |
| Table | Tabular layout: `<th>` header cells, `<tr>`/`<td>` body cells |

## Spacing and Positioning

| Term | Meaning |
|------|---------|
| Max-width | Maximum container width on large screens; establishes comfortable reading width |
| Breakpoint | Screen width at which layout changes (e.g., sidebar collapses to hamburger menu) |
| Padding | Space inside a container, between its border and content |
| Margin | Space outside a container, between it and its neighbors |
| Gap | Spacing between siblings inside a flex or grid layout |

## Practical Application

Precise vocabulary converts vague feedback into actionable instructions:

> *Vague:* "The thing with the file stuff feels too tight."
> *Precise:* "The textarea inside the Paste Text card needs more vertical padding, and the dropzone above it could be shorter to give the page better rhythm."

This vocabulary applies across the [[collection/entities/iam-toolbox]], the UNT Directory App, and any other web interfaces the IAM team builds or reviews. See [[collection/synthesis/iam-team-application-portfolio]] for the broader context of the team's web application work.
