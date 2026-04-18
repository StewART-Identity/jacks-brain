---
title: "Dry-Run by Default"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - safety
  - scripting
  - iam
  - design-pattern
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

A mandatory safety design pattern for all [[recall/entities/unt-system]] IAM provisioning scripts: every script that modifies data defaults to a no-change simulation. Live execution requires an explicit opt-in flag.

## The Pattern

```
python script.py              # dry-run — no changes made (default)
python script.py --commit     # live execution — changes are applied
```

The safe state is the default. Users opt **into** danger with `--commit`. The flag is never `--dry-run` — the dry-run behavior needs no flag because it is already the default.

## Why This Matters

IAM provisioning scripts operate against production directories (eDirectory, Active Directory, Oracle) serving 72,000+ users. A misfire — running a deactivation script against the wrong OU, or running a sync script with incorrect parameters — can disable accounts at scale. The `--commit` requirement ensures that every execution is a deliberate choice, and that reviewing dry-run output before committing becomes the natural workflow.

## Implementation

At the script level, `argparse` handles the flag:

```python
parser.add_argument('--commit', action='store_true',
                    help='Execute changes (default is dry-run)')
```

The `--commit` state is then threaded through to any function that modifies data:

```python
client.modify_attribute(dn, 'mail', new_value, dry_run=not args.commit)
client.add_group_member(group_dn, user_dn, dry_run=not args.commit)
```

The [[recall/entities/iam-modules]] client classes (`EDirectoryClient`, `ADDomainControllerClient`, `GraphAPIClient`) all accept a `dry_run=` parameter, logging what *would* happen without performing the operation.

## Relationship to Broader Safety Culture

This pattern at the scripting level mirrors the pre-production testing mandate at the cloud identity layer. The [[recall/concepts/iam-testing-methodology]] requires all Entra ID changes to be validated in a staging tenant before production deployment — the same instinct (prove it safe before touching production) expressed through a different mechanism.

Both are responses to the cost of identity infrastructure mistakes at scale. See [[recall/synthesis/unt-iam-provisioning-layer]] for the cross-layer analysis.

## Enforcement Rules

Per the [[recall/sources/2026-04-18-2026-04-18-contract]]:

- Running without `--commit` → dry-run, no changes
- The flag is `--commit`, never `--dry-run`
- The epilog of every `argparse` description must remind users of dry-run default behavior
- The `--verbose` flag enables INFO-level console logging; without it, only WARNING and above appear

## Related Pages

- [[recall/concepts/iam-scripting-architecture]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/entities/iam-modules]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
- [[recall/synthesis/unt-iam-provisioning-layer]]
