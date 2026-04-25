# Jack's Brain — Table Border + Alignment

Two tweaks to PageList.tsx:

1. **Table now flush-left with title/description.** Quartz's base
   stylesheet applies `margin: 1rem` to all tables inside `.table-container`.
   Overrode that to `margin: 0` so the Collection table edge lines up
   with the page heading.

2. **Subtle cell borders.** Added `border: 1px solid var(--lightgray)`
   to every `th` and `td` so each cell is visually delineated without
   being heavy.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-borders/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

Single file. One commit.
