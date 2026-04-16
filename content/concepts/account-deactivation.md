---
title: "Account Deactivation Process"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - account-management
  - deactivation
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Account Deactivation Process

The account deactivation process at [[entities/unt|UNT]] is implemented by [[entities/alma|ALMA]] and governs how inactive computer accounts are disabled across all connected systems. The process is deliberately conservative — accounts are not deactivated unless the user is completely absent from all authoritative data sources.

## Three-Step Workflow

### 1. Selection

ALMA builds a **provisional users list**: accounts that satisfy both:

- `lastLogonTimestamp <= TODAY - 18 months` (no login in 18+ months)
- `loginDisabled = FALSE` (currently active)

The 18-month window aligns with the grace period used in [[entities/peoplesoft|PeopleSoft]] views.

### 2. Review

Each provisional user is cross-checked against all authoritative data sources. If found in **any** source, the user is removed from the provisional list and their account is preserved.

Sources checked (in [[entities/peoplesoft|PeopleSoft]] via LSPD/HRPD, and in [[entities/idtree|IDTREE]]):

- Students: applicants, enrolled, on leave, in payment plans, exceptions
- Alumni (both PeopleSoft and IDTREE)
- Employees, emeritus faculty, retirees
- [[concepts/persons-of-interest|Persons of Interest]] (POI roles in IDTREE)
- Manual overrides (`untAccountOverride=Y`)
- Deceased users

### 3. Deactivation

Accounts remaining on the provisional list after review are deactivated across three systems:

**[[entities/idtree|IDTREE]]:**
- `untAccountDisabled` = Y
- `untAccountDisabledDate` = timestamp
- `loginDisabled` = TRUE
- `description` = deactivation notice with timestamp

**[[entities/active-directory|Active Directory]]** (HSC, STUDENTS, UNT domains):
- `userAccountControl` bit 2 set (disabled)
- `description` = deactivation notice with timestamp

**[[entities/duo|Duo]]:**
- User deleted from Duo account
- Removed from `DuoUsers` and `ECS-DUO-Users` groups

## API

Deactivation is triggered via `POST /api/lifecycle/{euid}/deactivate` on the ALMA API. Query parameters:

- `dry_run` (bool) — simulate without applying changes
- `force` (bool) — bypass some safety checks

Reactivation is symmetric: `POST /api/lifecycle/{euid}/reactivate` (supports `dry_run`).

## Design Principle

The conservative approach reflects the risk asymmetry: **premature deactivation disrupts legitimate users**, while keeping an inactive account enabled is a lower-severity issue. The 18-month inactivity threshold and multi-source review exist to minimize false positives.

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
