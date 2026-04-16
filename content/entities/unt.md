---
title: "UNT (University of North Texas)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - institution
  - university
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# UNT (University of North Texas)

The University of North Texas is the institution whose IAM (Identity and Access Management) infrastructure is documented throughout this wiki. UNT operates multiple campuses including the main UNT campus and the Health Science Center (HSC), each with distinct IAM domains and roles.

## IAM Systems

| System | Role |
|---|---|
| [[entities/alma|ALMA]] | Account lifecycle management |
| [[entities/idtree|IDTREE]] | Primary enterprise directory (eDirectory) |
| [[entities/peoplesoft|PeopleSoft (EIS)]] | Authoritative source for students and employees |
| [[entities/active-directory|Active Directory]] | Windows/Microsoft domain authentication |
| [[entities/duo|Duo]] | Multi-factor authentication |

## Affiliation Types

UNT manages a broad range of user affiliations:

- **Students**: applicants, enrolled, on hiatus/LOA, payment plans, exceptions
- **Alumni**: tracked in both PeopleSoft and IDTREE
- **Employees**: active staff/faculty, emeritus faculty, retirees
- **Persons of Interest**: vendors, interns, volunteers, visiting scholars, camp attendees, residents, fellows — across UNT, HSC, and Dallas campuses
- **Overrides**: case-by-case accounts with no standard data source

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
