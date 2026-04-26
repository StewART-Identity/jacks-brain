---
title: "UNT System IAM Infrastructure Gaps: A Pattern of Incomplete Migrations"
summary: "Two documented IAM gaps at UNT System — stale auth methods and inactive deprovisioning — both stem from migration work that was partly done and then stalled."
type: synthesis
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
  - operations
tags:
  - unt-system
  - migration
  - deprovisioning
  - authentication-methods
  - gap-analysis
  - technical-debt
  - automation
  - duo
  - active-directory
  - idtree
  - entra-id
sources:
  - "[[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]"
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Two separate IAM sources document distinct gaps in [[collection/entities/unt-system]]'s IAM infrastructure. Considered together, they reveal a pattern: both gaps originated from migration work that completed its initial phase — the build or the logic — but stalled before the final activation or cleanup step.

## The Two Gaps

### Gap 1: Stale Authentication Methods

Source: [[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]

Some UNT System user accounts retain legacy MyUNT external [[collection/concepts/authentication-methods]] records in [[collection/entities/microsoft-entra-id]] after UNT System migrated to native Microsoft authentication. The stale records block Duo re-enrollment. The remediation is manual: an IAM staff member clears the method via [[collection/entities/dstools]], and the user re-enrolls.

- **Migration:** MyUNT external auth → native Microsoft authentication
- **What stalled:** Cleanup of legacy method records on existing accounts
- **Current state:** Ongoing manual remediation; no automated cleanup documented

### Gap 2: Inactive Deprovisioning Automation

Source: [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]

All [[collection/concepts/deprovisioning]] automation in the dstools provisioning infrastructure is inactive across [[collection/entities/cisco-duo]], [[collection/entities/active-directory]], and [[collection/entities/idtree]]. Scripts exist and contain correct logic, but destructive operations were either commented out mid-testing or scripts were never added to crontab.

- **Migration:** Perl provisioning scripts → Python replacements (2020–2022)
- **What stalled:** Final activation of destructive operations (account deletion, attribute purge)
- **Current state:** ~113,000 IDTREE users with stale attributes; terminated users retaining Duo accounts and AD access

## The Pattern

Both gaps share a structural signature:

| Dimension | Auth Methods Gap | Deprovisioning Gap |
|-----------|-----------------|-------------------|
| Root cause | Incomplete migration | Incomplete migration |
| Migration type | Auth platform (MyUNT → Entra ID) | Script language (Perl → Python) |
| What was built | New auth flow | Replacement Python scripts |
| What was skipped | Legacy method cleanup | Activation of destructive ops |
| Documentation | None for stale accounts | No handoff records |
| Remediation | Manual (DSTools) | Refactor in progress |

In both cases, the "easy" part of the migration was completed — the new system was stood up, the new scripts were written — and then the work to disable or clean up the old state was deferred and abandoned.

## Remediation Trajectories

The two gaps are at different stages of remediation:

- **Auth methods gap** has a working manual workaround (DSTools Clear Authentication Methods) but no automated cleanup. The scope is bounded — only accounts that were active during the MyUNT era are affected.

- **Deprovisioning gap** is being addressed by the `iam-scripts-provisioning` refactoring effort (`iam_modules` v3.0.0). The new scripts use a dry-run-by-default pattern (`--commit` required for writes), which directly addresses the caution that caused the original activation deferral. Completion requires scheduling the new purge and offboarding scripts.

## Implications

The consistent pattern — migration work completed, activation deferred, project stalled — suggests a systemic risk in [[collection/entities/unt-system]]'s IAM change management: migrations are declared complete when the new system is operational, before the old state is fully cleaned up. Future migrations should include explicit "cleanup complete" gates as part of project closure.

*Note: `operations` is introduced here as a new subject alongside `identity-management`. This synthesis genuinely spans two conceptual domains: IAM as a technical domain and operational patterns (migration discipline, change management) as a domain in its own right. Pages concerned purely with IAM technology should continue to use only `identity-management`.*
