---
title: "PeopleSoft (EIS)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - hr-system
  - student-information-system
  - database
  - identity-management
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# PeopleSoft (EIS)

PeopleSoft, referred to internally as EIS, is the university's HR and student information system. It provides the [[concepts/authoritative-data-sources|authoritative data sources]] for employee and student affiliation checks during [[entities/alma|ALMA]]'s [[concepts/account-deactivation-process|account deactivation process]].

## Databases

PeopleSoft exposes two databases relevant to identity lifecycle:

### HRPD (HR Database)
Employee and retiree data.

| Data Object | Description |
|-------------|-------------|
| PS_GBHR_IAM_EXCL_V | Active employees, including emeritus/a faculty |
| PS_GBHR_… | Retirees |

### LSPD (LS / Student Database)
Student, alumni, and special-case data.

| Data Object | Description |
|-------------|-------------|
| PS_GBSA_AC_APPL | Applicants |
| PS_GBSA_AC_STUDENT | Enrolled students |
| PS_GBSA_AC_STU_LOA | Students on leave of absence |
| PS_GBSA_AC_PYMT | Students paying off debts |
| PS_GBSA_AC_OPT | Exception cases (e.g., visa extensions) |
| PS_GBSA_AC_GRAD | Alumni |
| PS_GBSA_AC_DECEASE | Deceased persons |

## Grace Period

PeopleSoft views include users who have a **current** affiliation **or** who lost their affiliation within the past **18 months**. This grace period prevents premature deactivation of recently departed students or employees.

## Identifier

All views are queried with `OPRID = euid`.

## API Endpoints (via ALMA)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/eis/employees/{id} | Active employee check |
| GET | /api/users/eis/retirees/{id} | Retiree check |
| GET | /api/users/eis/students/enrolled/{id} | Enrolled student |
| GET | /api/users/eis/students/applicants/{id} | Applicant |
| GET | /api/users/eis/students/loa/{id} | Leave of absence |
| GET | /api/users/eis/students/payment/{id} | Payment record |
| GET | /api/users/eis/students/optional-indicators/{id} | Optional indicators |
| GET | /api/users/eis/students/special/{id} | Special category |
| GET | /api/users/eis/alumni/{id} | Alumni |
| GET | /api/users/eis/deceased/{id} | Deceased |

## Related

- [[entities/alma|ALMA]]
- [[entities/idtree|IDTREE]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
