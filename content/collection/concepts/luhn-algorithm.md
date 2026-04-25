---
title: "Luhn Algorithm"
summary: "A 1954 checksum formula for validating credit card numbers client-side — twelve lines of code that catch transposition errors before a payment processor is ever called."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - payment-processing
  - form-design
  - validation
  - web-development
sources:
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
confidence: high
---

The Luhn algorithm (also *modulus 10* or *mod 10*) is a simple checksum formula developed by Hans Peter Luhn at IBM in 1954. It is used to validate credit card numbers and a variety of other identification numbers.

## How It Works

Starting from the rightmost digit, double every second digit. If doubling produces a two-digit number, sum its digits. Add all digits together (original and doubled). If the total is divisible by 10, the number is valid.

A single transposed digit almost always produces a checksum failure. This means any typo in a credit card number — the most common user error in payment forms — is detectable before the form is submitted, without any network request to a payment processor.

## Application in Stewart's Rules

[[collection/entities/jack-stewart|Jack Stewart]] invokes the Luhn algorithm in Rule 10 of [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]]:

> Valid credit card numbers have a mathematical checksum (the Luhn algorithm — twelve lines of code, invented in 1954, still in use today). Any typo in the last four digits gets caught in the browser. The earlier an error is surfaced, the less context the user has to rebuild when they fix it.

The core argument is *fail fast*: an error caught at the field, before submission, is recovered from immediately. An error surfaced hours later by email requires the user to reconstruct context, reopen the form, and re-enter data — all avoidable with twelve lines of JavaScript.

## Relationship to Postel's Law

The Luhn algorithm pairs with [[collection/concepts/postels-law|Postel's Law]]: accept any reasonable credit card format (strip spaces and dashes per the robustness principle), normalize the input, then validate the checksum. The combination implements liberal acceptance followed by strict validation — exactly what the robustness principle recommends.

Card network type (Visa, MasterCard, Amex, Discover) is separately encoded in the Issuer Identification Number (IIN) — the first 1–6 digits. Rule 9 of [[collection/sources/2026-04-25-jacks-rules-for-website-design|Jack's Rules for Website Design]] notes this is knowable without asking the user: Visa starts with 4, MasterCard with 5, Amex with 34 or 37, Discover with 6.
