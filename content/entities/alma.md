---
title: "ALMA (Account Lifecycle Management Application)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - system
  - account-management
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# ALMA (Account Lifecycle Management Application)

ALMA is the internal [[entities/unt|UNT]] IAM system responsible for managing the full lifecycle of user computer accounts — including deactivation and reactivation across all connected directory and authentication systems.

## Function

ALMA automates the [[concepts/account-deactivation|account deactivation process]] by:

1. Selecting candidate accounts (not logged in for 18+ months, currently enabled)
2. Cross-checking each candidate against authoritative data sources ([[entities/peoplesoft|PeopleSoft]], [[entities/idtree|IDTREE]])
3. Deactivating accounts that are not protected by any data source

It also handles **reactivation** via a symmetric workflow.

## Connected Systems

ALMA orchestrates actions across:

- **[[entities/idtree|IDTREE]]** (eDirectory) — primary identity store
- **[[entities/active-directory|Active Directory]]** — HSC, STUDENTS, and UNT domains
- **[[entities/duo|Duo]]** — MFA platform

## API

Exposed as a REST API. Key endpoint: `POST /api/lifecycle/{euid}/deactivate`.

Authentication requires HTTP Basic Auth; callers must belong to `cn=IAM-Microservices,ou=IAMApplications,o=unt` in eDirectory.

Accepts identifiers as either **OPRID** (euid) or **EMPLID** (workforceID).

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
