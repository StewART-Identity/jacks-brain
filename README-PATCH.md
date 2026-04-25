# Jack's Brain — Match Acquisition Style

Three fixes to the Collection table:

1. **Title text no longer crammed against left border.** Removed the
   `padding-left: 0` rule on first-child cells. Every cell now has the
   standard 0.7rem horizontal padding, so content has breathing room
   inside its border.

2. **Header row matches Acquisition's look.** Restored the dark band
   styling — `var(--lightgray)` background, 2px bottom border. Same
   visual rhythm as the Acquisition page.

3. **Flush-left attempt.** Added `padding: 0` to the outer
   `.table-container`. If this doesn't fully resolve the offset, we can
   investigate the parent wrapper (`.page-listing` div) next.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-table-final/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

One file. Single commit.
