---
title: "Entra ID (Microsoft 365)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - microsoft
  - cloud
  - identity-management
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Entra ID (Microsoft 365)

Entra ID (formerly Azure Active Directory) is Microsoft's cloud identity platform, used by the university as part of its Microsoft 365 deployment. It is accessible through the [[entities/alma|ALMA]] API for identity lookups alongside the on-premise [[entities/active-directory|Active Directory]] Global Catalog.

## Role in ALMA

ALMA exposes a dedicated endpoint for querying Entra ID:

- `GET /api/entra/upn/{username}` — retrieves UPN and email addresses from Entra ID

This is used alongside the on-prem AD GC endpoint (`GET /api/ad/upn/{username}`) for cross-system identity lookups.

## Related

- [[entities/alma|ALMA]]
- [[entities/active-directory|Active Directory]]
- [[entities/idtree|IDTREE]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
