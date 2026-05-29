---
title: "Data display"
summary: "Showing structured information back to the user — tables, lists, chips, avatars, tree views, key–value pairs, and stat tiles."
type: concept
created: 2026-05-29
updated: 2026-05-29
subjects:
  - ui-elements
tags:
  - ui
  - table
  - list
  - chip
  - avatar
  - tree
  - data-display
confidence: high
sources: []
---

Where [[upskill/ui-elements/form-controls|form controls]] take input *in*, data-display elements put structured information *out*. The recurring question is shape: one record with many fields wants a different element than many records with the same fields, and a hierarchy wants a different one again. Naming these correctly is most of the battle when you're reading someone else's component library.

## Table

A **table** lays out records as rows and fields as columns. The top **header row** names each column; a **sortable column** carries a sort indicator (an up/down caret) and reorders the rows when clicked. Tables are the right call when records share the same fields and the user wants to scan or compare *across* them.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 184" role="img" aria-label="A data table with a header row, a sortable Name column showing an ascending caret, and three rows of users with status pills" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="528" height="152" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <path d="M24 16 h512 a8 8 0 0 1 8 8 v16 h-528 v-16 a8 8 0 0 1 8 -8 z" fill="#1A3A26"/>
  <text x="32" y="32" dominant-baseline="central" font-size="12" font-weight="700" fill="#F0DDB3">Name</text>
  <path d="M96 28 l8 0 l-4 -5 z" fill="#D4AD5A"/>
  <path d="M96 35 l8 0 l-4 5 z" fill="#5E866E"/>
  <text x="240" y="32" dominant-baseline="central" font-size="12" font-weight="700" fill="#F0DDB3">Domain</text>
  <text x="420" y="32" dominant-baseline="central" font-size="12" font-weight="700" fill="#F0DDB3">Status</text>
  <line x1="16" y1="80" x2="544" y2="80" stroke="#2E5C40" stroke-width="1"/>
  <line x1="16" y1="124" x2="544" y2="124" stroke="#2E5C40" stroke-width="1"/>
  <text x="32" y="62" dominant-baseline="central" font-size="12" fill="#E3E0DB">Jack Stewart</text>
  <text x="240" y="62" dominant-baseline="central" font-size="12" fill="#7BBF95">UNT</text>
  <rect x="420" y="51" width="64" height="20" rx="10" fill="#163A28" stroke="#4FAE6F" stroke-width="1.5"/>
  <text x="452" y="62" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#4FAE6F">Active</text>
  <text x="32" y="102" dominant-baseline="central" font-size="12" fill="#E3E0DB">Ryan Kane</text>
  <text x="240" y="102" dominant-baseline="central" font-size="12" fill="#7BBF95">HSC</text>
  <rect x="420" y="91" width="64" height="20" rx="10" fill="#163A28" stroke="#4FAE6F" stroke-width="1.5"/>
  <text x="452" y="102" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#4FAE6F">Active</text>
  <text x="32" y="146" dominant-baseline="central" font-size="12" fill="#E3E0DB">Parker Bush</text>
  <text x="240" y="146" dominant-baseline="central" font-size="12" fill="#7BBF95">STUDENTS</text>
  <rect x="420" y="135" width="74" height="20" rx="10" fill="#2A2320" stroke="#C9685E" stroke-width="1.5"/>
  <text x="457" y="146" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#C9685E">Disabled</text>
</svg>

A few terms you'll meet around tables: a **data grid** is a heavier, interactive table (inline editing, column resizing, frozen headers); **pagination** or **infinite scroll** (see [[upskill/ui-elements/navigation|navigation]]) breaks a long table into pages; and the colored **status pills** in that last column are the [[upskill/ui-elements/feedback|badge]] pattern reused inside rows.

## List and list item

