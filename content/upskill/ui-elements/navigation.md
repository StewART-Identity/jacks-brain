---
title: "Navigation"
summary: "How users move around an app — navbars, tabs, breadcrumbs, pagination, sidebars, dropdown menus, and the hamburger pattern."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements
tags:
  - ui
  - navigation
  - navbar
  - tabs
  - breadcrumbs
  - pagination
  - sidebar
  - menu
  - hamburger
confidence: high
sources: []
---

**Navigation** elements answer two questions for the user: *where am I?* and *where can I go?* They're the scaffolding that turns a pile of pages into something you can move through without getting lost. The patterns below cover almost every app you'll build.

## The navbar

The **navigation bar** (navbar) is the persistent strip — usually across the top — holding the logo and the top-level links. The link for the current page is typically highlighted (the **active** state).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 70" role="img" aria-label="A horizontal navigation bar with a logo on the left and Home, Docs, and About links on the right, with Home highlighted as active" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="10" y="14" width="540" height="40" rx="6" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <circle cx="32" cy="34" r="8" fill="#D4AD5A"/>
  <text x="48" y="34" dominant-baseline="central" font-size="14" font-weight="700" fill="#F0DDB3">Acme</text>
  <text x="380" y="34" dominant-baseline="central" text-anchor="middle" font-size="13" font-weight="600" fill="#F0DDB3">Home</text>
  <line x1="358" y1="46" x2="402" y2="46" stroke="#D4AD5A" stroke-width="2.5" stroke-linecap="round"/>
  <text x="450" y="34" dominant-baseline="central" text-anchor="middle" font-size="13" fill="#7BBF95">Docs</text>
  <text x="515" y="34" dominant-baseline="central" text-anchor="middle" font-size="13" fill="#7BBF95">About</text>
  <text x="280" y="66" text-anchor="middle" font-size="11" fill="#7BBF95">top navigation bar — logo + top-level links, current page highlighted</text>
</svg>

On narrow screens the links usually collapse behind a **hamburger menu** — the three-line ☰ icon that opens a [[upskill/ui-elements/containers|drawer]] of links. The hamburger is so common it's worth recognizing on sight; it almost always means "the navigation is hiding in here."

## Tabs

**Tabs** switch between views *within the same page* without navigating away. The active tab is marked (here, an underline), and the panel below changes while everything around it stays put.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 128" role="img" aria-label="A row of three tabs, Overview Activity and Settings, with Overview active and underlined, above a content panel" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <line x1="16" y1="40" x2="544" y2="40" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="62" y="24" text-anchor="middle" font-size="13" font-weight="600" fill="#F0DDB3">Overview</text>
  <line x1="20" y1="40" x2="104" y2="40" stroke="#D4AD5A" stroke-width="3" stroke-linecap="round"/>
  <text x="180" y="24" text-anchor="middle" font-size="13" fill="#7BBF95">Activity</text>
  <text x="300" y="24" text-anchor="middle" font-size="13" fill="#7BBF95">Settings</text>
  <rect x="16" y="52" width="528" height="50" rx="6" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="32" y="77" dominant-baseline="central" font-size="13" fill="#7BBF95">Content for the “Overview” tab appears here.</text>
  <text x="280" y="120" text-anchor="middle" font-size="11" fill="#7BBF95">tabs — swap panels in place; the rest of the page stays</text>
</svg>

Tabs vs. a [[upskill/ui-elements/buttons|segmented control]]: they overlap, but tabs imply "different content panels," while a segmented control implies "different mode/filter for the same content."

## Breadcrumbs and pagination

