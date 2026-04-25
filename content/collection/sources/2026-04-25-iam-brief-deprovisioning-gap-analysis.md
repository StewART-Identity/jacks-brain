---
title: "IAM Brief: Deprovisioning Gap Analysis"
summary: "March 2026 analysis finding all UNT System deprovisioning automation inactive — Duo, AD, and IDTREE purge scripts unscheduled or commented out since ~2022."
type: source
role: analysis
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - deprovisioning
  - offboarding
  - unt-system
  - audit
  - dstools
confidence: high
views:
  - date: 2026-04-25
    note: "Initial cataloging."
---

Authored by [[collection/entities/jack-stewart|Jack Stewart]] (IAM Engineer, UNT System), March 6, 2026. [Download original](/api/originals/2026-04-25-IAM_Brief_Deprovisioning_Gap_Analysis.pdf)

A cross-reference of the `dstools` provisioning scripts against their active crontab schedules. The analysis finds that all [[collection/concepts/deprovisioning|deprovisioning]] and offboarding automation at [[collection/entities/unt-system-iam|UNT System IAM]] is effectively inactive: [[collection/entities/cisco-duo|Duo]] account deletion, [[collection/entities/active-directory|AD]] offboarding, and [[collection/entities/edirectory-idtree|IDTREE]] role purge scripts either have their destructive operations commented out or were never added to crontab.

## Findings

### Duo Account Offboarding — Disabled

`duo_offboard_users.py` is scheduled in the Duo crontab (daily at 5:40 AM). However, the critical API call `admin_api.delete_user()` is commented out on line 294. The script runs daily, builds a list of terminated, retired, and unaffiliated users, writes that list to `delete-disable-users-duo.json`, and then exits without taking action. A header comment indicates it was "originally a clone of the sync user attributes script," suggesting it was adapted from another script and never completed. A hardcoded user skip (`cam0794`) confirms the script was frozen mid-testing.

A second script, `duo_students_old_enrollment_no_affiliation.py`, targets disabled/terminated student accounts for deletion. It is not scheduled in any crontab, and its `delete_user()` call is also commented out.

**Result**: No Duo scripts in the current infrastructure perform any account deletion or status changes.

### IDTREE Role Purge Scripts — Never Scheduled

Three Python purge scripts exist: `purge_unt_roles.py`, `purge_hsc_roles.py`, and `purge_dal_roles.py`. None appear in the purge crontab. The only scheduled purge job is `find_old_enrollment_groups.py` (weekly, Saturdays). The `purge/archive/` directory contains the original Perl predecessors (`purge_untst_roles.pl`, `purge_hscst_roles.pl`, etc.), confirming the Python scripts were intended as replacements.

**Result**: Approximately 113,000 users retain stale student attributes — including `classEnrollment` references, role values, and scoped affiliations — indefinitely in IDTREE.

### AD Offboarding — Never Scheduled

`ad/offboarding.py` contains logic to disable AD accounts and delete Exchange ActiveSync objects but does not appear in any crontab. The only scheduled offboarding-adjacent process is `idtree/idtree_offboarding_workaround.py` (daily at 11:59 PM), which removes terminated employees from IDTREE group memberships — including the `DuoHelpDesk` group — but does not disable accounts or touch AD or Duo.

## Root Cause

The pattern is consistent across all three areas: working destructive scripts exist in the repository but were never activated. The most probable cause is an incomplete Perl-to-Python migration undertaken between 2020 and 2022. Archived Perl originals sit alongside unscheduled Python replacements; commented-out API calls and hardcoded test-user skips indicate the developer(s) completed the identification/logic phase of the rewrite but deferred enabling destructive operations — likely out of appropriate caution — and then the project stalled before the final activation step. No documentation or handoff records exist.

## Downstream Impact

| System | Impact |
|--------|--------|
| [[collection/entities/cisco-duo\|Cisco Duo]] | Terminated, retired, and unaffiliated users retain active Duo accounts indefinitely, inflating license count and expanding authentication surface |
| [[collection/entities/edirectory-idtree\|IDTREE]] | ~113,000 users carry stale enrollment, role, and affiliation attributes, contributing to group bloat and inaccurate affiliation-based access decisions |
| [[collection/entities/active-directory\|Active Directory]] | No automated account disablement for separated employees; any offboarding depends on manual action or Identity Manager drivers |

## Remediation

The IAM team's refactoring effort — migrating scripts from `dstools` to the `iam-scripts-provisioning` repository under the `iam_modules` shared library (v3.0.0) — addresses this gap directly. Refactored scripts follow a dry-run-by-default pattern (`--commit` flag required for writes), use modern `ldap3` bindings, and are governed by a formal `CONTRACT.md`. The `iam-scripts-alma-v2` deactivation/reactivation scripts already integrate with [[collection/entities/cisco-duo|Duo]], [[collection/entities/active-directory|AD]], [[collection/entities/edirectory-idtree|eDirectory]], and Entra ID.

Completing the migration and scheduling the new purge and offboarding scripts will close the deprovisioning gap open since approximately 2022. See [[collection/synthesis/unt-iam-deprovisioning-gap|UNT IAM Deprovisioning Gap]] for a cross-cutting analysis connecting this gap to ALMA's design.

## Relationship to ALMA

This document is the gap-analysis counterpart to the [[collection/sources/2026-04-25-alma-v2-technical-reference|ALMA v2 Technical Reference]]. ALMA handles the inactivity lifecycle dimension (temporary deactivation and reactivation of inactive users). The deprovisioning gap documents the separate, unresolved problem of permanent offboarding for separated users — terminated, retired, unaffiliated — which operates on different triggers and requires different automation. The two domains share infrastructure ([[collection/entities/edirectory-idtree|IDTREE]], [[collection/entities/active-directory|AD]], [[collection/entities/cisco-duo|Duo]]) but are independent code paths.
