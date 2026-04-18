---
title: "Microsoft Entra ID"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - tool
  - identity
  - authentication
  - microsoft
  - cloud
sources:
  - "[[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

# Microsoft Entra ID

Microsoft's cloud identity and access management platform (formerly Azure Active Directory). [[entities/unt-system]] migrated to Entra ID managed authentication from ADFS on January 28, 2026.

## Key Features Used at UNT System

- **[[concepts/conditional-access-policy|Conditional Access]]** — Policy engine controlling authentication requirements based on user, device, app, and risk signals. UNT policies include `Logon-InternalUsers-CA`, `Logon-EntraAdminRoles-CA`, and `Logon-CitrixHorizon-CA`.
- **[[concepts/external-authentication-method]]** — Allows third-party MFA providers (e.g., [[entities/cisco-duo]]) to handle the MFA challenge instead of Microsoft Authenticator.
- **[[concepts/system-preferred-mfa]]** — A setting that, when enabled, allows Entra ID to choose the MFA method it "prefers." At UNT, this was set to "Disabled" to prevent Entra from overriding Duo.
- **Authentication Strengths** — Custom definitions of acceptable MFA method combinations. The "Entra Admin MFA" custom strength was updated to require Password + Authenticator (Push), removing SMS/Voice.
- **Entra Connect** — Syncs on-premises AD groups to Entra ID (e.g., DuoUsers, ~90,000 members).
- **PIM (Privileged Identity Management)** — Recommended for cloud-native admin accounts with eligible role assignments.

## Test Tenant

`myunttest.onmicrosoft.com` — non-production Entra ID tenant used for pre-production validation. Requires P2 licensing.

## Related Entities

- [[entities/cisco-duo]]
- [[entities/unt-system]]
- [[entities/citrix-horizon]]

## Sources

- [[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
