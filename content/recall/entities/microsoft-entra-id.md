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
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]]"
confidence: high
---

Microsoft's cloud identity and access management platform (formerly Azure Active Directory). [[recall/entities/unt-system]] migrated to Entra ID managed authentication from ADFS on January 28, 2026.

## Key Features Used at UNT System

- **[[recall/concepts/conditional-access-policy|Conditional Access]]** — Policy engine controlling authentication requirements based on user, device, app, and risk signals. UNT policies include `Logon-InternalUsers-CA`, `Logon-EntraAdminRoles-CA`, and `Logon-CitrixHorizon-CA`.
- **[[recall/concepts/external-authentication-method]]** — Allows third-party MFA providers (e.g., [[recall/entities/cisco-duo]]) to handle the MFA challenge instead of Microsoft Authenticator.
- **[[recall/concepts/system-preferred-mfa]]** — A setting that, when enabled, allows Entra ID to choose the MFA method it "prefers." At UNT, this was set to "Disabled" to prevent Entra from overriding Duo.
- **[[recall/concepts/entra-id-authentication-strength|Authentication Strengths]]** — Custom definitions of acceptable MFA method combinations. The "Entra Admin MFA" custom strength was updated to require Password + Authenticator (Push), removing SMS/Voice. Note: custom strengths are incompatible with EAM — resolved via [[recall/concepts/cloud-native-admin-accounts]].
- **[[recall/concepts/entra-connect|Entra Connect]]** — Syncs on-premises AD groups to Entra ID (e.g., DuoUsers, ~90,000 members; 12h refresh cycle). See [[recall/concepts/entra-connect]] for the architectural dependency this creates between the provisioning and authentication layers.
- **[[recall/concepts/privileged-identity-management|PIM (Privileged Identity Management)]]** — P2 feature for just-in-time privileged access. Recommended for cloud-native admin accounts with eligible role assignments; planned for full rollout at UNT.

## Tenant Environment Model

[[recall/entities/unt-system]] operates (or plans to operate) three persistent Entra ID tenants per the [[recall/concepts/entra-id-three-tenant-model]]:

| Tenant | Domain | Role |
|--------|--------|------|
| Production | myunt.onmicrosoft.com | Live identity services for 72,000+ users |
| Staging | myunttest.onmicrosoft.com | Pre-production validation; mirrors production config |
| Greenfield | myuntsrc.onmicrosoft.com | Microsoft out-of-box defaults; read-only reference |

All three require Entra ID P2 to test the full feature surface (Conditional Access, PIM, Identity Protection, access reviews).

## Programmatic Management via Graph API

In addition to portal-based configuration, Entra ID is managed programmatically by [[recall/entities/iam-modules]]'s `GraphAPIClient`. The `ENTRA_*` credentials (`tenant_id`, `client_id`, `client_secret`) in the `.env` file authorize scripts to perform group membership management and attribute synchronization via the Microsoft Graph API. This means some Entra ID state is managed through the portal (authentication policies, Conditional Access) and some through provisioning scripts — a coordination surface not formally documented in either layer's sources.

## Related Entities

- [[recall/entities/cisco-duo]]
- [[recall/entities/unt-system]]
- [[recall/entities/citrix-horizon]]
- [[recall/entities/iam-modules]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
- [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]
- [[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]] — executive brief framing cost, risk, and four-year scope for the three-tenant model
- [[recall/sources/2026-04-18-2026-04-18-contract]]
