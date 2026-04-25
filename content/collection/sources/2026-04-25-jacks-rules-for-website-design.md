---
title: "Jack's Rules for Website Design"
summary: "Fourteen UX rules written in anger about real-world web failures, each annotated with the formal design principle it accidentally describes."
type: source
created: 2026-04-25
updated: 2026-04-25
tags:
  - ux
  - design
  - web
  - principles
  - rant
  - frontend
sources: []
confidence: high
role: argument
views:
  - date: 2026-04-25
    note: "Initial cataloging."
---

A piece by [[collection/entities/jack-stewart|Jack Stewart]], drafted as a Substack article. Originally written as an angry list of pet peeves about bad websites — particularly medical billing websites — and then later annotated with the formal UX principle each rule corresponds to. The argument lands as a case for treating user time as the system's responsibility, not the user's burden.

[Download original](/api/originals/2026-04-25-jacks-rules-for-website-design.md)

## Argument

The article runs on a three-layer structure repeated for each rule: (1) the rule itself stated bluntly, (2) Jack's snide commentary preserving the original rant's voice, and (3) the formal UX principle being described. The introduction frames the piece as a discovery: written years ago in frustration, the rules turned out to map cleanly onto established design theory. The closing argues that all 14 rules collapse into a single principle: *the computer should work harder so the user works less* — Alan Kay's "bicycle for the mind" reframed as a practical mandate.

## The Fourteen Rules and Their Formal Names

| Rule (paraphrased) | Formal principle |
|---|---|
| Auto-redirect HTTP → HTTPS | Defensive defaults |
| Auto-redirect www subdomain | User agnosticism about infrastructure |
| Don't print long URLs on paper bills | Match medium to message |
| Pull-down menus must appear at the menu's location | Spatial continuity / locus of attention preservation |
| No dropdown for birth year | Match the control to the data's cognitive shape |
| Don't make me retype information | Pre-population / respecting prior effort |
| Don't put Submit/Cancel on opposite sides | [[collection/concepts/fitts-law\|Fitts's Law]] + convention preservation |
| Accept any credit card format | [[collection/concepts/postels-law\|Postel's Law]] |
| Don't ask me to identify my card type | Don't ask the computer to ask the user what the computer already knows |
| Pre-validate card numbers (Luhn) | Fail fast |
| Allow MMYY for