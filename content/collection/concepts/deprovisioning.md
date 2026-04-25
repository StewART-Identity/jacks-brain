---
title: "Deprovisioning"
summary: "Permanent removal of user access and accounts on separation — distinct from temporary deactivation, and prone to silent failure when automation stalls."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - deprovisioning
  - offboarding
  - iam
  - account-lifecycle
sources:
  - "[[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Deprovisioning is the set of IAM operations that permanently remove or revoke a user's access when they separate from an organization — through employment termination, retirement, or loss of affiliation. It is distinct from [[collection/concepts/account-lifecycle-management|account lifecycle management]] in both trigger and intent: lifecycle management governs temporary state (inactive users who may return), while deprovisioning handles permanent separation.

## Deprovisioning vs. Deactivation

| Dimension | Deactivation | Deprovisioning |
|-----------|-------------|----------------|
| Trigger | Inactivity threshold | Employment separation |
| Intent | Temporary; user may return | Permanent separation |
| Typical operations | Disable accounts, lock sync | Delete accounts, purge attributes, remove licenses |
| Reversal | Reactivation workflow | Usually none; re-hire creates new account |

At [[collection/entities/unt-system-iam|UNT System IAM]], [[collection/entities/alma|ALMA]] handles the deactivation/reactivation dimension. The deprovisioning dimension — deletion of [[collection/entities/cisco-duo|Duo]] accounts, purging of stale [[collection/entities/edirectory-idtree|IDTREE]] attributes, disabling [[collection/entities/active-directory|AD]] accounts for separated employees — is addressed by the `dstools` / `iam-scripts-provisioning` migration.

## Why Deprovisioning Fails Silently

Deprovisioning gaps are unusually easy to miss:

- The process is triggered by **absence** rather than presence — a departed user generates no activity that reveals the problem
- Destructive operations (deleting accounts, purging attributes) carry high risk if triggered incorrectly, so developers reasonably pause before enabling them
- Manual offboarding processes may cover enough cases to obscure the gap in routine operations
- License inflation and attribute bloat accumulate gradually and are rarely reviewed against access policy

This is the pattern documented in the [[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis|UNT System Deprovisioning Gap Analysis]]: working Python scripts existed for years alongside commented-out destructive calls, without triggering an operational incident. The scripts ran, wrote output files, and silently exited without deleting anything.

## Downstream Consequences of a Deprovisioning Gap

A stalled deprovisioning automation produces compounding technical debt:

1. **License inflation**: MFA platforms like [[collection/entities/cisco-duo|Duo]] charge per active account. Departed users retaining accounts inflate the bill without providing any organizational value.
2. **Authentication surface expansion**: Active accounts for departed users represent latent breach risk if credentials are compromised post-separation.
3. **Attribute bloat**: Stale role, affiliation, and enrollment attributes cause incorrect access decisions in affiliation-based authorization. At UNT System, approximately 113,000 users carry stale IDTREE student attributes as a result.
4. **Operational opacity**: When purge scripts produce no output, operators cannot distinguish "all clean" from "nothing ran."

## Automation Safety Patterns

The `iam-scripts-provisioning` refactor directly addresses the caution that stalled the previous migration:

- **Dry-run-by-default**: scripts require an explicit `--commit` flag for writes, eliminating the risk of accidental destructive runs during testing or review
- **Formal `CONTRACT.md`**: each script documents its preconditions, effects, and safe-to-run criteria
- **Modern `ldap3` bindings**: replacing fragile Perl scripts with testable Python modules under `iam_modules` (v3.0.0)

These patterns mirror [[collection/entities/alma|ALMA]]'s `--commit` / feature-flag design and make it safe to activate destructive operations incrementally in production.

See [[collection/synthesis/unt-iam-deprovisioning-gap|UNT IAM Deprovisioning Gap]] for the historical context and cross-cutting analysis.
