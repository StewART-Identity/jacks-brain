---
title: "Web UI Elements"
summary: "A visual vocabulary of the building blocks of web interfaces — buttons, inputs, navigation, containers, overlays, and feedback — with labeled diagrams. A reference for the road into front-end work."
created: 2026-05-29
updated: 2026-05-29
tags:
  - frontend
  - ui
  - ux
  - design
  - vocabulary
  - reference
  - web
---

A field guide to the parts of a web interface and what they are called. Naming things is half of learning them: once a control has a name, you can search for it, read its accessibility rules, and recognise it in a component library. Each section opens with a labeled diagram, then defines the vocabulary. Terms are in **bold**, with common synonyms in parentheses.

A few words that apply everywhere first:

- **Component** — a reusable, self-contained piece of UI (a button, a card, a date picker). Front-end frameworks are largely about composing components.
- **Element** — in casual use, any visible piece of the UI; in HTML specifically, a tag like `<button>` or `<input>`.
- **Control** (widget) — an element the user operates: anything clickable, typeable, or draggable.
- **Affordance** — a visual hint that something is interactive (a raised button "asks" to be pressed; an underline "asks" to be clicked).
- **Icon** vs **glyph** — an icon is a small symbolic image standing for an action or object; a glyph is a single drawn character from a font. Icons are often drawn as SVG; glyphs come from icon fonts.
- **Label** — the human-readable text naming a control or region.
- **State** — the current condition of a control (resting, hovered, focused, disabled, loading…). Covered in its own section near the end.

---

## Anatomy of a page

![Anatomy of a page — header, hero, main content, sidebar, footer](/static/ui-guide/page-anatomy.svg)

The large regions a page is divided into. These names map directly onto HTML5 landmark elements (`<header>`, `<main>`, `<aside>`, `<footer>`), which also help screen readers navigate.

- **Header** (app bar, top bar, masthead) — the strip across the top holding the logo, primary navigation, and global actions like sign-in or search. A header that stays put when you scroll is **sticky** or **fixed**.
- **Hero** (banner) — the large, prominent block near the top of a landing page, usually carrying a headline, a sentence of pitch, and a primary **call to action** (CTA) — the single button you most want the visitor to press.
- **Main content** — the primary column where the page's actual substance lives. Exactly one `<main>` per page.
- **Sidebar** (aside) — a secondary column beside the main content for navigation, filters, related links, or metadata. Content tangential to the main flow.
- **Footer** — the strip across the bottom for fine print, secondary links, contact info, and legal notices.
- **Container** (wrapper) — an invisible box that constrains content to a comfortable maximum width and centres it, so text doesn't stretch edge-to-edge on a wide monitor.
- **Gutter** — the consistent spacing between columns or grid cells.
- **Margin** — the breathing room *outside* an element; **padding** is the space *inside* it, between its border and its content. (More on these in Layout & spacing.)

---

## Buttons & actions

![Buttons — primary, secondary, text, icon, button group, split, FAB, disabled](/static/ui-guide/buttons.svg)

A **button** triggers an action *now* (submit, save, open a dialog). Contrast with a **link**, which navigates *somewhere* — visually they sometimes look alike, but the distinction matters for behaviour and accessibility.

- **Primary button** (call to action) — the filled, high-emphasis button for the main action in a view. Usually one per section.
- **Secondary button** (outline, ghost) — lower emphasis, often just an outline or a tint, for alternative or cancel actions sitting next to a primary.
- **Tertiary / text button** (link button) — text only, no fill or border; lowest emphasis, for minor actions.
- **Icon button** — a button whose label *is* an icon (a gear, a trash can). Compact, but needs a hidden accessible label (an `aria-label` or tooltip) since there's no visible text.
- **Button group** (segmented buttons) — several related buttons joined into one strip, e.g. Day / Week / Month view switches.
- **Split button** (menu button, dropdown button) — a primary action plus an attached caret that opens a menu of related actions.
- **Floating action button** (FAB) — a circular, elevated button hovering above the content for the single most important action on a screen; a mobile pattern from Material Design.
- **Disabled** — a greyed-out, non-interactive state shown when an action isn't currently available (covered under States below). Not a button *type* but a button *state*.

---

## Text fields & inputs

![Text inputs — label, placeholder, helper text, error state, search field, textarea, affixes](/static/ui-guide/text-inputs.svg)

Where the user types. The whole assembly — label, the box, and its messages — is a **form field** or **form control**.

- **Text field** (input, text box) — the single-line box for short text. Under the hood, `<input type="text|email|password|number…">`.
- **Label** — the text naming the field. Always pair a label with its input (clicking the label should focus the field); placeholder text is *not* a substitute for a label.
- **Placeholder** — the greyed example text *inside* an empty field ("you@example.com"). It vanishes as soon as you type, so never put essential instructions here.
- **Helper text** (hint, supporting text) — a small line *below* the field giving guidance or constraints ("We'll never share your address").
- **Error state** (validation message) — when input fails validation, the field turns red and shows an error message. **Validation** is the act of checking input; it can run as you type (inline) or on submit.
- **Search field** — a text input specialised for search, usually with a magnifier icon and a rounded shape; `<input type="search">`.
- **Textarea** — a multi-line text box for longer input; often has a **resize handle** in the corner.
- **Affix** — a small fixed adornment inside the field: a **prefix** ("$") or **suffix** ("USD", ".00"). Useful for units and currency.
- Related: a **clear button** (the little ✕ that empties a field), a **character counter**, and an **input mask** (formatting that enforces a pattern like a phone number as you type).

