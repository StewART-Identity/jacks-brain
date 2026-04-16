---
title: "Authoritative Data Sources"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - identity-management
  - data-governance
  - account-lifecycle
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Authoritative Data Sources

In the context of university identity management, an authoritative data source is a system of record that determines whether a user has a valid, current (or recently expired) affiliation with the university. [[entities/alma|ALMA]] consults a set of these sources during the [[concepts/account-deactivation-process|account deactivation process]] to avoid prematurely disabling accounts.

## Principle

No single source is complete. A user may not appear in HR data but still be an enrolled student, or may not be a student but hold a [[concepts/persons-of-interest|POI role]]. ALMA therefore checks across all sources and treats **any match as a veto** against deactivation.

## Sources and Their Systems

| System | Covers |
|--------|--------|
| [[entities/peoplesoft\|PeopleSoft LSPD]] | Students (enrolled, applicants, LOA, payments, exceptions), alumni, deceased |
| [[entities/peoplesoft\|PeopleSoft HRPD]] | Employees (including emeritus faculty), retirees |
| [[entities/idtree\|IDTREE]] | Alumni (by `eduPersonAffiliation`), [[concepts/persons-of-interest\|POIs]] (by `role`), account overrides (`untAccountOverride=Y`) |

## Grace Period

[[entities/peoplesoft|PeopleSoft]] views include users who lost their affiliation within the **past 18 months**, not just current affiliates. This provides a buffer so that recently graduated students or recently terminated employees aren't immediately deactivated.

## Account Overrides

IDTREE supports an `untAccountOverride=Y` flag for edge cases where no standard data source covers a user. Overrides are granted case-by-case or applied to groups for whom no suitable data source exists.

## Cross-System Lookup API

The ALMA endpoint `GET /api/users/affiliations/{identifier}` checks a user against all sources in a single call and returns a unified view of affiliations.

## Related

- [[entities/alma|ALMA]]
- [[entities/peoplesoft|PeopleSoft]]
- [[entities/idtree|IDTREE]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/provisional-users|Provisional Users]]
- [[concepts/persons-of-interest|Persons of Interest]]
