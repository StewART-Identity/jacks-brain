---
title: "Web Interface Vocabulary"
summary: "Standard UX/HTML terms for naming web UI regions, components, controls, and spacing — enabling precise design and engineering communication."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - ui
  - ux
  - web-development
  - frontend
  - design-language
  - communication
sources:
  - "[[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
confidence: high
---

Web interface vocabulary is the set of standard terms designers and engineers use to name the regions, components, controls, and spacing of a web page. The terms come from established HTML and UX conventions — not invented — meaning adoption is convergence on existing industry language, not the creation of a proprietary dialect.

The core insight: most communication failures in interface design are not about judgment or taste. They are about lacking a shared word for the thing in front of both people. Naming things closes the gap.

## Page Anatomy

A typical web application page is built from named regions:

- **Viewport** — the browser window itself
- **Sidebar** — a vertical navigation column, typically on the left
- **Content column** — the main article or page content area (also: main area, primary content)
- **Footer** — the bottom strip (copyright, attribution, supplementary navigation)
- **Gutter** — outer margins and between-column whitespace
- **Hero** — a large visual at the top setting tone or identity

### Sidebar Decomposition

The sidebar is further broken down into: **masthead** (branding at top), **nav sections** (grouped link sets under headings), **section headings** (bold labels), **nav links** (individual clickable rows), and **section dividers** (horizontal separators between groups).

### Content Column Decomposition

The content column contains: **breadcrumb** (hierarchical position trail), **page title** (H1), **metadata** (byline: date, tags, reading time), and **body** (all content below the title).

## Components

Named composite UI elements assembled from simpler controls:

- **Card** — a bordered, rounded container grouping related content or controls
- **Card heading** — the H3 label at the top of a card (also: section label)
- **Dropzone** — a dashed-border file drop target accepting file drops, paste events, and click-to-browse; distinct from a text input
- **Input row** — a horizontal input + button pair where the input flex-fills available space and the button is fixed-width

## Form Controls

Use the specific term when type matters. "Field" is acceptable casual shorthand when it does not.

| Control | Description |
|---------|-------------|
| Text input | Single-line text entry; used for names, titles, URLs |
| Textarea | Multi-line text entry; used for paragraphs, code, longer prose |
| Number input | Numeric entry with up/down spinner; also "spinner" or "stepper" |
| Dropdown / select | Reveals a list of mutually-exclusive options |
| Checkbox | Square boolean toggle (checked or unchecked) |
| Toggle switch | Pill-shaped boolean slider; same data as checkbox, distinct styling and animation |
| Radio button | Circular selector; one of a mutually-exclusive group |
| Label | Adjacent descriptive text for an input |

## Buttons and Status Elements

| Element | Description |
|---------|-------------|
| Primary button | Filled, high-prominence; reserved for the main card or form action |
| Secondary button | Outlined or text-only; for supporting actions (Cancel, Reset) |
| Icon button | Icon-only, small square; suited to auxiliary actions |
| Badge | Small rounded status tag ("CATALOGED," "IN PROGRESS"); also "pill" when purely decorative |
| Callout | Boxed aside standing out from surrounding flow; used for warnings, tips, notes |
| Table | Standard tabular layout: header row with `<th>` cells, body rows with `<td>` cells |

## Spacing and Sizing

- **Padding** — space inside a container, between its border and its content
- **Margin** — space outside a container, between it and its neighbors
- **Gap** — spacing between siblings in a flex or grid layout (e.g., between stacked cards)
- **Max-width** — maximum container width on large screens; defines a comfortable reading width
- **Breakpoint** — screen width at which layout changes (e.g., sidebar collapses to hamburger menu below 800px)

## Application in IAM Projects

This vocabulary is applied across the [[collection/entities/iam-toolbox|IAM Toolbox]], UNT Directory App, and DSTools Azure replacement. It was formalized by [[collection/entities/jack-stewart|Jack Stewart]] in the [[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary and Conventions for Web Interfaces]] reference document.

See [[collection/synthesis/iam-team-frontend-communication|IAM Team Frontend Communication]] for analysis of how shared vocabulary improves design and engineering collaboration. For the normative complement — *how* these controls must behave — see [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]] and [[collection/synthesis/web-form-design-principles|Web Form Design Principles]].
