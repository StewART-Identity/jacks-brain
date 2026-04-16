---
title: "Persons of Interest (POI)"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - affiliation
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Persons of Interest (POI)

Persons of Interest (POIs) are a catch-all affiliation category at [[entities/unt|UNT]] for users who are not students, employees, or alumni but who have a legitimate relationship with the university. POI status is stored in the [[entities/idtree|IDTREE]] `role` attribute and protects accounts from [[concepts/account-deactivation|deactivation]].

## Role Taxonomy

| Role | Description |
|---|---|
| `dalcamp` | Dallas Camp Attendee |
| `dalint` | Dallas Intern |
| `dalvend` | Dallas Vendor |
| `dalvol` | Dallas Volunteer |
| `dalvs` | Dallas Visiting Scholar |
| `hscadj` | HSC Adjunct Faculty |
| `hsccamp` | HSC Camp Attendee |
| `hscfel` | HSC Fellow |
| `hscint` | HSC Intern |
| `hscprec` | HSC Preceptor |
| `hscres` | HSC Resident |
| `hscvend` | HSC Vendor |
| `hscvol` | HSC Volunteer |
| `hscvs` | HSC Visiting Scholar |
| `sysvend` | System Vendor |
| `untcamp` | UNT Campus Attendee |
| `untint` | UNT Intern |
| `untvend` | UNT Vendor |
| `untvol` | UNT Volunteer |
| `untvs` | UNT Visiting Scholar |
| `untwifi` | UNT WiFi |

## Exclusion: Emeritus Faculty

Emeritus faculty are **not** included in the POI list. They are instead protected via a [[entities/peoplesoft|PeopleSoft]] view (`PS_GBHR_IAM_EXCL_V`, HRPD database, Employees category).

## API Check

[[entities/alma|ALMA]] exposes two endpoints for POI status:
- `GET /api/users/idtree/roles/{identifier}` — returns all roles
- `GET /api/users/idtree/roles/{identifier}/is-poi` — boolean POI check

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
