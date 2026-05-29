---
title: "Containers & overlays"
summary: "Boxes that group or float content — cards, modals/dialogs, accordions, drawers, and popovers, plus modal vs non-modal behavior."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements
tags:
  - ui
  - card
  - modal
  - dialog
  - accordion
  - drawer
  - popover
  - overlay
  - container
confidence: high
sources: []
---

These are the **boxes**: elements whose job is to hold and group other elements rather than to be clicked themselves. Some sit in the normal flow of the page (a card); others float *above* it (a modal, a drawer, a popover) on a higher layer. The floating kind are called **overlays**, and the big question for any overlay is whether it blocks the rest of the page or not.

## Card

A **card** is a self-contained rectangle grouping a single thing — a person, a server, a product — with its image, title, supporting text, and actions. Cards tile nicely into grids and are the workhorse of dashboards and listings.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 200" role="img" aria-label="A card with a media area at top, a title, two lines of supporting text, and a row of actions, with each part labeled" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="260" height="168" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <path d="M16 24 q0 -8 8 -8 h244 q8 0 8 8 v62 h-260 z" fill="#1F3D2B"/>
  <rect x="126" y="36" width="40" height="30" rx="3" fill="none" stroke="#7BBF95" stroke-width="1.5"/>
  <circle cx="138" cy="46" r="3" fill="#7BBF95"/>
  <polyline points="130,62 142,52 152,58 162,50" fill="none" stroke="#7BBF95" stroke-width="1.5" stroke-linejoin="round"/>
  <text x="32" y="106" font-size="14" font-weight="700" fill="#F0DDB3">iam-script-gab</text>
  <text x="32" y="126" font-size="12" fill="#7BBF95">Scripts host · online</text>
  <text x="32" y="144" font-size="12" fill="#7BBF95">Last deploy 2h ago</text>
  <text x="32" y="167" dominant-baseline="central" font-size="12" font-weight="600" fill="#7BBF95">Details</text>
  <rect x="196" y="152" width="64" height="26" rx="5" fill="#D4AD5A"/>
  <text x="228" y="165" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="#0F2418">Open</text>
  <text x="300" y="50" font-size="11" fill="#7BBF95">◂ media / thumbnail</text>
  <text x="300" y="104" font-size="11" fill="#7BBF95">◂ title</text>
  <text x="300" y="135" font-size="11" fill="#7BBF95">◂ supporting text</text>
  <text x="300" y="166" font-size="11" fill="#7BBF95">◂ actions</text>
</svg>

## Modal / dialog

A **modal** (or **dialog**) is an overlay that pops up in the center and demands attention before you can continue — confirming a delete, editing a record, showing a form. The dark **scrim** (or backdrop) behind it dims and disables the rest of the page; you must complete or dismiss the dialog (× button, Cancel, or Esc) to get back.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 224" role="img" aria-label="A confirmation dialog centered over a dimmed page, with a close button, title, body text, and Cancel and Delete buttons" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="10" y="10" width="540" height="190" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <rect x="10" y="10" width="540" height="190" rx="8" fill="#000000" opacity="0.45"/>
  <rect x="150" y="34" width="260" height="146" rx="10" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="392" y="56" font-size="17" fill="#7BBF95">×</text>
  <text x="166" y="62" font-size="14" font-weight="700" fill="#F0DDB3">Delete user?</text>
  <text x="166" y="92" font-size="12" fill="#7BBF95">This permanently removes the</text>
  <text x="166" y="110" font-size="12" fill="#7BBF95">account and cannot be undone.</text>
  <rect x="166" y="138" width="80" height="30" rx="5" fill="none" stroke="#7BBF95" stroke-width="1.5"/>
  <text x="206" y="153" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="#E3E0DB">Cancel</text>
  <rect x="300" y="138" width="92" height="30" rx="5" fill="#B5524A"/>
  <text x="346" y="153" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="#F4E4E1">Delete</text>
  <text x="280" y="216" text-anchor="middle" font-size="11" fill="#7BBF95">the scrim dims the page; the modal blocks interaction until dismissed</text>
</svg>

A **non-modal** overlay (sometimes a "modeless" dialog) floats over the page *without* a scrim and lets you keep working around it. "Modal" specifically means "blocks everything else."