Both tell the user their position in a larger structure.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 110" role="img" aria-label="A breadcrumb trail reading Home, Reports, Q2 Summary, and below it a pagination control with page 1 selected among pages 1 2 3 ellipsis 9 with previous and next arrows" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <text x="16" y="24" dominant-baseline="central" font-size="13" fill="#7BBF95">Home</text>
  <text x="62" y="24" dominant-baseline="central" font-size="13" fill="#5E866E">›</text>
  <text x="78" y="24" dominant-baseline="central" font-size="13" fill="#7BBF95">Reports</text>
  <text x="142" y="24" dominant-baseline="central" font-size="13" fill="#5E866E">›</text>
  <text x="158" y="24" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Q2 Summary</text>
  <text x="16" y="48" font-size="11" fill="#7BBF95">breadcrumbs — the path from the top down to the current page</text>
  <rect x="16" y="64" width="30" height="30" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="31" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">‹</text>
  <rect x="54" y="64" width="30" height="30" rx="5" fill="#D4AD5A"/>
  <text x="69" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0F2418">1</text>
  <rect x="92" y="64" width="30" height="30" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="107" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">2</text>
  <rect x="130" y="64" width="30" height="30" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="145" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">3</text>
  <text x="178" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#7BBF95">…</text>
  <rect x="196" y="64" width="30" height="30" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="211" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">9</text>
  <rect x="234" y="64" width="30" height="30" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="249" y="79" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">›</text>
  <text x="280" y="106" text-anchor="middle" font-size="11" fill="#7BBF95">pagination — step through pages of a long result set</text>
</svg>

- **Breadcrumbs** — the trail from the home/top level down to where you are (`Home › Reports › Q2 Summary`). The last item is the current page and isn't a link. Great for deep hierarchies.
- **Pagination** — splits a long list of results into numbered pages with previous/next controls. The alternative is **infinite scroll**, which loads more as you reach the bottom instead of using page numbers.

## Sidebars and dropdown menus

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 186" role="img" aria-label="A vertical sidebar navigation with Dashboard active among People Reports and Settings, and an open dropdown menu with Profile, a hovered Settings item, a divider, and Sign out" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="180" height="150" rx="6" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <rect x="16" y="28" width="180" height="30" fill="#213A2B"/>
  <rect x="16" y="28" width="3" height="30" fill="#D4AD5A"/>
  <circle cx="34" cy="43" r="3" fill="#D4AD5A"/>
  <text x="46" y="43" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Dashboard</text>
  <circle cx="34" cy="79" r="3" fill="#7BBF95"/>
  <text x="46" y="79" dominant-baseline="central" font-size="13" fill="#E3E0DB">People</text>
  <circle cx="34" cy="115" r="3" fill="#7BBF95"/>
  <text x="46" y="115" dominant-baseline="central" font-size="13" fill="#E3E0DB">Reports</text>
  <circle cx="34" cy="151" r="3" fill="#7BBF95"/>
  <text x="46" y="151" dominant-baseline="central" font-size="13" fill="#E3E0DB">Settings</text>
  <text x="106" y="180" text-anchor="middle" font-size="11" fill="#7BBF95">sidebar / side nav</text>
  <rect x="300" y="16" width="150" height="32" rx="5" fill="#15301E" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="314" y="32" dominant-baseline="central" font-size="13" fill="#E3E0DB">Account</text>
  <polygon points="424,28 438,28 431,36" fill="#7BBF95"/>
  <rect x="300" y="56" width="170" height="106" rx="6" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="314" y="80" dominant-baseline="central" font-size="13" fill="#E3E0DB">Profile</text>
  <rect x="304" y="94" width="162" height="26" fill="#264732"/>
  <text x="314" y="107" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Settings</text>
  <line x1="312" y1="132" x2="458" y2="132" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="314" y="148" dominant-baseline="central" font-size="13" fill="#C9685E">Sign out</text>
  <text x="385" y="180" text-anchor="middle" font-size="11" fill="#7BBF95">dropdown menu (open)</text>
</svg>

- **Sidebar / side navigation** — a vertical list of destinations along the edge, common in dashboards and admin tools. Often collapsible to just icons. The active item is highlighted, frequently with an accent bar.
- **Dropdown menu** — a list of actions or links that pops open from a trigger (a button, an avatar, a "⋮" kebab icon) and closes when you pick one or click away. Note the **divider** separating routine items from a destructive one like "Sign out," and the **hover** highlight on the focused item.

A quick disambiguation, since the words blur: a **menu** is a list of *actions/links* (you pick and it does something or navigates); a [[upskill/ui-elements/form-controls|select]] is a *form control* (you pick and it sets a value to submit later). They can look the same; what differs is whether the choice is an action or a value.
