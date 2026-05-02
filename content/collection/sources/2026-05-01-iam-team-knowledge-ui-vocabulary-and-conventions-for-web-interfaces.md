---
title: "IAM Team Knowledge: UI Vocabulary and Conventions for Web Interfaces"
summary: "Reference guide establishing shared HTML/UX terminology for the IAM team's React web applications — from page anatomy to form controls and spacing."
type: source
created: 2026-05-01
updated: 2026-05-01
subjects:
  - web-development
tags:
  - ui-vocabulary
  - ux
  - frontend
  - react
  - typescript
  - iam-toolbox
  - design-language
  - sidebar
  - card
  - dropzone
  - internal-tooling
  - technical-communication
  - html
sources: []
confidence: high
role: reference
views:
  - date: 2026-05-01
    note: "Initial cataloging."
---

Reference document by [[collection/entities/jack-stewart]] establishing shared UI vocabulary for the IAM team's web application portfolio. [Download original](/api/originals/2026-04-25-IAM_Team_Knowledge-UI_Vocabulary_and_Conventions_for_Web_Interfaces.docx)

*Introduces the subject `web-development` — no existing wiki subject covered frontend and web interface design as a domain separate from identity management.*

## Purpose

Imprecise vocabulary about UI elements creates rework: a designer says "button," an engineer hears one of five things, and the implementation drifts from intent. This document gives the IAM team at [[collection/entities/university-of-north-texas]] a shared vocabulary grounded in standard HTML and UX terminology already settled by the industry. The vocabulary was assembled while annotating the knowledge wiki (which shares layout patterns with the IAM team's apps), then generalized for use across [[collection/entities/iam-toolbox]], the UNT Directory App, and the DSTools Azure replacement.

## Page-Level Anatomy

The page skeleton shared by virtually any web application:

- **Viewport** — the browser window itself
- **Sidebar** — vertical navigation column, typically on the left; a page may have one, two, or none
- **Content column** — central area for main content; also called main area or primary content
- **Footer** — bottom strip (copyright, attribution, supplementary navigation)
- **Gutter** — empty space between columns or outer margins
- **Hero** — large top-of-page visual intended to set tone or identity

### Sidebar Parts

From top to bottom: masthead, nav sections, nav links, section dividers.

- **Masthead** — branding area at the top of the sidebar (application name or logo)
- **Nav section** — a grouped set of links under a section heading
- **Section heading** — the bold label opening each nav section
- **Nav link** — a single clickable row inside a section
- **Section divider** — horizontal line visually separating nav sections

### Content Column Parts

- **Breadcrumb** — hierarchical position trail (e.g., "Home › Learn › Research")
- **Page title** — the main heading; an H1 in HTML
- **Metadata** — descriptive line beneath the title (date, tags, reading time; also: byline, post meta)
- **Body** — everything below the title: prose, tables, images, embedded interactive elements

## Components and Composite UI

- **Card** — bordered, rounded container grouping related content or controls; [[collection/entities/iam-toolbox]] uses cards for most of its forms
- **Card heading** — the H3 at the top of a card; also called a section label
- **Dropzone** — dashed-border drop target accepting file drops, paste events, and click-to-browse; distinct from a text input
- **Input row** — horizontal arrangement of an input and a button, with the input flexing to fill space

## Form Controls

"Field" is acceptable casual shorthand when type doesn't matter; use the specific term when it does.

| Term | Definition |
|------|------------|
| Text input | Single-line text entry (names, titles, URLs) |
| Textarea | Multi-line text entry (paragraphs, code blocks, prose) |
| Number input | Numeric entry with spinner buttons; also called spinner or stepper |
| Dropdown / select | Clickable control revealing mutually-exclusive options |
| Checkbox | Square toggle for boolean values |
| Toggle switch | Pill-shaped boolean slider; same data as checkbox, distinct styling |
| Radio button | Circular selector, one of a mutually-exclusive group |
| Label | Text describing an input's purpose; should sit visually adjacent to its control |

## Buttons, Badges, and Tables

| Term | Definition |
|------|------------|
| Primary button | Filled, high-prominence; reserved for the main card or form action |
| Secondary button | Less-prominent (outlined or text-only); for supporting or cancel actions |
| Icon button | Small square button containing only an icon; suited to auxiliary actions |
| Badge | Small rounded status tag (e.g., "CATALOGED"); also called pill when decorative |
| Callout | Boxed aside standing out from surrounding flow; for warnings, tips, notes |
| Table | Tabular layout with `<th>` header cells and `<tr>`/`<td>` body cells |

## Spacing and Positioning

| Term | Definition |
|------|------------|
| Max-width | Maximum container width on large screens; establishes comfortable reading width |
| Breakpoint | Screen width at which layout changes (e.g., sidebar collapses to hamburger menu) |
| Padding | Space inside a container, between its border and content |
| Margin | Space outside a container, between it and its neighbors |
| Gap | Spacing between siblings inside a flex or grid layout |

## Underlying Principle

Most interface communication failures are not about taste — they are about not having a shared word for what both people are looking at. Adopting standard vocabulary closes that gap without requiring the team to invent its own language. See [[collection/concepts/web-ui-vocabulary]] for a structured reference to these terms, and [[collection/synthesis/iam-team-application-portfolio]] for how this document fits into the IAM team's broader engineering work.
