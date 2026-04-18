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
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]]"
  - "[[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]"
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
- **Undocumented deletion behavior**: Duo's documentation covers creating an EAM in detail but provides no guidance on what happens when one is deleted or what cleanup is required. This gap contributed to the [[recall/concepts/orphaned-authentication-registrations]] issue discovered in the January 2026 migration.

## Service Dependency and Business Continuity Risk

Under the ADFS+Duo architecture, the Duo adapter ran on-premises with a configurable **Fail Mode** (fail-open or fail-closed). This control does not exist under the EAM architecture — see [[recall/concepts/mfa-fail-open-fail-closed]].

If Duo experiences a service outage under EAM and no alternative MFA method is available, [[recall/entities/microsoft-entra-id]]'s Conditional Access engine denies access. The recommended mitigation at [[recall/entities/unt-system]] is enabling SMS and Voice Call as supplemental methods for the `ECS-DUO-Users` group, providing a fallback path that operates independently of Duo's cloud service.

Industry evidence: multiple organizations using Duo as an EAM report identical Authenticator fallback behavior, documented in Cisco Community forums and Microsoft Q&A as of January 2026.

## Related Concepts

- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/mfa-fail-open-fail-closed]]
- [[recall/concepts/orphaned-authentication-registrations]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
- [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]] — cited for lacking pre-migration audit guidance for user-level EAM registration cleanup
- [[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]] — cited as contributing to undocumented behaviors that required production troubleshooting in January 2026
- [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]] — industry validation of Authenticator fallback behavior; service dependency risk; fail-open/fail-closed analysis
