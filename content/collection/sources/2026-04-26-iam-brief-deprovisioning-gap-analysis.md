---
title: "IAM Brief: Provisioning Infrastructure Deprovisioning Gap Analysis"
summary: "Analysis revealing all deprovisioning automation (Duo, AD, IDTREE) at UNT System has been inactive since ~2022 due to an incomplete Perl-to-Python migration."
type: source
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - deprovisioning
  - offboarding
  - provisioning
  - duo
  - active-directory
  - idtree
  - dstools
  - unt-system
  - perl-to-python
  - automation
  - gap-analysis
  - crontab
  - iam-scripts-provisioning
confidence: high
role: analysis
views:
  - date: 2026-04-26
    note: "Initial cataloging."
sources: []
---

Internal IAM brief authored by Jack Stewart, IAM Engineer at [[collection/entities/unt-system]], dated March 6, 2026. Cross-references the [[collection/entities/dstools]] provisioning scripts against their active crontab schedules to document the scope of deprovisioning automation failure across three systems: [[collection/entities/cisco-duo]], [[collection/entities/active-directory]], and [[collection/entities/idtree]].

[Download original](/api/originals/2026-04-26-IAM_Brief_Deprovisioning_Gap_Analysis.pdf)

## Summary of Findings

All [[collection/concepts/deprovisioning]] automation is effectively inactive. Scripts exist in the repository and contain correct logic, but either have destructive operations commented out or were never added to the crontab. The pattern is consistent across all three systems.

### Duo Account Offboarding — Disabled

`duo_offboard_users.py` is scheduled in the Duo crontab (daily at 5:40 AM), but its critical API call `admin_api.delete_user()` is commented out at line 294. The script runs, builds a list of terminated/retired/unaffiliated users, writes the list to `delete-disable-users-duo.json`, and exits without action. A hardcoded user skip (`cam0794`) confirms the script was frozen mid-testing.

A second script, `duo_students_old_enrollment_no_affiliation.py`, targets disabled/terminated student accounts but is not scheduled in any crontab, and its `delete_user()` call is also commented out. **No Duo scripts in the current infrastructure perform any account deletion or status changes.**

### IDTREE Role Purge Scripts — Never Scheduled

Three Python purge scripts exist (`purge_unt_roles.py`, `purge_hsc_roles.py`, `purge_dal_roles.py`) but none appear in the purge crontab. The only scheduled purge job is `find_old_enrollment_groups.py` (weekly, Saturdays). The `purge/archive/` directory contains the original Perl predecessors, confirming these Python scripts were intended replacements that were never activated. Result: approximately **113,000 users** retain stale student attributes — `classEnrollment` references, role values, and scoped affiliations — indefinitely in IDTREE.

### AD Offboarding — Never Scheduled

`ad/offboarding.py` contains logic to disable AD accounts and delete Exchange ActiveSync objects but does not appear in any crontab. The only scheduled offboarding-adjacent process is `idtree/idtree_offboarding_workaround.py` (daily at 11:59 PM), which removes terminated employees from IDTREE group memberships (including DuoHelpDesk) but does not disable accounts or touch AD or Duo.

## Root Cause

An incomplete Perl-to-Python migration undertaken between 2020–2022. Developers completed the identification/logic phase of the rewrite and then deferred enabling destructive operations — likely out of appropriate caution — before the project stalled. No documentation or handoff records exist. The archived Perl originals alongside unscheduled Python replacements are the clearest evidence.

## Downstream Impact

- **Duo:** Terminated, retired, and unaffiliated users retain active Duo accounts indefinitely, inflating license count and expanding the authentication surface.
- **IDTREE:** ~113,000 users carry stale enrollment, role, and affiliation attributes, contributing to group bloat and inaccurate affiliation-based access decisions.
- **AD:** No automated account disablement for separated employees; any offboarding depends on manual action or Identity Manager drivers.

## Remediation Status

The current refactoring effort migrates scripts from dstools to the `iam-scripts-provisioning` repository under the `iam_modules` shared library (v3.0.0). All refactored scripts use a dry-run-by-default pattern (`--commit` flag required for writes), modern `ldap3` bindings, and a formal `CONTRACT.md`. The `iam-scripts-alma-v2` deactivation/reactivation scripts already integrate with [[collection/entities/cisco-duo]], [[collection/entities/active-directory]], eDirectory, and [[collection/entities/microsoft-entra-id]]. Completing the migration and scheduling the new purge and offboarding scripts will close the gap that has been open since approximately 2022.

See [[collection/synthesis/unt-system-iam-infrastructure-gaps]] for analysis of how this gap fits within the broader pattern of incomplete IAM migrations at UNT System.
