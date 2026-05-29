---
title: "Form controls"
summary: "Inputs where the user types or chooses — fields and their states, checkboxes, radios, toggles, selects, sliders, search, and file pickers."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements
tags:
  - ui
  - forms
  - input
  - checkbox
  - radio
  - toggle
  - select
  - slider
  - label
  - validation
confidence: high
sources: []
---

**Form controls** are everywhere a user gives the app information: typing an email, picking a campus, flipping a setting on. The trickiest part for beginners isn't the controls themselves but the *supporting parts* around them — labels, placeholders, helper text, error messages — and knowing which control fits which kind of choice.

## Anatomy of a text field

A bare input box is rarely enough. A well-built field has named parts, and most "this form is confusing" feedback traces to one of them being missing or misused.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 190" role="img" aria-label="A text field showing label, placeholder and helper text, and below it the same field in an error state with a red border and error message" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <text x="16" y="18" font-size="12" font-weight="600" fill="#F0DDB3">Email</text>
  <rect x="16" y="26" width="320" height="38" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="28" y="45" dominant-baseline="central" font-size="13" fill="#6FA384">you@unt.edu</text>
  <text x="16" y="82" font-size="11" fill="#7BBF95">We'll only use this for account recovery.</text>
  <text x="352" y="18" font-size="11" fill="#7BBF95">◂ label</text>
  <text x="352" y="48" font-size="11" fill="#7BBF95">◂ placeholder (sample text, vanishes on type)</text>
  <text x="352" y="83" font-size="11" fill="#7BBF95">◂ helper / hint text</text>
  <text x="16" y="112" font-size="12" font-weight="600" fill="#F0DDB3">Email</text>
  <rect x="16" y="120" width="320" height="38" rx="5" fill="#15301E" stroke="#C9685E" stroke-width="1.5"/>
  <text x="28" y="139" dominant-baseline="central" font-size="13" fill="#E3E0DB">not-an-email</text>
  <text x="16" y="176" font-size="11" fill="#C9685E">Enter a valid email address.</text>
  <text x="352" y="141" font-size="11" fill="#7BBF95">◂ error state (red border + message)</text>
</svg>

- **Label** — the persistent name of the field. Always present, always visible. (A placeholder is *not* a substitute for a label — it disappears the moment the user types.)
- **Placeholder** — faint sample text inside the box showing the expected format. Helpful, but optional and easily missed.
- **Helper / hint text** — a small note below explaining the field.
- **Error / validation state** — when input is wrong, the border turns a warning color and a message replaces or joins the helper text. The opposite is a **success state**.

## Selection controls — which one when

These three look different but all answer "pick something," and choosing the wrong one is one of the most common beginner mistakes.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 100" role="img" aria-label="Checkboxes shown checked and unchecked, a radio group with one option selected, and a toggle switch shown off and on" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <text x="16" y="16" font-size="11" font-weight="600" fill="#7BBF95">Checkbox</text>
  <rect x="16" y="30" width="20" height="20" rx="4" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="46" y="40" dominant-baseline="central" font-size="13" fill="#E3E0DB">Off</text>
  <rect x="16" y="60" width="20" height="20" rx="4" fill="#D4AD5A"/>
  <path d="M20 70 L24 75 L33 64" fill="none" stroke="#0F2418" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="46" y="70" dominant-baseline="central" font-size="13" fill="#E3E0DB">On</text>
  <text x="170" y="16" font-size="11" font-weight="600" fill="#7BBF95">Radio</text>
  <circle cx="180" cy="40" r="10" fill="none" stroke="#D4AD5A" stroke-width="2"/>
  <circle cx="180" cy="40" r="4.5" fill="#D4AD5A"/>
  <text x="200" y="40" dominant-baseline="central" font-size="13" fill="#E3E0DB">Option A</text>
  <circle cx="180" cy="70" r="10" fill="none" stroke="#3C6B4E" stroke-width="2"/>
  <text x="200" y="70" dominant-baseline="central" font-size="13" fill="#E3E0DB">Option B</text>
  <text x="360" y="16" font-size="11" font-weight="600" fill="#7BBF95">Toggle / switch</text>
  <rect x="360" y="32" width="44" height="22" rx="11" fill="#213A2B" stroke="#3C6B4E" stroke-width="1.5"/>
  <circle cx="372" cy="43" r="8" fill="#7BBF95"/>
  <text x="414" y="43" dominant-baseline="central" font-size="12" fill="#7BBF95">off</text>
  <rect x="360" y="66" width="44" height="22" rx="11" fill="#D4AD5A"/>
  <circle cx="392" cy="77" r="8" fill="#0F2418"/>
  <text x="414" y="77" dominant-baseline="central" font-size="12" fill="#7BBF95">on</text>