A **list** stacks **list items** vertically. Unlike a table, each item is a self-contained unit rather than a row of aligned cells — so lists handle uneven content (an icon, a title, a line of secondary text, a trailing control) far more gracefully. Reach for a list when the records are things you tap *into*, and for a table when you scan *across* fields.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 168" role="img" aria-label="A vertical list of three items, each with a leading avatar circle, a primary title, a secondary line of text, and a trailing chevron" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="528" height="136" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <line x1="16" y1="61" x2="544" y2="61" stroke="#2E5C40" stroke-width="1"/>
  <line x1="16" y1="106" x2="544" y2="106" stroke="#2E5C40" stroke-width="1"/>
  <circle cx="44" cy="38" r="14" fill="#213A2B" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="44" y="38" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#E3E0DB">JS</text>
  <text x="70" y="33" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Jack Stewart</text>
  <text x="70" y="48" dominant-baseline="central" font-size="11" fill="#7BBF95">IAM Engineer · UNT System</text>
  <path d="M520 32 l8 6 l-8 6" fill="none" stroke="#5E866E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="44" cy="83" r="14" fill="#213A2B" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="44" y="83" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#E3E0DB">RK</text>
  <text x="70" y="78" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Ryan Kane</text>
  <text x="70" y="93" dominant-baseline="central" font-size="11" fill="#7BBF95">IAM Engineer · HSC</text>
  <path d="M520 77 l8 6 l-8 6" fill="none" stroke="#5E866E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="44" cy="128" r="14" fill="#213A2B" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="44" y="128" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#E3E0DB">PB</text>
  <text x="70" y="123" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">Parker Bush</text>
  <text x="70" y="138" dominant-baseline="central" font-size="11" fill="#7BBF95">Manager · IAM</text>
  <path d="M520 122 l8 6 l-8 6" fill="none" stroke="#5E866E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

The two-line pattern above — bold **primary text** with muted **secondary text** beneath — is so common it has a name in most design systems (a "two-line list item"). The leading circle is an *avatar* and the trailing **›** is a *chevron* hinting the row is tappable.

## Chips and tags

A **chip** (or **tag**) is a small, rounded, self-contained token. Two flavors dominate: a **removable chip** carries an **×** to delete it (the selected-filter or recipient pattern), and a plain **tag** just labels or categorizes. The visual is close to a [[upskill/ui-elements/feedback|badge]], but the distinction is interactivity — chips are usually things the user added and can remove, whereas badges are read-only status the system applied.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 96" role="img" aria-label="A row of removable filter chips each with an x, and below them three plain category tags" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="14" width="120" height="28" rx="14" fill="#1A3A26" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="34" y="28" dominant-baseline="central" font-size="12" fill="#E3E0DB">Domain: UNT</text>
  <path d="M118 23 l8 8 M126 23 l-8 8" stroke="#7BBF95" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="146" y="14" width="104" height="28" rx="14" fill="#1A3A26" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="164" y="28" dominant-baseline="central" font-size="12" fill="#E3E0DB">Active only</text>
  <path d="M232 23 l8 8 M240 23 l-8 8" stroke="#7BBF95" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="260" y="14" width="96" height="28" rx="14" fill="#1A3A26" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="278" y="28" dominant-baseline="central" font-size="12" fill="#E3E0DB">Has email</text>
  <path d="M338 23 l8 8 M346 23 l-8 8" stroke="#7BBF95" stroke-width="1.5" stroke-linecap="round"/>
  <text x="16" y="58" dominant-baseline="central" font-size="11" fill="#7BBF95">removable filter chips ↑   plain tags ↓</text>
  <rect x="16" y="66" width="64" height="22" rx="6" fill="#16303A"/>
  <text x="48" y="77" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#5B8AA6">eDirectory</text>
  <rect x="90" y="66" width="48" height="22" rx="6" fill="#163A28"/>
  <text x="114" y="77" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#4FAE6F">Entra</text>
  <rect x="148" y="66" width="40" height="22" rx="6" fill="#3A3320"/>
  <text x="168" y="77" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#D4AD5A">IDM</text>
