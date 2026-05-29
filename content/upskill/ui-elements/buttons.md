---
title: "Buttons & actions"
summary: "The controls you click to perform an action — button variants, states, icon and split buttons, and how a button differs from a link."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements
tags:
  - ui
  - buttons
  - button-variants
  - primary
  - secondary
  - destructive
  - icon-button
  - button-group
  - accessibility
confidence: high
sources: []
---

A **button** triggers an action: submit a form, open a dialog, save a record, delete a row. Everything on this page is a variation on that one idea — the differences are about *emphasis* (how loud the button is), *state* (what it looks like while interacting), and *shape* (icon-only, grouped, split). Getting the vocabulary down means you can describe almost any clickable thing in a design without hand-waving.

## Button variants

The variant signals importance. A screen should usually have exactly one **primary** button (the main thing you want the user to do) and demote everything else.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 76" role="img" aria-label="Four button variants: primary filled, secondary outlined, ghost text, and destructive" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="14" width="120" height="36" rx="6" fill="#D4AD5A"/>
  <text x="76" y="32" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="#0F2418">Primary</text>
  <text x="76" y="66" text-anchor="middle" font-size="11" fill="#7BBF95">filled · main action</text>
  <rect x="152" y="14" width="120" height="36" rx="6" fill="none" stroke="#7BBF95" stroke-width="1.5"/>
  <text x="212" y="32" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="#E3E0DB">Secondary</text>
  <text x="212" y="66" text-anchor="middle" font-size="11" fill="#7BBF95">outlined</text>
  <text x="348" y="32" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="#7BBF95">Ghost</text>
  <text x="348" y="66" text-anchor="middle" font-size="11" fill="#7BBF95">text only · low emphasis</text>
  <rect x="424" y="14" width="120" height="36" rx="6" fill="#B5524A"/>
  <text x="484" y="32" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="#F4E4E1">Delete</text>
  <text x="484" y="66" text-anchor="middle" font-size="11" fill="#7BBF95">destructive</text>
</svg>

- **Primary** (also "filled," "contained," "solid") — the loudest button, a solid fill in the brand/accent color. One per view.
- **Secondary** (also "outline," "outlined") — an outline with no fill. For the lesser action next to a primary, e.g. "Cancel" beside "Save."
- **Ghost** (also "text," "tertiary," "subtle") — just colored text, no border. For low-emphasis actions that shouldn't compete for attention.
- **Destructive** (also "danger") — colored to warn (usually red) because the action removes or irreversibly changes something. Often paired with a confirmation dialog.

## Button states

The same button changes appearance to reflect what's happening. These states are mostly handled for you by a component library, but you need the names to talk about them.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 568 88" role="img" aria-label="Button states: default, hover, focus with ring, disabled, and loading with spinner" style="width:100%;max-width:568px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="22" width="96" height="36" rx="6" fill="#D4AD5A"/>
  <text x="64" y="40" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0F2418">Save</text>
  <text x="64" y="76" text-anchor="middle" font-size="11" fill="#7BBF95">default</text>
  <rect x="126" y="22" width="96" height="36" rx="6" fill="#E3C57E"/>
  <text x="174" y="40" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0F2418">Save</text>
  <text x="174" y="76" text-anchor="middle" font-size="11" fill="#7BBF95">hover</text>
  <rect x="231" y="17" width="106" height="46" rx="9" fill="none" stroke="#7BBF95" stroke-width="2"/>
  <rect x="236" y="22" width="96" height="36" rx="6" fill="#D4AD5A"/>
  <text x="284" y="40" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0F2418">Save</text>
  <text x="284" y="76" text-anchor="middle" font-size="11" fill="#7BBF95">focus (keyboard ring)</text>
  <rect x="346" y="22" width="96" height="36" rx="6" fill="#213A2B"/>
  <text x="394" y="40" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#5E866E">Save</text>
  <text x="394" y="76" text-anchor="middle" font-size="11" fill="#7BBF95">disabled</text>
  <rect x="456" y="22" width="96" height="36" rx="6" fill="#D4AD5A"/>
  <circle cx="504" cy="40" r="8" fill="none" stroke="#0F2418" stroke-width="2.5" stroke-dasharray="38 14" stroke-linecap="round"/>
  <text x="504" y="76" text-anchor="middle" font-size="11" fill="#7BBF95">loading</text>
