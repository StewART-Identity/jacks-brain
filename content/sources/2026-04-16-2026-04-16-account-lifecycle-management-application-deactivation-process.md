---
title: "ALMA Deactivation Process"
type: source
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - identity-management
  - account-lifecycle
  - deactivation
  - alma
sources: []
confidence: high
---

# ALMA Deactivation Process

[Download original](/originals/2026-04-16-Account-Lifecycle-Management-Application-Deactivation-Process.docx)

Internal documentation for the [[entities/alma|Account Lifecycle Management Application (ALMA)]] deactivation workflow. Describes the three-step process by which ALMA identifies and disables inactive user accounts across university identity systems.

## Overview

[[entities/alma|ALMA]] deactivates (and reactivates) users' computer accounts. The process is deliberately conservative: an account will not be deactivated if the user appears in any [[concepts/authoritative-data-sources|authoritative data source]] indicating a current or recent affiliation with the university.

The [[concepts/account-deactivation-process|deactivation process]] has three phases:

1. **Selection** — build a list of [[concepts/provisional-users|provisional users]] (inactive accounts)
2. **Review** — check each provisional user against all authoritative data sources; exclude anyone found
3. **Deactivation** — apply disable actions across all connected systems

## Selection Criteria

A user enters the provisional list if **both** conditions hold:

- `lastLogonTimestamp <= TODAY - 18 months`
- `loginDisabled = FALSE`

Source: [[entities/idtree|IDTREE]] (eDirectory).

## Data Sources Checked During Review

Users are excluded from deactivation if found in any of the following:

| Affiliation | Database | Data Object | Notes |
|-------------|----------|-------------|-------|
| Applicants | LSPD | PS_GBSA_AC_APPL | |
| Enrolled students | LSPD | PS_GBSA_AC_STUDENT | |
| Hiatus (LOA) | LSPD | PS_GBSA_AC_STU_LOA | Leave of absence |
| Payments | LSPD | PS_GBSA_AC_PYMT | Paying off university debt |
| Exceptions | LSPD | PS_GBSA_AC_OPT | Includes visa extension cases |
| Alumni (PS) | LSPD | PS_GBSA_AC_GRAD | |
| Alumni (dir) | IDTREE | o=unt | eduPersonAffiliation=alumni |
| Employees | HRPD | PS_GBHR_IAM_EXCL_V | Includes emeritus faculty |
| Retirees | HRPD | PS_GBHR_… | |
| POIs | IDTREE | o=unt | role=hscvend\|untvs\|etc. |
| Overrides | IDTREE | o=unt | untAccountOverride=Y |
| Deceased | LSPD | PS_GBSA_AC_DECEASE | |

[[entities/peoplesoft|PeopleSoft]] views include users with a current affiliation **or** who lost affiliation within the past 18 months (grace period).

See [[concepts/persons-of-interest|Persons of Interest]] for the full POI role list.

## Deactivation Actions

### [[entities/idtree|IDTREE]] (eDirectory)
- Set `untAccountDisabled = Y`
- Set `untAccountDisabledDate = YYYYMMDDHHMMSSZ`
- Set `loginDisabled = TRUE`
- Set `description = "Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

### [[entities/active-directory|Active Directory]] (HSC, STUDENTS, UNT domains)
- Set `userAccountControl` bit 2 (disabled)
- Set `description = "Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

### [[entities/duo|Duo]]
- Delete user from the Duo account
- Remove from `DuoUsers` group
- Remove from `ECS-DUO-Users` group

## API Surface

Deactivation is triggered via `POST /api/lifecycle/{euid}/deactivate`. Supports `dry_run` and `force` query parameters.

All endpoints require HTTP Basic Authentication. Users must be members of `cn=IAM-Microservices,ou=IAMApplications,o=unt` in [[entities/idtree|eDirectory]].

Most endpoints accept either **OPRID** (euid) or **EMPLID** (workforceID) as identifier.

### Full Endpoint List

| Method | Path | Description |
|--------|------|-------------|
| GET | / | Health check |
| GET | /health | Health status (no auth) |
| GET | /docs | Swagger UI |
| GET | /redoc | ReDoc |
| GET | /api/entra/upn/{username} | UPN from [[entities/entra-id|Entra ID]] |
| GET | /api/ad/upn/{username} | UPN from on-prem AD GC |
| GET | /api/users/eis/employees/{id} | Active employee check |
| GET | /api/users/eis/retirees/{id} | Retiree check |
| GET | /api/users/eis/students/enrolled/{id} | Enrolled student check |
| GET | /api/users/eis/students/applicants/{id} | Applicant check |
| GET | /api/users/eis/students/loa/{id} | Leave of absence check |
| GET | /api/users/eis/students/payment/{id} | Payment record check |
| GET | /api/users/eis/students/optional-indicators/{id} | Optional indicators |
| GET | /api/users/eis/students/special/{id} | Special category check |
| GET | /api/users/eis/alumni/{id} | Alumni check |
| GET | /api/users/eis/deceased/{id} | Deceased check |
| GET | /api/users/idtree/roles/{id} | All roles and POI status |
| GET | /api/users/idtree/roles/{id}/is-poi | POI role check |
| GET | /api/users/idtree/affiliations/{id}/is-alum | Alumni affiliation check |
| GET | /api/users/affiliations/{id} | All affiliations (cross-system) |
| POST | /api/lifecycle/{euid}/deactivate | Deactivate account |
| POST | /api/lifecycle/{euid}/reactivate | Reactivate account |
