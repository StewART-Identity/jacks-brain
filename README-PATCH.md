# Jack's Brain — Row Polish

Four CSS adjustments on the Collection table:

1. **Opaque rows** — every `td` and `th` has an explicit
   `background-color` (no transparency), so the neuron wallpaper no
   longer shows through cells.

2. **Alternating row colors** — odd rows use `var(--light)`, even rows
   use `var(--lightgray)`. Both are theme tokens so they harmonize with
   the rest of the site in light or dark mode.

3. **Heavier borders** — bumped from `var(--lightgray)` to `var(--gray)`
   on cell borders. Borders are now visually distinct without being
   heavy-handed.

4. **Flush left with the page title** — first column gets
   `padding-left: 0`, so the cell content (e.g. "SAML vs. OAuth Diagram")
   aligns with the "Sources" heading above. No negative margins, no
   layout hacks.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-rows/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

One file. Single commit.
