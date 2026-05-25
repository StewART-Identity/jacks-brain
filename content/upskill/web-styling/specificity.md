---
title: "CSS specificity"
summary: "How the browser picks which CSS rule wins when several rules target the same element — a three-part numerical score computed from the selector, with !important as a fourth tier above all of it."
type: concept
created: 2026-05-25
updated: 2026-05-25
subjects:
  - web-styling
tags:
  - css
  - specificity
  - cascade
  - selectors
  - important
  - inheritance
confidence: high
sources: []
---

When multiple CSS rules apply to the same element and they conflict — both setting `color`, for example — the browser has to pick a winner. The rule that wins is the one with the highest **specificity**. Specificity is computed from the selector itself, and once you understand how it's counted, most "why is this style not applying" mysteries become solvable.

## The three-tier score

Every selector gets a specificity score with three numbers, conventionally written as `(A, B, C)`:

- **A — IDs.** Count of `#id` selectors. `#login-form` adds 1 to A.
- **B — classes, attributes, pseudo-classes.** Count of `.class`, `[attr]`, `[attr=value]`, `:hover`, `:focus`, `:nth-child()`, etc. `.btn.primary:hover` adds 3 to B.
- **C — elements and pseudo-elements.** Count of bare element names like `div`, `p`, `button`, and pseudo-elements like `::before`. `button > span::before` adds 3 to C.

The universal selector `*`, combinators (`>`, `+`, `~`), and `:where()` add nothing.

When comparing two selectors, you compare A first; whichever is higher wins. If A is tied, compare B. If B is tied, compare C. A is so much more powerful than B that even 100 classes can't beat a single ID.

## Examples

- `p` — `(0, 0, 1)`
- `.note` — `(0, 1, 0)` — beats `p`
- `p.note` — `(0, 1, 1)` — beats `.note`
- `#sidebar p` — `(1, 0, 1)` — beats any number of classes
- `#sidebar p.note.featured:hover` — `(1, 3, 1)`
- `a:hover` — `(0, 1, 1)`
- `a.external` — `(0, 1, 1)` — TIE with `a:hover`; source order breaks the tie

## Source order as the tiebreaker

When specificity is identical, the rule that appears later in the CSS wins. This is why the order of imports matters, and why the `cascade` in "Cascading Style Sheets" is named that — rules cascade downward and later ones override earlier ones at the same specificity.

## `!important` — the escape hatch

Adding `!important` to a declaration (`color: red !important;`) bumps that declaration into a higher tier that beats any non-important rule, regardless of specificity. Two `!important` declarations compete with each other on normal specificity. Inline styles (`style="color: red"`) sit just below `!important` declarations in priority.

`!important` is sometimes necessary — most often to override a third-party stylesheet you don't control — but using it casually creates a maintenance trap: once one rule is `!important`, the only way to override it is *another* `!important`, and so on. Reserve it for cases where you can't restructure the CSS.

## Inheritance is separate

Specificity decides which rule wins when multiple rules apply. **Inheritance** is a different mechanism — some properties (like `color` and `font-family`) flow from parent elements down to children by default, while others (like `padding` and `border`) do not. An inherited value loses to *any* directly-applied rule on the child, regardless of specificity. The two concepts often get conflated but they answer different questions: specificity asks "which rule applies?" and inheritance asks "does this property even reach this element by default?"

## Why this matters

Most "my CSS isn't working" frustrations come down to specificity: you wrote `.button { color: red }` and it's still showing blue because somewhere there's a `#header .button` rule with higher specificity. Browser devtools' "Computed" panel will show you the winning rule and the ones it beat — that's the fastest debugging tool for specificity conflicts.
