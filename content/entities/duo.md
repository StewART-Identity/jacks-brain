---
title: "Duo (MFA)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - mfa
  - authentication
  - unt
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Duo (MFA)

Duo is [[entities/unt|UNT]]'s multi-factor authentication platform. During [[concepts/account-deactivation|account deactivation]], [[entities/alma|ALMA]] removes users from Duo entirely to revoke MFA access alongside directory account disablement.

## Deactivation Actions

When ALMA deactivates an account, Duo cleanup involves:

1. Delete the user from the Duo account
2. Remove from `DuoUsers` group
3. Remove from `ECS-DUO-Users` group

Removing from groups alone is insufficient — the user record itself is deleted.

## Sources

- [[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process|ALMA Deactivation Process (2026-04-16)]]