---

## Selection controls

![Selection controls — checkbox, radio, toggle, select, slider, segmented control](/static/ui-guide/selection-controls.svg)

Controls for choosing among predefined options rather than typing freely. The key distinction: **checkbox/multi-select** allow many choices; **radio/single-select** allow exactly one.

- **Checkbox** — a square box, toggled independently. Use when each option is a yes/no and several can be true at once. A checkbox can also be **indeterminate** (a dash rather than a tick) for "some but not all children selected".
- **Radio buttons** — round, mutually exclusive options in a group; choosing one clears the others. Use for one-of-a-few visible choices.
- **Toggle** (switch) — an on/off slider for a single binary setting that takes effect immediately (like a light switch). Prefer over a checkbox when the change is instant rather than saved-on-submit.
- **Select** (dropdown, combobox, picker) — a collapsed control that opens a list of options. A **combobox** additionally lets you type to filter. Use for one-of-many when the list is long.
- **Slider** (range) — a draggable **thumb** on a **track** for picking a value within a range; good for volume, brightness, price ranges.
- **Segmented control** — a small set of mutually exclusive options shown side by side as joined segments (List / Grid / Map). Like radio buttons, but compact and always visible.
- Related: a **stepper** (a number field with − and + buttons), and a **multi-select** (a select that accepts several values, often shown as chips).

---

## Navigation

![Navigation — navbar, tabs, breadcrumbs, pagination, sidebar nav, hamburger](/static/ui-guide/navigation.svg)

How users move between views. Good navigation answers "where am I, and where can I go?"

- **Navbar** (top nav, primary nav) — the horizontal bar of top-level destinations, usually in the header.
- **Active link** (current state) — the visual mark (a colour change, an underline) showing which page or section you're currently on.
- **Tabs** — switch between panels of related content *within the same page* without navigating away. The selected tab is the **active tab**.
- **Breadcrumbs** — a horizontal trail (Home › Reflect › Concepts) showing your position in a hierarchy and letting you jump back up a level.
- **Pagination** — numbered controls (‹ 1 2 3 … 9 ›) for moving through a long list split into pages. The alternative is **infinite scroll**, which loads more as you reach the bottom.
- **Sidebar navigation** (vertical nav, nav rail) — a vertical list of destinations down the side, common in dashboards and documentation.
- **Hamburger** (menu button) — the three-line icon that reveals a hidden navigation menu, usually on narrow/mobile screens. Tapping it often opens a **drawer** (see Overlays).
- Related: a **menu** (a list of choices), a **menu item**, and a **mega menu** (a large multi-column dropdown for big sites).

---

## Containers & data display

![Containers — card with header/body/footer, badge, avatar, accordion, table, chips](/static/ui-guide/containers.svg)

Boxes that group and present content.

- **Card** — a rounded, bordered (or shadowed) container that bundles related content and actions into a single unit. Often has a **header** (title area), a **body** (main content), and a **footer** (actions/metadata).
- **Panel** (section, well) — a plainer grouped region; like a card but usually flush with the page rather than visually "lifted".
- **Badge** — a tiny label attached to something, showing status or a count (a "v2", a notification number on a bell).
- **Avatar** — the small circular image or initials representing a person or entity.
- **Accordion** — stacked rows that **expand** and **collapse** to reveal or hide their content, so only what you need is open. Each header usually has a chevron that rotates.
- **Table** — rows and columns of structured data. Vocabulary: the **header row** (column titles), each **row** (a record), and each **cell** (one value). Sortable columns, **zebra striping** (alternating row tints), and **sticky headers** are common refinements.
- **List** — a simpler vertical sequence of items (as opposed to a multi-column table).
- **Chip** (tag, pill) — a small rounded token representing a discrete value: a filter, a category, a selected item. Often dismissible with a small ✕.
- Related: a **disclosure** (a single expand/collapse toggle, the building block of an accordion) and a **carousel** (a horizontally swipeable row of cards).

---

## Overlays & popups

![Overlays — modal dialog with backdrop and actions, tooltip, dropdown menu, divider](/static/ui-guide/overlays.svg)

Surfaces that float *above* the page, temporarily. The big distinction is **modal** (blocks the rest of the UI until you deal with it) versus **non-modal** (you can ignore it and keep working).

