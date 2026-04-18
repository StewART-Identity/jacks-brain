---
title: "Cisco Duo"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - tool
  - mfa
  - authentication
  - identity
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

A multi-factor authentication (MFA) platform integrated into [[recall/entities/unt-system]]'s identity stack as a [[recall/concepts/external-authentication-method]] (EAM) within [[recall/entities/microsoft-entra-id]].

## Integration at UNT System

- Configured as an **External Authentication Method (EAM)** in Entra ID, meaning Duo handles the MFA challenge instead of Microsoft Authenticator.
- Two user groups are in scope: `ECS-DUO-Users` (internal users) and `DuoUsers` (~90,000 Duo-enrolled users synced from on-premises AD).
- **Remembered Devices** feature: configured for 7 days on browser-based apps to reduce daily re-prompts (see [[recall/concepts/mfa-sign-in-frequency]]).

## Known Limitations

- **Incompatible with custom authentication strengths** in Entra ID — a Microsoft platform limitation. Administrators using custom auth strengths must use cloud-native accounts to avoid EAM routing conflicts.
- **Mobile broker bypass**: On mobile apps (Teams, Outlook), users may authenticate via the Microsoft Authenticator broker, bypassing Duo. No config-level fix is available from Microsoft.
- **Federated admin accounts** may conflict with EAM routing; mitigation is to provision cloud-native admin accounts.

## Related Concepts

- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/conditional-access-policy]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
