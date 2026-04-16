---
title: "ALMA Deactivation Process"
type: source
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - account-management
  - deactivation
  - unt
sources: []
confidence: high
---

# ALMA Deactivation Process

[Download original](/originals/2026-04-16-Account-Lifecycle-Management-Application-Deactivation-Process.docx)

Internal documentation describing the account deactivation workflow in [[entities/alma|ALMA]] (Account Lifecycle Management Application) for [[entities/unt|UNT]] identity management.

## Overview

[[entities/alma|ALMA]] handles both deactivation and reactivation of user computer accounts. The deactivation process is intentionally conservative — accounts are not deactivated unless the user is absent from all authoritative data sources.

The process has three stages:

1. **Selection** — identify provisional (candidate) users
2. **Review** — cross-check against authoritative data sources
3. **Deactivation** — apply account-disabling mechanics

See [[concepts/account-deactivation|Account Deactivation Process]] for a full conceptual breakdown.

## Selection Criteria

A user enters the provisional list if **both** conditions hold:

- `lastLogonTimestamp <= TODAY - 18 months`
- `loginDisabled = FALSE`

## Review: Authoritative Data Sources

If a user appears in **any** of these sources, they are removed from the provisional list and their account is not deactivated. [[entities/peoplesoft|PeopleSoft]] views include users with a current affiliation **or** who lost affiliation within the past 18 months (the grace period).

| Affiliation | Database | Data Object | Match Field |
|---|---|---|---|
| Applicants | LSPD | PS_GBSA_AC_APPL | OPRID=euid |
| Enrolled students | LSPD | PS_GBSA_AC_STUDENT | OPRID=euid |
| Students on hiatus/LOA | LSPD | PS_GBSA_AC_STU_LOA | OPRID=euid |
| Students with payments | LSPD | PS_GBSA_AC_PYMT | OPRID=euid |
| Student exceptions | LSPD | PS_GBSA_AC_OPT | OPRID=euid |
| Alumni (PeopleSoft) | LSPD | PS_GBSA_AC_GRAD | OPRID=euid |
| Alumni (IDTREE) | IDTREE | o=unt | eduPersonAffiliation=alumni |
| Employees (incl. emeritus) | HRPD | PS_GBHR_IAM_EXCL_V | OPRID=euid |
| Retirees | HRPD | PS_GBHR_... | OPRID=euid |
| POIs | IDTREE | o=unt | role=hscvend\|untvs\|etc. |
| Overrides | IDTREE | o=unt | untAccountOverride=Y |
| Deceased | LSPD | PS_GBSA_AC_DECEASE | OPRID=euid |

### Persons of Interest (POI)

POI roles are stored in the [[entities/idtree|IDTREE]] `role` attribute. Emeritus faculty are excluded from this list (handled via PeopleSoft). See [[concepts/persons-of-interest|Persons of Interest]] for the full role taxonomy.

### Account Overrides

`untAccountOverride=Y` in [[entities/idtree|IDTREE]] protects accounts on a case-by-case basis, including groups of users with no standard data source (e.g., one-off affiliates).

## Deactivation Actions

Deactivation is executed via the `/api/lifecycle/{euid}/deactivate` endpoint. Supports `dry_run` and `force` query parameters.

### IDTREE (eDirectory)

- Set `untAccountDisabled` → `Y`
- Set `untAccountDisabledDate` → `YYYYMMDDHHMMSSZ`
- Set `loginDisabled` → `TRUE`
- Set `description` → `"Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

### Active Directory (HSC, STUDENTS, UNT Domains)

- Set `userAccountControl` bit 2 (disabled flag)
- Set `description` → `"Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

### Duo

- Delete user from the Duo account
- Remove from `DuoUsers` group
- Remove from `ECS-DUO-Users` group

## API Surface

Authentication: HTTP Basic Auth required on all endpoints except `/health`. Caller must be a member of `cn=IAM-Microservices,ou=IAMApplications,o=unt` in eDirectory.

Most endpoints accept either **OPRID** (euid) or **EMPLID** (workforceID) as the identifier.

| Method | Path | Purpose |
|---|---|---|
| GET | / | Health check |
| GET | /health | Health status (no auth) |
| GET | /docs | Swagger UI |
| GET | /redoc | ReDoc |
| GET | /api/entra/upn/{username} | UPN from Entra ID |
| GET | /api/ad/upn/{username} | UPN from on-prem AD GC |
| GET | /api/users/eis/employees/{id} | Active employee check |
| GET | /api/users/eis/retirees/{id} | Retiree check |
| GET | /api/users/eis/students/enrolled/{id} | Enrollment check |
| GET | /api/users/eis/students/applicants/{id} | Application check |
| GET | /api/users/eis/students/loa/{id} | Leave of absence check |
| GET | /api/users/eis/students/payment/{id} | Payment record check |
| GET | /api/users/eis/students/optional-indicators/{id} | Optional indicators |
| GET | /api/users/eis/students/special/{id} | Special category check |
| GET | /api/users/eis/alumni/{id} | Alumni table check |
| GET | /api/users/eis/deceased/{id} | Deceased table check |
| GET | /api/users/idtree/roles/{id} | All roles + POI status |
| GET | /api/users/idtree/roles/{id}/is-poi | POI role check |
| GET | /api/users/idtree/affiliations/{id}/is-alum | Alumni affiliation check |
| GET | /api/users/affiliations/{id} | Cross-system affiliation check |
| POST | /api/lifecycle/{euid}/deactivate | Deactivate account |
| POST | /api/lifecycle/{euid}/reactivate | Reactivate account |
