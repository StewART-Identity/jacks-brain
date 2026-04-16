---
title: "Persons of Interest (POIs)"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - identity-management
  - affiliations
  - account-lifecycle
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Persons of Interest (POIs)

"Persons of Interest" (POIs) is an affiliation category for university-affiliated individuals who do not fit neatly into the standard student or employee categories. POI status is stored as a `role` attribute in [[entities/idtree|IDTREE]] and is one of the [[concepts/authoritative-data-sources|authoritative data sources]] that can block [[concepts/account-deactivation-process|account deactivation]].

## POI Roles

| Role | Description |
|------|-------------|
| dalcamp | Dallas Camp Attendee |
| dalint | Dallas Interns |
| dalvend | Dallas Vendors |
| dalvol | Dallas Volunteers |
| dalvs | Dallas Visiting Scholar |
| hscadj | HSC Adjunct Faculty |
| hsccamp | HSC Camp Attendee |
| hscfel | HSC Fellow |
| hscint | HSC Intern |
| hscprec | HSC Preceptor |
| hscres | HSC Resident |
| hscvend | HSC Vendor |
| hscvol | HSC Volunteer |
| hscvs | HSC Visiting Scholar |
| sysvend | System Vendors |
| untcamp | UNT Campus Attendee |
| untint | UNT Intern |
| untvend | UNT Vendor |
| untvol | UNT Volunteer |
| untvs | UNT Visiting Scholar |
| untwifi | UNT Wifi |

## Exclusions

Emeritus faculty are **not** included in the POI list. They are handled via [[entities/peoplesoft|PeopleSoft]] (HRPD view `PS_GBHR_IAM_EXCL_V`).

## How POIs Are Checked

During the review phase, [[entities/alma|ALMA]] checks `o=unt` in IDTREE for users whose `role` attribute contains a POI value. API endpoints:

- `GET /api/users/idtree/roles/{id}` — returns all roles
- `GET /api/users/idtree/roles/{id}/is-poi` — binary POI check

## Related

- [[entities/alma|ALMA]]
- [[entities/idtree|IDTREE]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
