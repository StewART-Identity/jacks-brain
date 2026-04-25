---
title: "Fitts's Law"
summary: "A 1954 ergonomics model showing that time to reach a UI target is a function of distance and target size — foundational to button placement and dialog design."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - ux
  - ui
  - ergonomics
  - form-design
  - web-design
sources:
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
confidence: high
---

Fitts's Law is a predictive model of human movement proposed by Paul Fitts in 1954. It states that the time required to rapidly move to a target is a function of the ratio between the distance to the target and the width of the target:

> *T = a + b · log₂(2D / W)*

Where T is movement time, D is distance to the target, and W is the width (size) of the target. Smaller targets at greater distances take longer to acquire accurately.

## Application to Interface Design

Two practical guidelines follow directly:

1. **Make common targets large** — primary action buttons should be larger than secondary ones, making them faster to acquire under motor uncertainty
2. **Keep related actions close** — actions that logically follow each other (Confirm and Cancel in a dialog) should be near the triggering context, not at arbitrary screen locations

The law also explains why screen edges and corners are valuable real estate: a cursor moving toward a screen boundary "stops" there, making edge targets effectively infinite in one dimension. This is why the macOS menu bar at the screen top is faster to use than a menu bar embedded mid-window.

## Application in Stewart's Rules

[[collection/entities/jack-stewart|Jack Stewart]] invokes Fitts's Law in Rule 7 of [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]]:

> Users have learned over decades where "Cancel" and "Confirm" go. Fitts's Law adds that the distance you travel to a target matters; spreading critical buttons to opposite corners forces unnecessary mouse travel and increases error rates. It's a real phenomenon studied since 1954.

The practical implication for dialog design: action buttons should appear near the context of the action (near the form they submit, near the content they affect) and follow the platform's established convention for Cancel/Confirm positioning.

## Compounding with Convention

Fitts's Law is a physical model, but it compounds with learned convention. A button in an unexpected position is both physically harder to reach (distance) and cognitively surprising (convention violation). The two failure modes reinforce each other — a misplaced Confirm button incurs both motor and cognitive cost simultaneously.

See [[collection/concepts/cognitive-load|cognitive load]] for the cognitive dimension; [[collection/concepts/web-interface-vocabulary|web interface vocabulary]] for precise names of the button types involved (primary button, secondary button).