</svg>

## Avatars

An **avatar** is a small circular (sometimes rounded-square) image standing in for a person or entity — a photo, or **initials** on a colored background as a fallback. When several belong together, an **avatar group** (or **stack**) overlaps them and caps the visible count with an **overflow** token like "+3", so a crowd reads as one compact cluster.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 110" role="img" aria-label="A single initials avatar, a photo-style avatar, and an overlapping avatar group of four circles ending in a plus-three overflow token" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <circle cx="48" cy="44" r="22" fill="#213A2B" stroke="#3C6B4E" stroke-width="1.5"/>
  <text x="48" y="44" text-anchor="middle" dominant-baseline="central" font-size="15" fill="#E3E0DB">JS</text>
  <text x="48" y="90" text-anchor="middle" font-size="11" fill="#7BBF95">initials</text>
  <circle cx="132" cy="44" r="22" fill="#2E5C40"/>
  <circle cx="132" cy="37" r="8" fill="#7BBF95"/>
  <path d="M116 60 a16 14 0 0 1 32 0 z" fill="#7BBF95"/>
  <text x="132" y="90" text-anchor="middle" font-size="11" fill="#7BBF95">photo</text>
  <circle cx="280" cy="44" r="20" fill="#213A2B" stroke="#0F2418" stroke-width="2.5"/>
  <text x="280" y="44" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">JS</text>
  <circle cx="308" cy="44" r="20" fill="#1A3A26" stroke="#0F2418" stroke-width="2.5"/>
  <text x="308" y="44" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">RK</text>
  <circle cx="336" cy="44" r="20" fill="#213A2B" stroke="#0F2418" stroke-width="2.5"/>
  <text x="336" y="44" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#E3E0DB">PB</text>
  <circle cx="364" cy="44" r="20" fill="#15301E" stroke="#0F2418" stroke-width="2.5"/>
  <text x="364" y="44" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="#D4AD5A">+3</text>
  <text x="322" y="90" text-anchor="middle" font-size="11" fill="#7BBF95">avatar group / stack</text>
</svg>

## Tree view

