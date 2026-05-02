---
title: "IAM Toolbox"
summary: "Internal React/TypeScript web application built by the UNT IAM team, used as the primary annotated example in the team's UI vocabulary reference."
type: entity
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
  - web-development
tags:
  - internal-tooling
  - react
  - typescript
  - iam
  - unt
  - frontend
  - web-application
sources:
  - "[[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
confidence: medium
---

The IAM Toolbox is an internal web application built and maintained by the IAM team at the [[collection/entities/university-of-north-texas]], led by [[collection/entities/jack-stewart]]. Built in React and TypeScript, it serves as the team's primary operational application for identity-related workflows.

The [[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary document]] uses the Toolbox as its primary annotated example, illustrating the full [[collection/concepts/web-ui-vocabulary]] — sidebars, cards, dropzones, form controls, data tables, and status badges — with screenshots of actual Toolbox pages.

## Known Pages and Features

Based on the UI vocabulary document's annotated screenshots:

- **Knowledge page** — four stacked cards, each providing a different content-input modality: file upload (dropzone), paste text (textarea), paste URL (input row), and paste YouTube URL (input row)
- **Research page** — a form with a textarea (question input), number input (result count), checkbox (rank-with-Claude toggle), and a primary button (Search)
- **Retention page** — a data table with status badges (e.g., "CATALOGED") and an icon button (refresh ↻)

## Context

The Toolbox is one of several internal applications in the IAM team's portfolio. The team also maintains the UNT Directory App and is building a DSTools Azure replacement. The existence of a shared UI vocabulary document points to the team's maturity as a software engineering organization — style and vocabulary guides emerge when multiple developers are building multiple applications and vocabulary drift has become a real cost.

See [[collection/synthesis/iam-team-application-portfolio]] for a synthesis of the team's broader application development work, and [[collection/concepts/web-ui-vocabulary]] for the structured reference vocabulary derived from this tool's annotated screenshots.
