---
title: "Feedback & status"
summary: "Telling the user what happened or what's going on — alerts, toasts, tooltips, badges, progress bars, spinners, and skeletons."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements
tags:
  - ui
  - alert
  - toast
  - tooltip
  - badge
  - progress
  - spinner
  - skeleton
  - feedback
confidence: high
sources: []
---

Feedback elements close the loop with the user: *that worked*, *that failed*, *this is loading*, *something needs your attention*. They differ mainly along two axes — how loud they are, and whether they go away on their own — and picking the wrong one is jarring (a blocking dialog for a trivial success, or a silent failure for a destructive one).

## Alerts and banners

An **alert** (or **banner** / **callout**) is an inline message block that sits in the page and stays until dismissed or resolved. Color and icon encode the **severity**: info, success, warning, error. This is the single most useful feedback pattern to recognize, because the four-color severity scheme repeats everywhere.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 182" role="img" aria-label="Four stacked alert banners in info blue, success green, warning gold, and error red, each with an icon and a message" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="528" height="32" rx="6" fill="#16303A"/>
  <rect x="16" y="16" width="4" height="32" fill="#5B8AA6"/>
  <circle cx="36" cy="32" r="8" fill="#5B8AA6"/>
  <text x="36" y="32" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="#0F2418">i</text>
  <text x="54" y="32" dominant-baseline="central" font-size="12" fill="#E3E0DB">Heads up — scheduled maintenance tonight at 2 AM.</text>
  <text x="520" y="32" text-anchor="end" dominant-baseline="central" font-size="11" fill="#7BBF95">info</text>
  <rect x="16" y="54" width="528" height="32" rx="6" fill="#163A28"/>
  <rect x="16" y="54" width="4" height="32" fill="#4FAE6F"/>
  <circle cx="36" cy="70" r="8" fill="#4FAE6F"/>
  <path d="M32 70 L35 73 L40 66" fill="none" stroke="#0F2418" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="54" y="70" dominant-baseline="central" font-size="12" fill="#E3E0DB">User provisioned successfully.</text>
  <text x="520" y="70" text-anchor="end" dominant-baseline="central" font-size="11" fill="#7BBF95">success</text>
  <rect x="16" y="92" width="528" height="32" rx="6" fill="#3A3320"/>
  <rect x="16" y="92" width="4" height="32" fill="#D4AD5A"/>
  <circle cx="36" cy="108" r="8" fill="#D4AD5A"/>
  <text x="36" y="108" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="#0F2418">!</text>
  <text x="54" y="108" dominant-baseline="central" font-size="12" fill="#E3E0DB">This certificate expires in 3 days.</text>
  <text x="520" y="108" text-anchor="end" dominant-baseline="central" font-size="11" fill="#7BBF95">warning</text>
  <rect x="16" y="130" width="528" height="32" rx="6" fill="#3A2120"/>
  <rect x="16" y="130" width="4" height="32" fill="#C9685E"/>
  <circle cx="36" cy="146" r="8" fill="#C9685E"/>
  <text x="36" y="146" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="#0F2418">×</text>
  <text x="54" y="146" dominant-baseline="central" font-size="12" fill="#E3E0DB">Sync failed — check the driver log.</text>
  <text x="520" y="146" text-anchor="end" dominant-baseline="central" font-size="11" fill="#7BBF95">error</text>
</svg>

## Toasts and tooltips

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 160" role="img" aria-label="A toast notification confirming changes saved with an undo action, and a tooltip bubble appearing above a question-mark icon" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="78" width="290" height="46" rx="8" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <circle cx="42" cy="101" r="10" fill="#4FAE6F"/>
  <path d="M37 101 L40 104 L47 96" fill="none" stroke="#0F2418" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="62" y="95" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Changes saved</text>
  <text x="62" y="111" dominant-baseline="central" font-size="11" fill="#7BBF95">iam-script-gab updated</text>
  <text x="278" y="101" text-anchor="end" dominant-baseline="central" font-size="12" font-weight="700" fill="#D4AD5A">UNDO</text>
  <text x="161" y="146" text-anchor="middle" font-size="11" fill="#7BBF95">toast / snackbar — brief, auto-dismissing</text>
  <rect x="404" y="50" width="112" height="30" rx="5" fill="#0A1A12" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="460" y="65" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#E3E0DB">Last login time</text>
  <polygon points="454,80 466,80 460,88" fill="#0A1A12"/>
  <circle cx="460" cy="102" r="12" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="460" y="102" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#7BBF95">?</text>
  <text x="460" y="146" text-anchor="middle" font-size="11" fill="#7BBF95">tooltip — on hover/focus</text>
</svg>

