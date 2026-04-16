---
title: "IDTREE (eDirectory)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - directory-service
  - ldap
  - identity-management
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# IDTREE (eDirectory)

IDTREE is the university's central LDAP/eDirectory instance. It serves as the primary identity store and is one of the [[concepts/authoritative-data-sources|authoritative data sources]] consulted by [[entities/alma|ALMA]] during account lifecycle decisions.

## Role in Account Lifecycle

IDTREE is both the **source of record** for account state and a **data source** checked during the review phase:

- Selection criteria (`lastLogonTimestamp`, `loginDisabled`) are read from IDTREE.
- During review, IDTREE is checked for alumni affiliation (`eduPersonAffiliation=alumni`) and [[concepts/persons-of-interest|POI roles]].
- During [[concepts/account-deactivation-process|deactivation]], several IDTREE attributes are set:
  - `untAccountDisabled = Y`
  - `untAccountDisabledDate = YYYYMMDDHHMMSSZ`
  - `loginDisabled = TRUE`
  - `description = "Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

## Directory Structure

The primary tree root used for user lookups is `o=unt`.

## Authentication

ALMA API callers must be members of `cn=IAM-Microservices,ou=IAMApplications,o=unt` in IDTREE.

## API Endpoints (via ALMA)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/idtree/roles/{id} | Get all roles and POI status |
| GET | /api/users/idtree/roles/{id}/is-poi | Check POI role |
| GET | /api/users/idtree/affiliations/{id}/is-alum | Check alumni affiliation |

## Related

- [[entities/alma|ALMA]]
- [[entities/active-directory|Active Directory]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
- [[concepts/persons-of-interest|Persons of Interest]]
