---
title: "Cognitive Load"
summary: "The mental effort required to process information; in UX, the core explanation for why interfaces that offload work onto users fail."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - ux
  - cognitive-science
  - web-design
  - form-design
sources:
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
confidence: high
---

Cognitive load is the mental effort required to process information and complete a task. In UX and interface design, it describes the burden placed on a user by an interface — the working memory consumed by navigation, interpretation, form completion, and error recovery.

## Three Types

- **Intrinsic load** — the inherent complexity of the task itself (filing taxes has intrinsic complexity; typing a credit card number does not)
- **Extraneous load** — unnecessary load introduced by poor design (scrolling a birth-year picker, picking card type from a dropdown, re-entering a known address)
- **Germane load** — load that builds understanding (learning a new workflow is germane; confusion about where a dropdown appeared is not)

Good interface design minimizes extraneous load so available cognitive capacity goes to the task, not the interface.

## Information Scent

*Information scent* is the degree to which an interface element signals where it leads or what it does. A link labeled "click here" has no scent; "view your payment history" has strong scent. Weak information scent forces users to explore rather than navigate — increasing load for no value.

[[collection/entities/jack-stewart|Jack Stewart]] cites both concepts in [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]] as the theoretical underpinning of URL design: a long, internal-structure URL printed on paper is a transcription task with high extraneous load and no benefit.

## Locus of Attention Preservation

*Locus of attention preservation* is the principle that interface elements should behave predictably relative to where the user's attention is focused. When a dropdown menu appears in the upper-left corner of the screen instead of at the control that triggered it, the user must re-acquire the interface — a sudden tax on working memory. This is Rule 4 of Stewart's rules.

## Cognitive Shape

The *cognitive shape* of a data value is how the user mentally holds it. Some values are *chosen* (a country from a list); others are *recalled* (a date of birth, a credit card number, a zip code). The right control matches the cognitive shape:

- **Recalled values** → free-text input (the user knows the answer; let them type it)
- **Chosen values** → dropdown or radio group (the user is selecting from options)
- **Adjusted values with a likely default** → spinner or stepper (hotel guest count)

Mismatching control to cognitive shape — a birth-year dropdown for a recalled value, a spinner for a value with a 60-year range — forces the user to translate their mental representation into the control's interaction model, burning cognitive capacity for no reason. Rules 5 and 13 in [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]] are both instances of this failure.

See [[collection/concepts/fitts-law|Fitts's Law]] for a related ergonomic principle governing motor effort; [[collection/concepts/postels-law|Postel's Law]] for the input-format corollary. The [[collection/concepts/web-interface-vocabulary|web interface vocabulary]] names the controls referenced here (dropdown, spinner, text input) precisely.