- **Toast / snackbar** — a small notification that slides into a corner, confirms something briefly, and disappears on its own after a few seconds. For non-critical, "it worked" feedback. Often carries one quick action ("Undo"). Don't use it for errors the user must act on — those need an [[upskill/ui-elements/feedback|alert]] or a [[upskill/ui-elements/containers|dialog]] that persists.
- **Tooltip** — a tiny text label that appears on hover or keyboard focus to explain an icon or truncated text. Text only; if it needs buttons or inputs, it's a [[upskill/ui-elements/containers|popover]], not a tooltip.

## Badges and status dots

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 96" role="img" aria-label="A mail icon with a count badge, status pills reading Active Disabled and Beta, and an avatar with a status dot" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="26" y="32" width="32" height="22" rx="3" fill="none" stroke="#E3E0DB" stroke-width="1.5"/>
  <polyline points="27,34 42,46 57,34" fill="none" stroke="#E3E0DB" stroke-width="1.5"/>
  <circle cx="58" cy="32" r="9" fill="#C9685E"/>
  <text x="58" y="32" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#F4E4E1">3</text>
  <text x="42" y="80" text-anchor="middle" font-size="11" fill="#7BBF95">count badge</text>
  <rect x="138" y="32" width="70" height="22" rx="11" fill="#163A28" stroke="#4FAE6F" stroke-width="1.5"/>
  <text x="173" y="43" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#4FAE6F">Active</text>
  <rect x="216" y="32" width="80" height="22" rx="11" fill="#2A2320" stroke="#C9685E" stroke-width="1.5"/>
  <text x="256" y="43" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#C9685E">Disabled</text>
  <rect x="304" y="32" width="58" height="22" rx="11" fill="#16303A" stroke="#5B8AA6" stroke-width="1.5"/>
  <text x="333" y="43" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#5B8AA6">Beta</text>
  <text x="250" y="80" text-anchor="middle" font-size="11" fill="#7BBF95">status pills / tags</text>
  <circle cx="442" cy="42" r="16" fill="#213A2B" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="442" y="42" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#E3E0DB">JS</text>
  <circle cx="455" cy="30" r="5" fill="#4FAE6F" stroke="#0F2418" stroke-width="1.5"/>
  <text x="442" y="80" text-anchor="middle" font-size="11" fill="#7BBF95">status dot</text>
</svg>

- **Badge** — a small count or marker attached to something else: the "3" on a mail icon, a "New" flag. A **pill** / **tag** / **chip** is the rounded label form, often color-coded for status (covered more under [[upskill/ui-elements/data-display|data display]]).
- **Status dot** — a tiny colored circle (green online, red error) overlaid on an avatar or row to show state at a glance with no text.

## Loading states

Three different answers to "the app is busy," chosen by how much you know about the wait.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 144" role="img" aria-label="A determinate progress bar at sixty percent, an indeterminate circular spinner, and a skeleton placeholder with a circle and two gray bars" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <text x="16" y="22" font-size="12" fill="#E3E0DB">Uploading… 60%</text>
  <rect x="16" y="32" width="300" height="10" rx="5" fill="#213A2B"/>
  <rect x="16" y="32" width="180" height="10" rx="5" fill="#D4AD5A"/>
  <text x="16" y="62" font-size="11" fill="#7BBF95">progress bar — determinate (you know the %)</text>
  <circle cx="400" cy="36" r="14" fill="none" stroke="#2E5C40" stroke-width="4"/>
  <circle cx="400" cy="36" r="14" fill="none" stroke="#D4AD5A" stroke-width="4" stroke-dasharray="24 64" stroke-linecap="round" transform="rotate(-90 400 36)"/>
  <text x="400" y="62" text-anchor="middle" font-size="11" fill="#7BBF95">spinner — indeterminate</text>
  <circle cx="36" cy="100" r="14" fill="#213A2B"/>
  <rect x="60" y="88" width="200" height="11" rx="5" fill="#213A2B"/>
  <rect x="60" y="106" width="130" height="11" rx="5" fill="#1E3829"/>
  <text x="16" y="136" font-size="11" fill="#7BBF95">skeleton — gray placeholders shaped like the coming content</text>
</svg>

- **Progress bar** — a filling bar for a task whose completion you can measure (a file upload, a multi-step wizard). This is **determinate**.
- **Spinner / loader** — a rotating indicator for an unknown wait (a request in flight). This is **indeterminate** — it shows "working" without a percentage.
- **Skeleton** — gray placeholder shapes laid out like the content that's about to appear. It makes loading feel faster and avoids the layout jumping when real data arrives. Use it for whole sections of content; use a spinner for a single small action.
