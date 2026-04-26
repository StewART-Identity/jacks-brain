---
title: "External Authentication Method (EAM)"
summary: "Entra ID's integration pattern that delegates the MFA challenge to a third-party provider like Cisco Duo via Conditional Access redirection."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - entra-id
  - mfa
  - integration
  - duo
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

External Authentication Method (EAM) is a [[collection/entities/microsoft-entra-id]] integration pattern that allows a third-party MFA provider to satisfy the MFA step in a [[collection/concepts/conditional-access]] policy. When EAM is configured, Entra ID redirects the authentication challenge to the external provider, which returns a pass/fail signal.

## At UNT System

[[collection/entities/unt-system]] configured [[collection/entities/cisco-duo]] as an EAM as part of its January 28, 2026 [[collection/concepts/authentication-methods-policy]] migration. Duo handles all MFA challenges for Microsoft 365 sign-ins. See [[collection/sources/2026-04-25-authentication-methods-migration-summary]].

## Known Behavior: Authenticator Device Broker

Microsoft Teams and other M365 mobile apps embed an Authenticator SDK that creates a device-level authentication broker. This broker:

- Exists only on the device — it does not create a record on the user object in [[collection/entities/microsoft-entra-id]]
- Cannot be seen, audited, or removed by administrators
- Causes Authenticator to appear as an authentication option even when disabled in [[collection/concepts/authentication-methods-policy]]

Other organizations using Duo EAM report identical behavior, documented on Cisco Community and Microsoft Q&A forums.

## Outage Risk

EAM introduces a single point of failure on the external provider's availability. If the provider is unreachable and no native fallback method is enabled, [[collection/concepts/conditional-access]] has no mechanism to skip MFA — all users are locked out. See [[collection/concepts/conditional-access]] for the recommended SMS/Voice fallback mitigation.
