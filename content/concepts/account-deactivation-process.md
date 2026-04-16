---
title: "Account Deactivation Process"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - account-lifecycle
  - deactivation
  - process
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Account Deactivation Process

The account deactivation process is the workflow by which [[entities/alma|ALMA]] identifies and disables the computer accounts of users who no longer have an active relationship with the university.

## Three-Step Workflow

### 1. Selection

ALMA queries [[entities/idtree|IDTREE]] for [[concepts/provisional-users|provisional users]]: accounts that have not been used in 18 months and are not already disabled.

Criteria:
- `lastLogonTimestamp <= TODAY - 18 months`
- `loginDisabled = FALSE`

### 2. Review

Each provisional user is checked against all [[concepts/authoritative-data-sources|authoritative data sources]]. If the user appears in **any** source, they are removed from the provisional list and will **not** be deactivated.

Sources checked include [[entities/peoplesoft|PeopleSoft]] views (students, employees, alumni, deceased) and [[entities/idtree|IDTREE]] (alumni affiliation, [[concepts/persons-of-interest|POI roles]], account overrides).

The review phase is deliberately conservative: one valid affiliation is sufficient to block deactivation entirely.

### 3. Deactivation

For users remaining after review, ALMA applies disable actions across all connected systems:

| System | Action |
|--------|--------|
| [[entities/idtree\|IDTREE]] | Set `untAccountDisabled=Y`, `loginDisabled=TRUE`, set description |
| [[entities/active-directory\|Active Directory]] | Set `userAccountControl` bit 2, set description |
| [[entities/duo\|Duo]] | Delete user, remove from DuoUsers and ECS-DUO-Users groups |

## Key Design Decisions

- **Conservative by default.** Presence in any single data source blocks deactivation.
- **18-month grace period.** Both the selection cutoff and PeopleSoft's view grace period use 18 months, creating a double buffer for recently-inactive users.
- **Multi-system scope.** Deactivation is applied atomically across IDTREE, AD, and Duo via a single API call.
- **Dry-run support.** The `/api/lifecycle/{euid}/deactivate` endpoint accepts a `dry_run` flag for safe testing.

## Related

- [[entities/alma|ALMA]]
- [[concepts/provisional-users|Provisional Users]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
- [[concepts/persons-of-interest|Persons of Interest]]
- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|Source: ALMA Deactivation Process]]
