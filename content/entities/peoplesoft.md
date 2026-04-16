---
title: "PeopleSoft (EIS)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - erp
  - database
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# PeopleSoft (EIS)

PeopleSoft is [[entities/unt|UNT]]'s enterprise ERP system, referred to in IAM contexts as **EIS** (Enterprise Information Systems). It is the authoritative data source for student and employee affiliation records used during [[concepts/account-deactivation|account deactivation]] review.

## Databases

| Database | Contents |
|---|---|
| **LSPD** | Student records (enrollment, applications, LOA, payments, alumni, deceased) |
| **HRPD** | HR records (active employees including emeritus, retirees) |

## Grace Period

PeopleSoft views include users who have **lost their affiliation within the past 18 months**, matching the same window used for login inactivity. This prevents premature deactivation for recently-separated users.

## Data Objects Used by ALMA

| Affiliation | Database | View |
|---|---|---|
| Applicants | LSPD | PS_GBSA_AC_APPL |
| Enrolled | LSPD | PS_GBSA_AC_STUDENT |
| LOA/Hiatus | LSPD | PS_GBSA_AC_STU_LOA |
| Payments | LSPD | PS_GBSA_AC_PYMT |
| Exceptions | LSPD | PS_GBSA_AC_OPT |
| Alumni | LSPD | PS_GBSA_AC_GRAD |
| Deceased | LSPD | PS_GBSA_AC_DECEASE |
| Employees (incl. emeritus) | HRPD | PS_GBHR_IAM_EXCL_V |
| Retirees | HRPD | PS_GBHR_... |

All lookups match on `OPRID=euid`. [[entities/alma|ALMA]] also accepts EMPLID as an alternative identifier.

## API Access

Accessed via ALMA's `/api/users/eis/` base path.

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
