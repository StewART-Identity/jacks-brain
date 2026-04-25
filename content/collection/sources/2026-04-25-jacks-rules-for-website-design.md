---
title: "Jack's Rules for Website Design"
summary: "Opinionated web form design rules by Jack Stewart, grounding UX complaints in named principles: Postel's Law, Fitts's Law, cognitive load, and the Luhn algorithm."
type: source
created: 2026-04-25
updated: 2026-04-25
tags:
  - ux
  - web-design
  - form-design
  - usability
  - payment-processing
  - cognitive-load
role: argument
views:
  - date: 2026-04-25
    note: "Initial cataloging."
sources: []
confidence: high
---

[Download original](/api/originals/2026-04-25-jacks-rules-for-website-design.md)

A set of opinionated, profanity-seasoned design rules written by [[collection/entities/jack-stewart|Jack Stewart]], aimed at web forms — especially payment flows for medical services. The rules are numbered 4–14, each pairing a specific complaint about a real interface failure with the formal UX or computer science principle behind it.

## The Unifying Thesis

All rules collapse into a single statement: **the computer should work harder so the user works less.**

Every documented failure is a system offloading work onto the user that the computer could have done for free: detecting a card network from the IIN prefix, stripping spaces from a credit card number, pre-populating a known address, running a checksum before submitting a payment. The user is being handed the system's job.

[[collection/entities/alan-kay|Alan Kay]]'s metaphor applies: the computer should be a "bicycle for the mind." If the user is pedaling uphill the whole time, the tool is failing.

## Rules

**Rule 4 — Spatial continuity**: Menus must open at their trigger location. Moving a dropdown's contents to another part of the screen breaks *locus of attention preservation* — the user's mental model of where things are — and forces re-acquisition of the interface. See [[collection/concepts/cognitive-load|cognitive load]].

**Rule 5 — Match control to cognitive shape**: A birth year is *recalled*, not *chosen*. A dropdown is the wrong control for recalled data. The right control is a four-digit text input or a browser-native date picker. The rule of thumb: if the user already knows the answer, let them type it.

**Rule 6 — Pre-populate known data**: If the user has already told the system something (address, phone, card number), the system must remember it. Re-asking is either architectural laziness or a missing shared database. [[collection/entities/don-norman|Don Norman]]'s framing: "the system is fighting me."

**Rule 7 — Convention preservation + [[collection/concepts/fitts-law|Fitts's Law]]**: Action button placement must follow established platform conventions (Confirm/Cancel position) and minimize distance to likely targets. Diverging from convention within a single interface creates accidental clicks. Spreading critical buttons to opposite corners increases motor travel and error rates — a real, measured phenomenon studied since 1954.

**Rule 8 — [[collection/concepts/postels-law|Postel's Law]]**: Accept any reasonable format for credit card input (`1111222233334444`, `1111 2222 3333 4444`, `1111-2222-3333-4444`). Strip whitespace and dashes server-side before processing. It is a five-character regex. Rejecting standard formats is broken behavior, not a user error.

**Rule 9 — Don't ask what the computer knows**: Card networks are encoded in the IIN prefix (Visa: 4, MasterCard: 5, Amex: 34/37, Discover: 6). Asking the user to select their card type from a dropdown is asking them to do what a few lines of JavaScript already handle. The principle generalizes: never ask the user for information the system can derive.

**Rule 10 — Fail fast**: The [[collection/concepts/luhn-algorithm|Luhn algorithm]] validates credit card numbers client-side, before form submission, with twelve lines of code. Any transposition caught in the browser is caught in context. An error surfaced hours later by email is a deliberate design choice to maximize user frustration.

**Rule 11 — Single input over coordinated inputs**: An expiration date (`0527`) is one logical value. Splitting it into month/year dropdowns creates two coordination problems (tab order, cross-field validation, ambiguous error display) with no user benefit. Single-field inputs for single logical values.

**Rule 12 — Feedback immediacy**: Transactions should complete visibly before the user leaves the page. Batch processing overnight makes "payment queued" and "payment declined" look identical from the user's side. Trust is a function of transparent, immediate state.

**Rule 13 — Match control to cognitive shape (reprise)**: Picker/spinner/stepper controls are appropriate only for narrow-range values where ±1–2 steps from a default is the typical adjustment. For birth year (an 80+ year range) or weight, they are the wrong control. Rule of thumb: if the user would change the value by more than ~5 steps, a spinner is wrong.

**Rule 14 — Context preservation**: Account management (password change, profile edit) must live in the app, not redirect to a browser. Redirecting out for account operations trains users to accept phishing patterns as legitimate behavior, and it costs them their current task context.

## Relationship to Formal UX Literature

The rules are informal in tone but each is grounded in a named concept:

- *Locus of attention preservation* and [[collection/concepts/cognitive-load|cognitive load]] — Rules 4, 5, 13
- [[collection/concepts/fitts-law|Fitts's Law]] — Rule 7 (studied since 1954)
- [[collection/concepts/postels-law|Postel's Law]] — Rule 8
- [[collection/concepts/luhn-algorithm|Luhn algorithm]] — Rule 10 (invented 1954)
- [[collection/entities/don-norman|Don Norman]]'s conceptual model framing — Rule 6
- [[collection/entities/alan-kay|Alan Kay]]'s "bicycle for the mind" — closing argument

See [[collection/synthesis/web-form-design-principles|Web Form Design Principles]] for synthesis with [[collection/concepts/web-interface-vocabulary|web interface vocabulary]] and the broader pattern of Stewart's design philosophy.