## Accordion

An **accordion** is a stack of collapsible sections (each a **disclosure** / expand-collapse panel). Clicking a header toggles its content open or shut, with a chevron rotating to show the state. Good for FAQs and long settings pages where you want to show structure without dumping everything at once.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 200" role="img" aria-label="An accordion with three section headers; the middle one is expanded to reveal its content, with chevrons indicating open and closed states" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="528" height="36" rx="6" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="32" y="34" dominant-baseline="central" font-size="13" fill="#E3E0DB">What is provisioning?</text>
  <polygon points="516,27 516,41 524,34" fill="#7BBF95"/>
  <rect x="16" y="58" width="528" height="36" rx="6" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="32" y="76" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">How do drivers sync?</text>
  <polygon points="512,72 526,72 519,80" fill="#D4AD5A"/>
  <rect x="16" y="94" width="528" height="44" rx="6" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="32" y="116" dominant-baseline="central" font-size="12" fill="#7BBF95">A driver watches one directory and pushes changes to another in near-real time.</text>
  <rect x="16" y="144" width="528" height="36" rx="6" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="32" y="162" dominant-baseline="central" font-size="13" fill="#E3E0DB">What about deprovisioning?</text>
  <polygon points="516,155 516,169 524,162" fill="#7BBF95"/>
  <text x="280" y="194" text-anchor="middle" font-size="11" fill="#7BBF95">accordion — chevron right = collapsed, chevron down = expanded</text>
</svg>

## Drawer and popover

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 200" role="img" aria-label="A drawer panel sliding in from the right over a dimmed page, and a popover floating above a Filters button with an arrow pointing at it" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="250" height="160" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <rect x="16" y="16" width="250" height="160" rx="8" fill="#000000" opacity="0.4"/>
  <path d="M170 16 h88 q8 0 8 8 v144 q0 8 -8 8 h-88 z" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="184" y="40" dominant-baseline="central" font-size="12" font-weight="700" fill="#F0DDB3">Menu</text>
  <text x="184" y="66" dominant-baseline="central" font-size="12" fill="#E3E0DB">Home</text>
  <text x="184" y="90" dominant-baseline="central" font-size="12" fill="#E3E0DB">Docs</text>
  <text x="184" y="114" dominant-baseline="central" font-size="12" fill="#E3E0DB">About</text>
  <text x="141" y="192" text-anchor="middle" font-size="11" fill="#7BBF95">drawer — slides in over a dimmed page</text>
  <rect x="320" y="118" width="110" height="32" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="375" y="134" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">Filters</text>
  <rect x="320" y="28" width="150" height="76" rx="6" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <polygon points="368,103 380,103 374,113" fill="#1A3A26"/>
  <text x="332" y="48" dominant-baseline="central" font-size="12" font-weight="600" fill="#F0DDB3">Status</text>
  <rect x="332" y="60" width="14" height="14" rx="3" fill="#D4AD5A"/>
  <path d="M335 67 L338 70 L344 63" fill="none" stroke="#0F2418" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="354" y="68" dominant-baseline="central" font-size="12" fill="#E3E0DB">Active</text>
  <rect x="332" y="82" width="14" height="14" rx="3" fill="none" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="354" y="90" dominant-baseline="central" font-size="12" fill="#E3E0DB">Disabled</text>
  <text x="395" y="192" text-anchor="middle" font-size="11" fill="#7BBF95">popover — anchored to a trigger</text>
</svg>

- **Drawer** (also "off-canvas panel," "sheet") — a panel that slides in from an edge (left, right, top, bottom). The hamburger menu on mobile usually opens a left drawer; settings and filters often open a right one. Like a modal, it typically dims the page behind it.
- **Popover** — a small floating panel anchored to the element that opened it, with a little arrow pointing back at the trigger. Used for filters, extra options, or a richer hover card. Unlike a modal it doesn't block the page, and unlike a [[upskill/ui-elements/feedback|tooltip]] it can hold interactive controls (buttons, checkboxes), not just a line of text.

A couple of plainer containers round out the family: a **panel** or **section** is just a bordered/background box grouping related content in the normal page flow (no floating), and a **well** is an inset, slightly recessed box. They're the quiet relatives of the card — grouping without the polish.
