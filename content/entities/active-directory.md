---
title: "Active Directory (AD)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - directory
  - microsoft
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Active Directory (AD)

[[entities/unt|UNT]] operates multiple Active Directory domains used for Windows authentication and resource access. During [[concepts/account-deactivation|account deactivation]], [[entities/alma|ALMA]] disables accounts across all three domains.

## Domains

| Domain | Audience |
|---|---|
| HSC | Health Science Center |
| STUDENTS | Student accounts |
| UNT | Main university domain |

## Deactivation Actions

When ALMA deactivates an account in AD, it:

- Sets `userAccountControl` bit 2 (the disabled flag)
- Sets `description` to `"Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

## Global Catalog

The AD Global Catalog (GC) is accessible via ALMA's `/api/ad/upn/{username}` endpoint, which retrieves UPN and email addresses from on-premise AD. A parallel endpoint (`/api/entra/upn/{username}`) covers Entra ID (Azure AD / Microsoft 365).

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
