---
title: "Deprovisioning"
summary: "Automated removal of access, accounts, and attributes when a user separates — a gap open in UNT System's IAM infrastructure since ~2022 across Duo, AD, and IDTREE."
type: concept
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - deprovisioning
  - offboarding
  - provisioning
  - automation
  - access-management
  - lifecycle-management
  - unt-system
  - duo
  - active-directory
  - idtree
sources:
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Deprovisioning is the set of automated operations that revoke a user's access, accounts, and attributes when they separate from an organization — termination, retirement, graduation, loss of affiliation. It is the offboarding counterpart to provisioning, which grants access during onboarding. Together they form the user lifecycle in an IAM system.

Effective deprovisioning is a security and compliance requirement: users who retain access after separation represent an expanded attack surface, inflate license counts, and produce inaccurate affiliation-based access decisions.

## UNT System Deprovisioning Gap

As documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]], all deprovisioning automation in [[collection/entities/unt-system]]'s dstools provisioning infrastructure has been effectively inactive since approximately 2022. The gap spans three systems:

| System | Script | Status |
|--------|--------|--------|
| [[collection/entities/cisco-duo]] | `duo_offboard_users.py` | Scheduled but `delete_user()` commented out |
| [[collection/entities/cisco-duo]] | `duo_students_old_enrollment_no_affiliation.py` | Not scheduled; `delete_user()` commented out |
| [[collection/entities/idtree]] | `purge_unt_roles.py`, `purge_hsc_roles.py`, `purge_dal_roles.py` | Never scheduled |
| [[collection/entities/active-directory]] | `ad/offboarding.py` | Never scheduled |

### Root Cause: Incomplete Perl-to-Python Migration

The scripts exist and contain correct logic. The deprovisioning gap stems from an incomplete Perl-to-Python migration circa 2020–2022. Developers completed the identification and logic phase, then deferred enabling destructive operations (account deletion, attribute purge) — apparently out of appropriate caution — and the project stalled before final activation. Archived Perl predecessors (`purge_untst_roles.pl`, etc.) sit alongside the unscheduled Python replacements, and no handoff documentation exists.

This pattern — working destructive scripts present but never activated — is distinct from a gap caused by missing functionality. The automation was built; it was never turned on.

### Downstream Impact

- **Duo:** Terminated/retired/unaffiliated users retain active Duo accounts indefinitely, inflating license counts and authentication surface.
- **IDTREE:** ~113,000 users carry stale enrollment, role, and affiliation attributes, causing group bloat and inaccurate access decisions.
- **AD:** No automated account disablement for separated employees; offboarding depends on manual action or Identity Manager drivers.

## Remediation at UNT System

The `iam-scripts-provisioning` repository and `iam_modules` shared library (v3.0.0) represent the remediation path. Key design improvements over the dstools scripts:

- **Dry-run by default** (`--commit` flag required for writes) — directly addresses the caution that caused the original activation deferral.
- **Modern `ldap3` bindings** replacing legacy LDAP tooling.
- **Formal `CONTRACT.md`** per script, documenting expected behavior.
- `iam-scripts-alma-v2` deactivation/reactivation scripts already integrate with [[collection/entities/cisco-duo]], [[collection/entities/active-directory]], eDirectory, and [[collection/entities/microsoft-entra-id]].

Completing the migration and scheduling the new purge and offboarding scripts will close the gap.

## Relationship to the Broader IAM Gap Pattern

The deprovisioning gap is part of a broader pattern of incomplete IAM migrations at UNT System. See [[collection/synthesis/unt-system-iam-infrastructure-gaps]] for analysis connecting this gap to the legacy [[collection/concepts/authentication-methods]] artifacts documented in [[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]].
