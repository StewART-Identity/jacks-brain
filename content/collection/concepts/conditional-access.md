---
title: "Conditional Access"
summary: "Entra ID's policy engine that evaluates sign-in context and enforces access controls including MFA requirements at authentication time."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - entra-id
  - policy
  - mfa
  - access-control
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Conditional Access is [[collection/entities/microsoft-entra-id]]'s policy engine. At sign-in, it evaluates signals (user identity, device state, location, application, risk level) and applies configured policies — which can require MFA, block access, require compliant devices, or grant access.

## Role in Authentication Method Migrations

When [[collection/entities/unt-system]] migrated to [[collection/concepts/authentication-methods-policy]], its Conditional Access policy was configured to require MFA for all cloud apps. This drove the observed increase in [[collection/entities/cisco-duo]] prompt frequency post-migration, since the "remembered device" cookie duration changed when transitioning away from [[collection/entities/adfs]].

## Critical Limitation: No Fail-Open

Conditional Access does not support "skip MFA" logic. Microsoft does not support authentication method priority or ordered fallback. This means:

- If the configured MFA method (e.g., [[collection/entities/cisco-duo]] via [[collection/concepts/external-authentication-method]]) is unreachable
- And no alternative MFA method is enabled for the user
- All internal users are locked out of Microsoft 365 services for the duration of the outage

Under the previous [[collection/entities/adfs]] configuration, a "fail open" setting mitigated this risk. That capability does not exist in Entra ID's Conditional Access engine.

**Recommended mitigation**: Enable SMS and Voice Call as supplemental MFA methods. These function independently of Duo and serve as automatic fallback without requiring manual administrative intervention. Tradeoff: users see all methods as equal options — no way to set Duo as preferred.
