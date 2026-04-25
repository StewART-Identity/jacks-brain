---
title: "Postel's Law"
summary: "The robustness principle: be liberal in what you accept, strict in what you emit — foundational to resilient API, protocol, and web form design."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - networking
  - api-design
  - form-design
  - web-design
  - robustness
sources:
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
confidence: high
---

Postel's Law — formally the *robustness principle* — was articulated by Jon Postel in RFC 793 (1981): **"Be liberal in what you accept, strict in what you emit."** It originated as guidance for TCP implementations but has become a foundational principle in API design, protocol interoperability, and web form UX.

## The Principle

The asymmetry is intentional: strict output prevents propagating ambiguity downstream; liberal input does not punish callers (or users) for using equivalent representations. The combination maximizes interoperability at both ends without requiring agreement on a single canonical format.

Applied to web forms: when a credit card number can legitimately be represented as `1111222233334444`, `1111 2222 3333 4444`, or `1111-2222-3333-4444`, all three are correct. A form that rejects two of these is not enforcing a standard — it is punishing the user for not guessing the developer's preferred format. The server-side normalization (strip non-digits, validate length and checksum) is five lines of code. The user should never see the difference.

## Application in Stewart's Rules

[[collection/entities/jack-stewart|Jack Stewart]] applies Postel's Law directly in Rule 8 of [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]]:

> Strip whitespace and dashes on the server side before processing. It's a five-character regex. The user's job is to give you a credit card number; it's not their job to guess your preferred formatting convention.

The same logic extends to credit card type detection (Rule 9): if the IIN prefix already encodes the card network, asking the user to confirm it is making the user do the computer's job — a violation of the principle's spirit even without a format ambiguity.

## Limits

Overly liberal parsers can accept malformed input that should fail, masking bugs and creating attack surface. The principle is most sound when:

- The set of acceptable variants is finite and well-understood
- The normalization operation is deterministic (strip spaces and dashes → canonical number)
- Liberal acceptance does not introduce ambiguity in interpretation

Credit card input passes all three tests; the principle applies cleanly.

## Companion Concepts

Postel's Law pairs with the [[collection/concepts/luhn-algorithm|Luhn algorithm]]: accept any format, normalize it, then verify the checksum. The two steps together implement the full robustness principle — liberal acceptance followed by strict validation before emission to a payment processor.

See [[collection/concepts/cognitive-load|cognitive load]] for the user-experience cost of format rigidity; [[collection/concepts/web-interface-vocabulary|web interface vocabulary]] for names of the form controls where these decisions manifest.
