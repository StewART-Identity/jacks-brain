---
title: "UNT IAM Deprovisioning Gap"
summary: "How deprovisioning automation stalled during the 2020–2022 Perl-to-Python migration, what it costs, and how ALMA's design patterns inform the fix."
type: synthesis
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - deprovisioning
  - unt-system
  - account-lifecycle
  - synthesis
sources:
  - "[[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis]]"
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

Two sources in this wiki document complementary halves of the UNT System IAM automation story. The [[collection/sources/2026-04-25-alma-v2-technical-reference|ALMA v2 Technical Reference]] describes a rigorously observable lifecycle management system. The [[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis|Deprovisioning Gap Analysis]] documents a parallel domain — permanent offboarding — where automation has been absent since approximately 2022.

## Two Different Problems, One Infrastructure

[[collection/entities/alma|ALMA]] handles **inactivity deactivation**: identifying users who have not logged in recently and suspending their accounts temporarily — with a reactivation path if they return. The systems are [[collection/entities/edirectory-idtree|IDTREE]], [[collection/entities/active-directory|AD]], and [[collection/entities/cisco-duo|Duo]], and ALMA manages all three with verification gates and sync locks.

The `dstools` scripts were meant to handle **separation offboarding**: permanently removing Duo accounts, purging stale student attributes from IDTREE, and disabling AD accounts for terminated, retired, or unaffiliated users. This automation never shipped.

The two domains share infrastructure but operate independently. ALMA's success does not compensate for the deprovisioning gap — these are separate code paths targeting different user states.

## Why the Gap Persisted

The gap analysis points to a specific failure mode in migration projects: the **"logic complete, activation deferred" trap**. The Perl-to-Python rewrite completed all the hard work — identifying the right users, building the API calls, writing the logic — and then stopped just before the destructive step. The reasons are understandable:

- Destroying user accounts or purging attributes is not easily reversible
- No observable failure occurs when the purge doesn't run — the absence of deletions is invisible in logs and metrics
- No documentation or handoff records survived, so no successor completed the activation

This last point illustrates a class of systemic risk: automation that was never activated is invisible. It doesn't page anyone. It doesn't show up in error logs. It quietly produces no output while the problem it was meant to solve compounds over years.

## The 113,000 Figure

Approximately 113,000 users in IDTREE carry stale student enrollment attributes — `classEnrollment` references, role values, and scoped affiliations. This is not a minor data hygiene issue:

- Group membership in constructs like `UNT Graduate Students` is computed from these attributes. Former students may retain group memberships that grant access.
- [[collection/concepts/identity-propagation|Identity propagation]] carries IDTREE attribute changes to [[collection/entities/active-directory|Active Directory]]. Stale role attributes in IDTREE can produce incorrect role data downstream.

The purge scripts (`purge_unt_roles.py`, `purge_hsc_roles.py`, `purge_dal_roles.py`) exist and contain the correct logic. They were never scheduled.

## ALMA's Design Patterns as a Template

ALMA v2's design directly addresses the class of failure that stalled the original migration. The `iam-scripts-provisioning` refactor applies the same patterns to the [[collection/concepts/deprovisioning|deprovisioning]] domain:

| ALMA Pattern | Deprovisioning Application |
|-------------|---------------------------|
| `--commit` dry-run flag | All purge/offboard scripts require `--commit` for destructive operations |
| Feature flags per capability | Scripts can be enabled and tested independently |
| Formal `CONTRACT.md` | Each script documents preconditions and safe-to-run criteria |
| Modern `ldap3` bindings | Replaces fragile Perl scripts with testable Python under `iam_modules` v3.0.0 |

The dry-run-by-default pattern is the direct answer to the original hesitation: scripts that previously had destructive calls commented out can now run safely in dry-run mode, produce observable output, and be promoted to `--commit` when the team is confident.

## What Closing the Gap Requires

Per the gap analysis, three activation steps remain:

1. **IDTREE purge**: Schedule `purge_unt_roles.py`, `purge_hsc_roles.py`, and `purge_dal_roles.py` in the purge crontab.
2. **Duo offboarding**: Complete `duo_offboard_users.py` (uncomment or replace `admin_api.delete_user()` on line 294); schedule `duo_students_old_enrollment_no_affiliation.py`.
3. **AD offboarding**: Schedule `ad/offboarding.py`.

All three depend on the `iam-scripts-provisioning` migration being complete enough to replace the `dstools` equivalents.

## Tension With Account Lifecycle Management

There is a subtle tension worth flagging. [[collection/concepts/account-lifecycle-management|Account lifecycle management]] is designed around the reversibility of deactivation — the sync lock (`untAccountADNoSync`) and verification gates exist partly to ensure the process can be undone if a mistake is made. [[collection/concepts/deprovisioning|Deprovisioning]] is by design irreversible: deleting a Duo account or purging IDTREE attributes cannot be trivially rolled back.

This means the verification and safety patterns need to be even more conservative for deprovisioning than for ALMA deactivation. A false positive in deactivation is annoying but fixable via reactivation. A false positive in deprovisioning may require manual recreation and re-enrollment.

See [[collection/entities/alma|ALMA]], [[collection/concepts/account-lifecycle-management|account lifecycle management]], and [[collection/synthesis/unt-iam-identity-infrastructure|UNT IAM Identity Infrastructure]] for the broader infrastructure context.