</svg>

- **Default / resting** — the normal look.
- **Hover** — pointer is over it; usually a small color shift to invite the click.
- **Focus** — selected by keyboard (Tab key). The outline you see is the **focus ring** — do not remove it, it's how keyboard and screen-reader users know where they are.
- **Disabled** — dimmed and unclickable, because the action isn't available yet (e.g. a form isn't valid).
- **Loading** — shows a spinner after a click while work happens, and ignores further clicks so the user can't double-submit.

## Specialized button shapes

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 92" role="img" aria-label="An icon button, a three-segment segmented control with the middle segment selected, and a split button with a dropdown caret" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="18" width="36" height="36" rx="6" fill="none" stroke="#3C6B4E" stroke-width="1.5"/>
  <line x1="24" y1="36" x2="44" y2="36" stroke="#E3E0DB" stroke-width="2" stroke-linecap="round"/>
  <line x1="34" y1="26" x2="34" y2="46" stroke="#E3E0DB" stroke-width="2" stroke-linecap="round"/>
  <text x="34" y="78" text-anchor="middle" font-size="11" fill="#7BBF95">icon button</text>
  <rect x="92" y="18" width="198" height="36" rx="6" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <rect x="158" y="18" width="66" height="36" fill="#D4AD5A"/>
  <line x1="158" y1="18" x2="158" y2="54" stroke="#3C6B4E" stroke-width="1.5"/>
  <line x1="224" y1="18" x2="224" y2="54" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="125" y="36" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">Day</text>
  <text x="191" y="36" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0F2418">Week</text>
  <text x="257" y="36" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">Month</text>
  <text x="191" y="78" text-anchor="middle" font-size="11" fill="#7BBF95">segmented control / button group</text>
  <rect x="330" y="18" width="120" height="36" rx="6" fill="#D4AD5A"/>
  <line x1="416" y1="20" x2="416" y2="52" stroke="#0F2418" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="373" y="36" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0F2418">Save</text>
  <polygon points="427,34 439,34 433,42" fill="#0F2418"/>
  <text x="390" y="78" text-anchor="middle" font-size="11" fill="#7BBF95">split button</text>
</svg>

- **Icon button** — a button whose label is just an icon (a trash can, a gear, a "+"). Compact, but it needs an `aria-label` so screen readers can announce what it does.
- **Segmented control / button group** — a row of connected buttons where one is selected, used to switch between mutually exclusive views (Day / Week / Month). Looks like buttons; behaves like a set of radio options.
- **Split button** — a primary action plus an attached caret that opens a menu of related actions ("Save" / "Save as…" / "Save and close"). The **floating action button (FAB)** is a cousin: a round, fixed-position button for the single most important action on mobile screens.

## Buttons vs. links — the distinction that trips up beginners

They can look identical, but they mean different things, and using the wrong one breaks accessibility:

- A **button** (`<button>`) performs an action *on this page* — submit, open, toggle, delete.
- A **link** (`<a href="…">`) navigates *somewhere* — another page, a section, an external URL.

The test: if the user could reasonably want to right-click → "open in new tab," it's a link. If it changes state or submits data, it's a button. Style a link to look like a button if the design calls for it, but keep the underlying element matched to the behavior — keyboard users, screen readers, and browser features all depend on it. This is the same "semantics vs. styling" split that [[upskill/web-styling/specificity|CSS]] lets you bridge: the element says what a thing *is*, the styles say what it *looks like*.