</svg>

- **Checkbox** — independent yes/no choices. Use when several options can be on at once, or for a single "I agree" tick.
- **Radio button** — mutually exclusive choices in a group: picking one clears the others. Use for a small set (say, 2–5) of visible options where only one applies.
- **Toggle / switch** — an instant on/off setting that takes effect immediately, with no "Save" needed (like a light switch). If choosing requires a later submit, that's a checkbox, not a toggle.

## Choosing from a set, and free text

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 142" role="img" aria-label="A collapsed select dropdown showing a chosen value with a caret, and a multi-line textarea with a resize handle" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <text x="16" y="18" font-size="12" font-weight="600" fill="#F0DDB3">Campus</text>
  <rect x="16" y="26" width="240" height="38" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="28" y="45" dominant-baseline="central" font-size="13" fill="#E3E0DB">UNT — Denton</text>
  <polygon points="230,41 244,41 237,49" fill="#7BBF95"/>
  <text x="16" y="84" font-size="11" fill="#7BBF95">select / dropdown — pick one from many (collapsed here)</text>
  <text x="300" y="18" font-size="12" font-weight="600" fill="#F0DDB3">Notes</text>
  <rect x="300" y="26" width="244" height="90" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="312" y="46" font-size="13" fill="#6FA384">Add a note…</text>
  <line x1="528" y1="112" x2="538" y2="102" stroke="#3C6B4E" stroke-width="1.5"/>
  <line x1="534" y1="112" x2="538" y2="108" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="300" y="134" font-size="11" fill="#7BBF95">textarea — multi-line free text, often resizable</text>
</svg>

- **Select / dropdown** — collapses a long list to a single line; clicking it opens the options. Use it instead of radios when there are many choices (states, time zones) or space is tight. A **combobox** is a select you can also type into to filter.
- **Textarea** — a multi-line text box for longer free-form input (a comment, a description). The little corner grip means the user can drag to **resize** it.

## Sliders, search, and files

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 158" role="img" aria-label="A slider with a filled track and thumb, a pill-shaped search field with a magnifier icon, and an outlined file upload button with an upload icon" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <text x="16" y="18" font-size="12" font-weight="600" fill="#F0DDB3">Volume</text>
  <line x1="18" y1="42" x2="240" y2="42" stroke="#3C6B4E" stroke-width="4" stroke-linecap="round"/>
  <line x1="18" y1="42" x2="150" y2="42" stroke="#D4AD5A" stroke-width="4" stroke-linecap="round"/>
  <circle cx="150" cy="42" r="9" fill="#D4AD5A" stroke="#0F2418" stroke-width="1.5"/>
  <text x="16" y="70" font-size="11" fill="#7BBF95">slider / range input — pick a value along a continuum</text>
  <rect x="16" y="92" width="240" height="38" rx="19" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <circle cx="38" cy="109" r="6" fill="none" stroke="#7BBF95" stroke-width="2"/>
  <line x1="42" y1="113" x2="48" y2="119" stroke="#7BBF95" stroke-width="2" stroke-linecap="round"/>
  <text x="58" y="111" dominant-baseline="central" font-size="13" fill="#6FA384">Search people…</text>
  <text x="16" y="150" font-size="11" fill="#7BBF95">search field</text>
  <rect x="300" y="92" width="170" height="38" rx="5" fill="none" stroke="#7BBF95" stroke-width="1.5"/>
  <line x1="322" y1="119" x2="322" y2="100" stroke="#E3E0DB" stroke-width="2" stroke-linecap="round"/>
  <polyline points="317,104 322,99 327,104" fill="none" stroke="#E3E0DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="340" y="111" dominant-baseline="central" font-size="13" fill="#E3E0DB">Choose file</text>
  <text x="300" y="150" font-size="11" fill="#7BBF95">file upload control</text>
</svg>

- **Slider / range** — drag a thumb along a track to set a number where the exact value matters less than the feel (volume, brightness, a price range).
- **Search field** — a text input specialized for queries, usually pill-shaped with a magnifier icon and often a clear (×) button.
- **File upload** — a button that opens the OS file picker; the chosen filename then appears beside it. Fancier versions add a **drag-and-drop zone**.

Almost every one of these lives inside a `<form>`, and the same [[upskill/ui-elements/feedback|validation feedback]] patterns (error vs. success states) apply across all of them. When you build real forms, a library like React Hook Form or your component kit will wire the state and validation for you — your job is mostly choosing the *right control* for each piece of data.
