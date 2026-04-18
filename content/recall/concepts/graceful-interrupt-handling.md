---
title: "Graceful Interrupt Handling in IAM Scripts"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - safety
  - scripting
  - python
  - iam
  - design-pattern
  - unt-system
  - sigint
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

A mandatory design pattern for all [[recall/entities/unt-system]] IAM provisioning scripts: pressing Ctrl+C must never produce a Python traceback. Instead, the operator sees a clean message describing exactly what was interrupted. This is a non-negotiable production requirement — scripts run against live infrastructure and are operated by humans who need context, not stack frames.

## The User Experience

```
Interrupted during: sending notice to jsmith (47/518)
No further changes will be made.
```

Not:

```
Traceback (most recent call last):
  File "/usr/local/iamadm/scripts/iam-scripts-utilities/mail/send_passwordexpirationnotice.py", line 214, in send_expiration_email
    ...
KeyboardInterrupt
```

## Two-Layer Architecture

The protection has two layers, both provided automatically by [[recall/entities/iam-modules]]:

### Layer 1 — SIGINT Signal Handler

Registered automatically when any `iam_modules` import runs. Catches Ctrl+C that arrives during normal Python code execution. No script setup is required.

### Layer 2 — `run()` Entry-Point Wrapper

Catches `KeyboardInterrupt` that escapes the signal handler. This happens when Python is blocked inside **C-level I/O** — SSL socket reads, Oracle network calls, and similar blocking operations. The signal is queued but not delivered until Python regains control; `run()` catches the eventual `KeyboardInterrupt` at the top of the call stack.

Both layers read from the same `_current_operation` state, so the interrupt message always reflects the actual phase in progress, regardless of which layer fires.

## Script Responsibilities

Scripts participate in two ways:

**1. Describe current phase with `set_operation()`:**

```python
from iam_modules import load_config, setup_logging, set_operation

set_operation('connecting to eDirectory')
conn = connect_to_edir(config, 'prod', logger)

set_operation('searching for expiring passwords (5-day window)')
accounts = find_expiring_passwords(conn, search_base, ...)

for i, acct in enumerate(accounts, 1):
    set_operation(f'sending notice to {acct["euid"]} ({i}/{len(accounts)})')
    send_expiration_email(...)
```

A script that never calls `set_operation()` still gets clean interrupt handling; the default message is "Interrupted during: initializing".

**2. Use `run(main)` as the entry point:**

```python
if __name__ == '__main__':
    run(main)        # correct — wraps with KeyboardInterrupt protection
    # NOT: sys.exit(main())
```

Using `sys.exit(main())` instead of `run(main)` removes the Layer 2 protection, leaving scripts vulnerable to silent hangs or ugly tracebacks when interrupted during C-level I/O.

## Why This Matters

IAM provisioning scripts iterate over large datasets (47 of 518 users, as in the example above). An operator who presses Ctrl+C mid-run needs to know:

1. How far did the script get before stopping?
2. Which records were processed and which were not?
3. Is the system in a consistent state?

A traceback answers none of these questions. The `set_operation()` pattern makes every Ctrl+C self-annotating.

## Relationship to Other Safety Patterns

This pattern pairs with [[recall/concepts/dry-run-by-default]]: dry-run lets operators preview what a script *will* do; graceful interrupts let them abort safely *while* it is running. Together they ensure that operators are never trapped — they can stop any script at any time without losing context or producing ambiguous state.

Both patterns are part of the broader safety culture described in [[recall/synthesis/unt-iam-provisioning-layer]].

## Related Pages

- [[recall/entities/iam-modules]]
- [[recall/concepts/iam-scripting-architecture]]
- [[recall/concepts/dry-run-by-default]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
