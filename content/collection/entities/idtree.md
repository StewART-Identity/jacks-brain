---
title: "IDTREE"
summary: "UNT System directory storing user roles, affiliations, and enrollment attributes; ~113,000 users retain stale attributes due to inactive purge automation since ~2022."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - idtree
  - directory
  - ldap
  - unt-system
  - provisioning
  - deprovisioning
  - roles
  - affiliations
  - enrollment
  - group-bloat
sources:
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

IDTREE is [[collection/entities/unt-system]]'s internal directory service, responsible for storing and managing user roles, scoped affiliations, and enrollment attributes (such as `classEnrollment` references) across the UNT System campuses (UNT, HSC, Dallas). It is a central component of the IAM provisioning pipeline — access decisions based on affiliation are derived from IDTREE attributes.

## Role Purge Gap

As documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]], all IDTREE role purge automation via the dstools provisioning infrastructure is inactive. Three Python purge scripts exist in the repository (`purge_unt_roles.py`, `purge_hsc_roles.py`, `purge_dal_roles.py`) but none appear in the purge crontab. The `purge/archive/` directory contains their original Perl predecessors, confirming these scripts were intended replacements that were written but never scheduled.

The only scheduled purge job is `find_old_enrollment_groups.py` (weekly, Saturdays), which does not perform the same function as the purge scripts.

**Impact:** Approximately 113,000 users retain stale student attributes — `classEnrollment` references, role values, and scoped affiliations — indefinitely. This contributes to:
- Group bloat (e.g., UNT Graduate Students group retaining former students)
- Inaccurate affiliation-based access decisions
- Stale role values inflating the effective access surface

## Offboarding Workaround

`idtree/idtree_offboarding_workaround.py` runs daily at 11:59 PM and removes terminated employees from IDTREE group memberships (including the [[collection/entities/cisco-duo]] DuoHelpDesk group). This is the only active offboarding-adjacent automation — it does not address the role purge gap and does not touch [[collection/entities/active-directory]] or [[collection/entities/cisco-duo]] accounts.

## [[collection/concepts/deprovisioning]] Context

The stale-attribute problem is a direct consequence of the incomplete Perl-to-Python migration documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]. See [[collection/concepts/deprovisioning]] for the broader framework.
