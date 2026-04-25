# Jack's Brain — Sass Partial Filename Fix

The previous patch's build failed with:

```
Can't find stylesheet to import.
6 │ @use "./jbtable.scss";
```

## Root cause

Sass requires partial files to be named with a leading underscore on
disk (e.g. `_jbtable.scss`). Files without the underscore are treated
as top-level entry points for compilation. You import them without the
underscore in the `@use` statement — Sass automatically resolves the
import to the underscored filename.

I shipped `jbtable.scss` (no underscore on disk) which Sass rejected
because (a) it's not a recognized partial pattern, and (b) it would
otherwise be compiled to a standalone `jbtable.css` output, which is
also not what we want.

## Fix

Rename the file from `jbtable.scss` to `_jbtable.scss`. The import
statement in `base.scss` (`@use "./jbtable.scss";`) is already
correct — no change needed there.

## Files

This patch only adds `quartz/styles/_jbtable.scss`. The Bridge can't
delete files, so the existing `quartz/styles/jbtable.scss` will remain
in the repo as an orphan. Sass will use the underscored version (it's
the canonical partial); the non-underscored version will just sit
unused. To clean up later, delete it via the GitHub web UI.

## Apply

Bridge:
- **Strip prefix:** `jbpatch-sass-fix/`
- **Target repo:** `StewART-Identity/jacks-brain`
- **Branch:** `main`

One file. Single commit.

After this lands, Cloudflare's build will succeed and you'll see all
six tables sharing the same dark-green-header / alternating-rows /
flush-left look.
