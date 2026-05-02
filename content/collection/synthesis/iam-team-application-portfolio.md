---
title: "IAM Team Application Portfolio at UNT"
summary: "Analysis of the UNT IAM team's evolution into a full application-development team, evidenced by the Toolbox, Directory App, and the decision to write a UI style guide."
type: synthesis
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
  - web-development
tags:
  - iam
  - unt
  - internal-tooling
  - react
  - typescript
  - frontend
  - engineering-maturity
  - iam-toolbox
  - software-development
  - technical-communication
sources:
  - "[[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
confidence: medium
---

This synthesis examines the UNT IAM team's position as a software development team, drawing on [[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|the UI vocabulary document]] and [[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume|Jack Stewart's resume]].

## From IAM Operators to Application Builders

Traditional IAM teams configure and operate commercial platforms ([[collection/concepts/active-directory]], [[collection/entities/netiq-identity-manager]], [[collection/concepts/entra-id]]) and write integration scripts. They generally do not build production web applications. The UNT IAM team — visible through these two sources — has moved meaningfully beyond that model.

The evidence:

- **[[collection/entities/iam-toolbox]]**: a React/TypeScript application with multiple distinct pages, composite UI patterns (cards, dropzones, data tables), and enough complexity to warrant annotated screenshots in a style guide
- **UNT Directory App**: a second internal web application maintained by the same team
- **DSTools Azure replacement**: a third application in active development
- **The UI vocabulary document itself**: style guides emerge when teams have enough developers building enough applications that vocabulary drift becomes a real, recurring cost

## What the Vocabulary Document Signals

The decision to write and distribute a [[collection/concepts/web-ui-vocabulary|UI vocabulary guide]] is itself an engineering maturity signal. Such documents presuppose:

1. Multiple engineers building UI concurrently — otherwise there is no vocabulary drift problem
2. A review or feedback process where imprecision creates rework
3. Enough accumulated institutional knowledge that formalizing it pays off

The document deliberately grounds its vocabulary in standard HTML/UX conventions rather than inventing team-specific terms. This reduces onboarding cost and keeps the team's language compatible with industry norms — a pragmatic choice that favors long-term maintainability over short-term customization.

## Relationship to Jack Stewart's Profile

[[collection/entities/jack-stewart]]'s resume frames him primarily as an IAM systems engineer (AD, NetIQ IDM, Entra ID, CyberArk). The vocabulary document provides a different angle: he is also leading or contributing to a team that builds React/TypeScript applications at enough scale that style documentation is a deliverable.

This is consistent with a pattern visible across his career: documentation as a first-class engineering artifact. The cross-team run-books for Michigan's tenant-to-tenant migration are explicitly called out in his resume as a notable deliverable. The vocabulary document extends that discipline into frontend engineering. See [[collection/synthesis/iam-career-in-higher-education]] for the broader career pattern.

## Tension Worth Flagging

The vocabulary document's audience is "the IAM team" and explicitly includes "external-facing web applications the team builds or reviews." This raises a question not answered by available sources: is the team building user-facing applications for the broader UNT community, or primarily internal tooling for IAM operations? The answer matters for how to interpret the team's scope and [[collection/entities/university-of-north-texas]]'s investment in IAM-adjacent software development. The sources available mark this `confidence: medium` pending further documentation.
