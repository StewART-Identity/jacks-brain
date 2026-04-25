---
title: "UI Vocabulary and Conventions for Web Interfaces"
summary: "Reference guide establishing shared vocabulary for web UI elements — from page anatomy to form controls — for the IAM team."
type: source
created: 2026-04-25
updated: 2026-04-25
tags:
  - ui
  - ux
  - web-development
  - frontend
  - react
  - design-language
  - iam
sources: []
confidence: high
role: reference
views:
  - date: 2026-04-25
    note: "Initial cataloging."
---

Authored by [[collection/entities/jack-stewart|Jack Stewart]], IAM Engineer, April 25, 2026. A shared vocabulary reference for the IAM team, grounding design and engineering discussions in standard HTML and UX terminology.

[Download original](/originals/2026-04-25-IAM_Team_Knowledge-UI_Vocabulary_and_Conventions_for_Web_Interfaces.docx)

## Purpose

This document gives the IAM team a shared vocabulary for describing visual and structural elements of web interfaces. Precise vocabulary converts vague feedback ("the thing on the left") into actionable instructions ("the navigation sections in the left sidebar need wider link rows"). The terms are drawn from established UX and HTML conventions — not invented — so adoption is convergence on industry-standard language.

## Background

The IAM team maintains a growing portfolio of React and TypeScript applications: the [[collection/entities/iam-toolbox|IAM Toolbox]], the UNT Directory App, and the DSTools Azure replacement. As frontend work increases, imprecise communication compounds: a designer says "button," an engineer hears one of five things. This document was assembled while annotating the knowledge wiki (Jack's Brain), then generalized to apply across all team projects.

## Vocabulary Reference

The document organizes terms from largest to smallest: page-level skeleton → components → controls → spacing.

### Page-Level Anatomy

| Term | Definition |
|------|-----------|
| **Viewport** | The browser window itself — "everything visible on screen." |
| **Sidebar** | A vertical column of navigation, typically on the left. |
| **Content column** | The central area where the main article or page content lives. Also: main area, primary content. |
| **Footer** | The bottom strip of the page — copyright, attribution, supplementary navigation. |
| **Gutter** | Empty space between columns or outer margins. |
| **Hero** | A large visual at the top of a page intended to set tone or identity. |

### Sidebar Parts

| Term | Definition |
|------|-----------|
| **Masthead** | Top area of the sidebar with branding (app name or logo). |
| **Nav section** | A grouped set of links under a header. |
| **Section heading** | The bold label at the top of each nav section. |
| **Nav link** | A single clickable row inside a section. |
| **Section divider** | Horizontal line between nav sections. |

### Content Column Parts

| Term | Definition |
|------|-----------|
| **Breadcrumb** | Trail at the top showing hierarchical position (e.g., "Home › Learn › Research"). |
| **Page title** | The main page heading; an H1 in HTML terms. |
| **Metadata** | Small descriptive line beneath the page title (date, tags, reading time). Also: byline, post meta. |
| **Body** | Everything below the title — prose, tables, images, embedded elements. |

### Components and Composite UI

| Term | Definition |
|------|-----------|
| **Card** | A bordered, rounded container grouping related content or controls. |
| **Card heading** | The H3 at the top of each card; also called a section label. |
| **Dropzone** | A dashed-border drop target accepting file drops, paste events, and click-to-browse. Distinct from a text input. |
| **Input row** | Horizontal arrangement of an input and a button; input flexes to fill space, button is fixed-width. |

### Form Controls

| Term | Definition |
|------|-----------|
| **Text input** | Single-line text-entry control. Used for names, titles, URLs. |
| **Textarea** | Multi-line text-entry control. Used for paragraphs, code, longer prose. |
| **Number input** | Numeric-entry control with up/down spinner buttons. Also: spinner, stepper. |
| **Dropdown / select** | Clickable control revealing a list of mutually-exclusive options. |
| **Checkbox** | Square toggle for boolean values (checked or unchecked). |
| **Toggle switch** | Pill-shaped slider control for boolean values. Same data as checkbox; distinct styling. |
| **Radio button** | Circular selector; one of a mutually-exclusive group. |
| **Label** | Text describing the purpose of an input; sits visually adjacent to the input it labels. |

### Buttons, Badges, and Tables

| Term | Definition |
|------|-----------|
| **Primary button** | Filled, high-prominence button for the main action of a card or form (e.g., "Submit," "Search"). |
| **Secondary button** | Less-prominent button (outlined or text-only) for supporting actions like "Cancel" or "Reset." |
| **Icon button** | Small, square button containing only an icon (e.g., refresh ↻); suited to auxiliary actions. |
| **Badge** | Small rounded tag conveying status (e.g., "CATALOGED," "IN PROGRESS"). Also: pill when purely decorative. |
| **Callout** | Boxed aside that stands out from surrounding flow; used for warnings, tips, notes. |
| **Table** | Standard tabular layout with a header row (`<th>`) and body rows (`<tr>`/`<td>`). |

### Spacing and Positioning

| Term | Definition |
|------|-----------|
| **Max-width** | Maximum allowed width of a content container on large screens; establishes comfortable reading width. |
| **Breakpoint** | A screen width at which the layout changes (e.g., sidebar collapses to hamburger menu below 800px). |
| **Padding** | Space inside a container, between its border and its content. |
| **Margin** | Space outside a container, between it and its neighbors. |
| **Gap** | Spacing between siblings inside a flex or grid layout (e.g., between cards stacked vertically). |

## Practical Application

Vague: *"The thing with the file stuff feels too tight."*

Precise: *"The textarea inside the Paste Text card needs more vertical padding, and the dropzone above it could be shorter to give the page better rhythm."*

The discipline: identify the smallest unit at fault, name it correctly, describe what should change. The vocabulary provides the shared starting point.

## Key Insight

Most communication problems in interface design are not about taste or judgment — they are about not having a shared word for what is in front of both people. Adopting standard vocabulary closes that gap without inventing new language.

See [[collection/concepts/web-interface-vocabulary|Web Interface Vocabulary]] for the extracted concept, and [[collection/synthesis/iam-team-frontend-communication|IAM Team Frontend Communication]] for cross-cutting analysis of how this vocabulary serves the team's broader development workflow.
