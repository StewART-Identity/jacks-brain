---
title: "ALMA (Account Lifecycle Management Application)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - identity-management
  - application
  - account-lifecycle
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# ALMA (Account Lifecycle Management Application)

ALMA is the internal application responsible for managing the full lifecycle of university computer accounts — primarily [[concepts/account-deactivation-process|deactivation]] and reactivation.

## What It Does

ALMA automates the process of identifying inactive accounts and disabling them across all connected identity systems:

- [[entities/idtree|IDTREE]] (eDirectory)
- [[entities/active-directory|Active Directory]] (HSC, STUDENTS, UNT domains)
- [[entities/duo|Duo]] (MFA)
- [[entities/entra-id|Entra ID]] / Microsoft 365

It also handles reactivation when a deactivated user regains a valid affiliation.

## Design Philosophy

The deactivation process is deliberately conservative. ALMA checks a user against multiple [[concepts/authoritative-data-sources|authoritative data sources]] before deactivating. If a user appears in **any** source, they are excluded. This prevents premature deactivation of accounts belonging to people who still have a current or recent relationship with the university.

## API

ALMA exposes a REST API. The core lifecycle endpoints are:

- `POST /api/lifecycle/{euid}/deactivate` — deactivate across all systems; supports `dry_run` and `force` params
- `POST /api/lifecycle/{euid}/reactivate` — reactivate across all systems; supports `dry_run`

Authentication uses HTTP Basic Auth; callers must be in `cn=IAM-Microservices,ou=IAMApplications,o=unt` in [[entities/idtree|eDirectory]].

## Identifiers

Most endpoints accept either:
- **OPRID** (euid) — the primary university identifier
- **EMPLID** (workforceID) — HR system identifier

## Related

- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/provisional-users|Provisional Users]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
- [[concepts/persons-of-interest|Persons of Interest]]
- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|Source: ALMA Deactivation Process]]
