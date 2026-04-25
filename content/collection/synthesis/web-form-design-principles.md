---
title: "Web Form Design Principles"
summary: "How Jack Stewart's two web-interface sources — shared vocabulary and opinionated rules — form a unified design philosophy grounded in named UX and CS principles."
type: synthesis
created: 2026-04-25
updated: 2026-04-25
tags:
  - ux
  - web-design
  - form-design
  - design-philosophy
  - frontend
sources:
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
  - "[[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
confidence: high
---

Two sources authored by [[collection/entities/jack-stewart|Jack Stewart]] address web interface quality from complementary angles:

- [[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary and Conventions for Web Interfaces]] — establishes shared terminology for naming interface regions, components, and controls
- [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]] — enumerates specific design rules for web forms, grounding each in a named UX or computer science principle

Together they describe a unified design philosophy: **name things precisely so you can reason about them; then apply known principles to get them right.**

## Two Layers of the Same Idea

The vocabulary source operates at the *descriptive* layer: given an interface, here are the correct names for its parts. The rules source operates at the *normative* layer: given those parts (forms, inputs, buttons, menus), here is how they must behave.

Both sources share the same foundational assumption: most interface failures are not taste failures. They are either vocabulary failures (people cannot describe what is wrong) or principle failures (people do not know or apply the relevant rule). Naming [[collection/concepts/web-interface-vocabulary|web interface vocabulary]] precisely is the precondition for reasoning about whether a [[collection/concepts/fitts-law|Fitts's Law]] violation is present. You cannot articulate "the action buttons are too far from the form" without names for "action buttons" and "form."

## The Unifying Principle

The rules source makes the meta-principle explicit: **the computer should work harder so the user works less.** Every specific rule is an instance of this:

| Rule | What the system does instead of the user |
|------|------------------------------------------|
| Accept any credit card format | Strip non-digits (five-character regex) |
| Detect card type from IIN | Read the prefix (constant table lookup) |
| Validate card number client-side | Run [[collection/concepts/luhn-algorithm|Luhn algorithm]] before submission |
| Pre-populate known fields | Query existing data before rendering the form |
| Charge immediately | Call a synchronous payment API instead of batching |

Each operation costs the system microseconds and saves the user seconds, frustration, or eroded trust.

## Formal Principles Grounding Informal Rules

The rules source turns subjective-seeming preferences into falsifiable claims by grounding each in a named concept. "I hate birth-year spinners" becomes: "a spinner is the wrong control for recalled data because it forces the user to translate a known value into a step-adjustment interaction model" — a claim that follows from [[collection/concepts/cognitive-load|cognitive load]] theory.

Named concepts invoked:

- [[collection/concepts/cognitive-load|Cognitive load]] and *locus of attention preservation* — Rules 4, 5, 13
- [[collection/concepts/fitts-law|Fitts's Law]] — Rule 7 (studied since 1954)
- [[collection/concepts/postels-law|Postel's Law]] — Rule 8
- [[collection/concepts/luhn-algorithm|Luhn algorithm]] — Rule 10 (invented 1954)
- [[collection/entities/don-norman|Don Norman]]'s conceptual model framing — Rule 6
- [[collection/entities/alan-kay|Alan Kay]]'s "bicycle for the mind" — closing argument

The vocabulary source does the same thing in its domain: it does not invent new terms, it converges on existing industry terminology. Both sources treat informal convention as a liability and named, citable concepts as assets.

## Application to IAM Team Work

The vocabulary source is explicitly scoped to [[collection/entities/iam-toolbox|IAM Toolbox]] and related IAM team applications. The design rules source is scoped to payment and medical service forms but applies to any form-heavy web application — which the IAM Toolbox is.

The practical combination: when reviewing a PR that modifies a form, a team member can name the component precisely (vocabulary) and ask whether it violates a known principle (rules). "The birth-year dropdown in the profile form violates the cognitive-shape rule — it should be a text input" is a more actionable review comment than "the year thing feels off."

See [[collection/synthesis/iam-team-frontend-communication|IAM Team Frontend Communication]] for related analysis of how shared vocabulary improves design communication across the team.
