---
title: "Microsoft Entra ID"
summary: "Microsoft's cloud IAM platform (formerly Azure AD) — the authority for user objects, auth methods, and Conditional Access policy in M365 environments."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - identity
  - cloud
  - entra
  - azure-ad
confidence: high
---

Microsoft Entra ID (formerly Azure Active Directory / Azure AD) is Microsoft's cloud-based identity and access management platform. It is the central authority for user objects, authentication method registrations, and [[collection/concepts/conditional-access]] policy enforcement in Microsoft 365 environments.

## Key Capabilities

- Manages user objects and authentication method registrations via [[collection/concepts/authentication-methods-policy]]
- Enforces [[collection/concepts/conditional-access]] policies at sign-in time
- Supports [[collection/concepts/external-authentication-method]] (EAM) for third-party MFA providers like [[collection/entities/cisco-duo]]
- Enables [[collection/concepts/password-hash-sync]] from on-premises Active Directory, allowing de-federation from [[collection/entities/adfs]]

## Limitations Documented in the Wiki

- **No fail-open**: [[collection/concepts/conditional-access]] does not support "skip MFA" logic — if all MFA methods are unavailable, users are locked out
- **Orphaned registrations**: deleting an authentication method configuration does not remove registrations from user objects; [[collection/entities/unt-system]] discovered and remediated this across 72,274 users
- **Unauditable device brokers**: Authenticator SDK embedded by M365 mobile apps creates device-level authentication brokers that administrators cannot see, audit, or remove

## At UNT System

[[collection/entities/unt-system]] migrated to Entra ID as the primary identity authority on January 28, 2026 when it de-federated from [[collection/entities/adfs]]. See [[collection/sources/2026-04-25-authentication-methods-migration-summary]] for full migration details.