- **Modal** (dialog) — a focused window layered over the page that demands attention — a confirmation, a form, an alert. While open it traps focus and blocks interaction with everything behind it.
- **Backdrop** (overlay, scrim) — the dimmed layer behind a modal that obscures and disables the page underneath, drawing the eye to the dialog.
- **Close button** — the ✕ (usually top-right) that dismisses the overlay. Modals should also close on Escape.
- **Dialog actions** (button bar) — the row of buttons at the bottom of a dialog (Cancel / Confirm). The confirming action is typically the primary button on the right.
- **Tooltip** — a small text bubble that appears on hover or focus to explain an element. Brief and non-interactive — never hide essential info or buttons in one.
- **Dropdown menu** — a list of actions or links that opens from a button or icon. Its pieces: each **menu item**, and a **divider** (a thin rule grouping related items).
- **Popover** — like a tooltip but larger and interactive: a small floating panel anchored to a trigger, holding richer content (a mini form, details, controls).
- **Drawer** (off-canvas, sheet, panel) — a panel that slides in from an edge of the screen (often the side for navigation, or the bottom on mobile). The hamburger menu usually opens one.
- Related: a **toast** (a transient notification — see Feedback), and a **lightbox** (a modal specifically for viewing an enlarged image).

---

## Feedback & status

![Feedback — alert banners (info/success/warning/error), toast, progress bar, spinner, skeleton, status pills](/static/ui-guide/feedback.svg)

How the interface tells you what's happening. Most of these come in four **severities**: **info**, **success**, **warning**, and **error** — colour-coded consistently across a product.

- **Alert** (banner, callout) — a coloured, in-page message box conveying status that stays until dismissed or resolved. Sits inline in the layout (not floating).
- **Toast** (snackbar) — a small, transient notification that pops in (often a corner), lingers a few seconds, then fades. Good for "Saved", "Message sent". May carry a single action like **Undo**.
- **Progress bar** — a horizontal bar showing how far along a task is. **Determinate** when the percentage is known; **indeterminate** (an animated stripe) when it isn't.
- **Spinner** (loader, activity indicator) — a rotating indicator for "working…" when there's no measurable progress.
- **Skeleton** (skeleton screen, placeholder) — grey shapes mimicking the layout of content that's still loading, so the page doesn't jump when data arrives. Calmer than a spinner for full-page loads.
- **Status badge** (pill) — a small coloured label communicating a state at a glance: Active (green), Pending (neutral), Failed (red). The same colour vocabulary as alerts.
- **Notification badge** — the small count bubble on an icon (e.g. a "3" on a bell) showing unread or pending items.
- Related: an **empty state** (the friendly placeholder shown when there's no data yet, ideally with a prompt to act) and a **banner** that sits at the very top of a page for site-wide notices.

---

## Interaction states

The *same* control looks different depending on what's happening to it. These states are styled in CSS (mostly via pseudo-classes like `:hover`, `:focus`, `:active`, `:disabled`) and are a core part of any component's design.

- **Default** (resting, enabled) — the normal idle appearance.
- **Hover** — pointer is over the element. (No hover on touchscreens — never make functionality *depend* on it.)
- **Focus** — the element is selected for keyboard input, shown by a **focus ring**. Essential for keyboard and screen-reader users; never remove the ring without replacing it.
- **Active** (pressed) — the brief state while being clicked or tapped.
- **Disabled** — present but not interactive; greyed out and ignores input.
- **Loading** (busy) — the control is working, often showing a spinner and temporarily disabled to prevent double submits.
- **Selected / checked** — the "on" state of a toggle, checkbox, radio, tab, or list item.
- **Indeterminate** — a third state, neither on nor off (the dash in a parent checkbox).
- **Read-only** — value is shown and can be copied, but not edited (distinct from disabled, which also dims and removes it from form submission).
- **Error / invalid** — failed validation; usually red with a message.

---

## Layout & spacing

The vocabulary of arranging elements on the page — the part of front-end you'll spend the most time tuning.

- **Box model** — every element is a box made of, from inside out: **content**, **padding** (space inside the border), **border**, and **margin** (space outside). Master this and most layout "mysteries" disappear.
- **Padding** vs **margin** — padding pushes a box's *contents* inward; margin pushes *other elements* away. Padding is inside the border; margin is outside it.
- **Flexbox** — a CSS layout model for arranging items in a single direction (a row or a column), distributing space between them. The workhorse for toolbars, nav bars, and centring.
- **Grid** — a CSS layout model for two-dimensional layouts (rows *and* columns at once). Best for page-level structure and galleries.
- **Gutter** — the gap between columns or grid tracks.
- **Whitespace** (negative space) — intentional empty space. Not wasted — it groups related things, separates unrelated ones, and gives the eye somewhere to rest.
- **Alignment** — lining elements up along a shared edge or centre line; the single biggest lever for a layout looking "tidy".
- **Responsive design** — layout that adapts to the screen. A **breakpoint** is a width at which the layout changes (e.g. a sidebar collapses into a hamburger below 800px). The **viewport** is the visible area of the page in the browser.
- **Z-index** (stacking) — which elements sit *in front of* others; why modals and dropdowns appear above the page.
- **Elevation** (shadow, depth) — using shadows to suggest how "raised" a surface is; higher elevation reads as closer/more important.

---

*This page uses self-drawn SVG diagrams (no external images), themed to match the wiki. To extend it, edit `content/study/web-ui-elements.md` and the sources under `quartz/static/ui-guide/`.*
