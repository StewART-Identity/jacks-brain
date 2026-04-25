---
title: "IAM Toolbox"
summary: "Internal React/TypeScript web application built and maintained by the IAM team for identity and access management workflows."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - react
  - typescript
  - internal-tooling
  - frontend
sources:
  - "[[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
confidence: high
---

The IAM Toolbox is an internal web application built in React and TypeScript by the IAM team. It is the primary reference implementation for the team's frontend patterns and is used throughout the [[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary reference]] as the example application demonstrating shared UI terminology.

## Layout Patterns

The Toolbox follows the standard [[collection/concepts/web-interface-vocabulary|page anatomy vocabulary]]:

- A left **sidebar** with **masthead**, **nav sections**, and **nav links**
- A **content column** with **breadcrumb**, **page title**, **metadata**, and **body**
- **Cards** grouping related controls (e.g., "Upload File," "Paste Text")
- **Dropzones** for file upload, **input rows** for URL entry, **primary buttons** for main actions

## Related Applications

The IAM team's broader frontend portfolio shares the same vocabulary conventions:

- **UNT Directory App** — another React/TypeScript application maintained by the team.
- **DSTools Azure replacement** — a newer application replacing legacy tooling.

All three are documented in [[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary and Conventions for Web Interfaces]] as the motivating context for establishing a shared design language. See [[collection/synthesis/iam-team-frontend-communication|IAM Team Frontend Communication]] for cross-cutting analysis.