A **tree view** shows hierarchy: nested rows where each branch has a **disclosure triangle** to expand or collapse its children, and **indentation** encodes depth. This is the natural shape for anything genuinely nested — a file system, an org chart, or an LDAP/eDirectory directory tree (which is exactly why it'll feel familiar from iManager).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 168" role="img" aria-label="A tree view of a directory: an expanded root containing two child containers, one of which is expanded to show two leaf entries" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="528" height="136" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <path d="M34 34 l10 6 l-10 6 z" fill="#D4AD5A"/>
  <text x="52" y="40" dominant-baseline="central" font-size="13" font-weight="600" fill="#F0DDB3">IDTREE</text>
  <path d="M64 60 l10 6 l-10 6 z" fill="#D4AD5A"/>
  <text x="82" y="66" dominant-baseline="central" font-size="12" fill="#E3E0DB">ou=people</text>
  <line x1="78" y1="82" x2="78" y2="120" stroke="#2E5C40" stroke-width="1.5"/>
  <line x1="78" y1="92" x2="94" y2="92" stroke="#2E5C40" stroke-width="1.5"/>
  <circle cx="104" cy="92" r="4" fill="#7BBF95"/>
  <text x="116" y="92" dominant-baseline="central" font-size="12" fill="#E3E0DB">cn=jstewart</text>
  <line x1="78" y1="118" x2="94" y2="118" stroke="#2E5C40" stroke-width="1.5"/>
  <circle cx="104" cy="118" r="4" fill="#7BBF95"/>
  <text x="116" y="118" dominant-baseline="central" font-size="12" fill="#E3E0DB">cn=rkane</text>
  <path d="M64 138 l12 0 l-6 10 z" fill="#5E866E"/>
  <text x="82" y="143" dominant-baseline="central" font-size="12" fill="#E3E0DB">ou=groups</text>
</svg>

A solid right-pointing triangle means a **collapsed** node (children hidden); a down-pointing one means **expanded**. The dimmed triangle on `ou=groups` marks a collapsed branch you could open.

## Key–value pairs and stat tiles

For the inverse of a table — *one* record shown with all its fields — two patterns recur. A **description list** (or **key–value list**) pairs each field **label** with its **value** down the page; it's the standard "details panel" or "profile" layout. A **stat tile** (or **metric card** / **KPI**) blows a single number up large with a caption and often a **delta** showing change, for dashboards where the headline figure matters more than the breakdown.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 168" role="img" aria-label="On the left a key-value detail list with four label and value pairs, on the right two stat tiles each showing a large number, a caption, and a change indicator" style="width:100%;max-width:560px;height:auto;display:block;margin:0.75rem 0;font-family:'Source Sans Pro',system-ui,sans-serif">
  <rect x="16" y="16" width="276" height="136" rx="8" fill="#15301E" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="32" y="40" dominant-baseline="central" font-size="11" fill="#7BBF95">EUID</text>
  <text x="276" y="40" text-anchor="end" dominant-baseline="central" font-size="12" fill="#E3E0DB">ms2555</text>
  <line x1="32" y1="56" x2="276" y2="56" stroke="#2E5C40" stroke-width="1"/>
  <text x="32" y="72" dominant-baseline="central" font-size="11" fill="#7BBF95">Domain</text>
  <text x="276" y="72" text-anchor="end" dominant-baseline="central" font-size="12" fill="#E3E0DB">unt.ad.unt.edu</text>
  <line x1="32" y1="88" x2="276" y2="88" stroke="#2E5C40" stroke-width="1"/>
  <text x="32" y="104" dominant-baseline="central" font-size="11" fill="#7BBF95">Title</text>
  <text x="276" y="104" text-anchor="end" dominant-baseline="central" font-size="12" fill="#E3E0DB">IAM Engineer</text>
  <line x1="32" y1="120" x2="276" y2="120" stroke="#2E5C40" stroke-width="1"/>
  <text x="32" y="136" dominant-baseline="central" font-size="11" fill="#7BBF95">Status</text>
  <text x="276" y="136" text-anchor="end" dominant-baseline="central" font-size="12" fill="#4FAE6F">Active</text>
  <rect x="308" y="16" width="236" height="62" rx="8" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="324" y="36" dominant-baseline="central" font-size="11" fill="#7BBF95">Provisioned today</text>
  <text x="324" y="60" dominant-baseline="central" font-size="24" font-weight="700" fill="#F0DDB3">1,284</text>
  <text x="528" y="60" text-anchor="end" dominant-baseline="central" font-size="12" font-weight="700" fill="#4FAE6F">▲ 6%</text>
  <rect x="308" y="90" width="236" height="62" rx="8" fill="#1A3A26" stroke="#2E5C40" stroke-width="1.5"/>
  <text x="324" y="110" dominant-baseline="central" font-size="11" fill="#7BBF95">Deactivations</text>
  <text x="324" y="134" dominant-baseline="central" font-size="24" font-weight="700" fill="#F0DDB3">37</text>
  <text x="528" y="134" text-anchor="end" dominant-baseline="central" font-size="12" font-weight="700" fill="#C9685E">▼ 12%</text>
</svg>

---

That covers the families worth knowing by name. The quick mental model: **table** for many records compared across fields, **list** for many records tapped into, **key–value list** for one record's fields, **tree** for hierarchy, **stat tile** for one headline number — and **chips**, **tags**, **avatars**, and **badges** as the small tokens that decorate all of them.

Back to the [[upskill/ui-elements/index|UI Elements overview]], or sideways to [[upskill/ui-elements/feedback|Feedback & status]] for the badge and status-pill patterns these tables and lists reuse.
