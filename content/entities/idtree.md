---
title: "IDTREE (eDirectory)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - directory
  - ldap
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# IDTREE (eDirectory)

IDTREE is [[entities/unt|UNT]]'s enterprise directory service, built on NetIQ/Micro Focus eDirectory (LDAP-based). It is the primary identity store for IAM operations, including [[concepts/account-deactivation|account deactivation]].

## Role in Account Lifecycle

[[entities/alma|ALMA]] reads from and writes to IDTREE at multiple points:

**As a data source (review phase):**
- Alumni affiliation: `eduPersonAffiliation=alumni`
- [[concepts/persons-of-interest|POI]] roles: `role` attribute (e.g., `hscvend`, `untvs`)
- Account overrides: `untAccountOverride=Y`

**As a deactivation target:**
- `untAccountDisabled` → `Y`
- `untAccountDisabledDate` → timestamp
- `loginDisabled` → `TRUE`
- `description` → deactivation note

## Key Attributes

| Attribute | Purpose |
|---|---|
| `loginDisabled` | Primary account enable/disable flag |
| `untAccountDisabled` | ALMA-specific disable flag |
| `untAccountDisabledDate` | Timestamp of deactivation |
| `untAccountOverride` | Manual override to prevent deactivation |
| `role` | POI classification |
| `eduPersonAffiliation` | Standard affiliation (e.g., alumni) |

## Tree Context

The main tree context is `o=unt`. IAM microservices are authorized via `cn=IAM-Microservices,ou=IAMApplications,o=unt`.

## API Access

Accessed via ALMA's `/api/users/idtree/` base path.

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
