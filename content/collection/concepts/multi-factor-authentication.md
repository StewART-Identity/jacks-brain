---
title: "Multi-Factor Authentication (MFA)"
summary: "Authentication requiring two or more verification factors; central to enterprise identity security and a key dependency in Microsoft 365 and Duo integrations."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - mfa
  - authentication
  - security
  - identity
  - iam
  - duo
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Multi-factor authentication (MFA) requires a user to verify their identity using two or more independent factors before granting access. The standard categories are: something you know (password), something you have (device, hardware token), and something you are (biometric).

## MFA Methods in Enterprise Contexts

| Method | Examples | Strength |
|--------|----------|----------|
| Push notification | Microsoft Authenticator, Cisco Duo push | High; requires device possession |
| TOTP app | Authenticator apps (time-based one-time codes) | High; works offline |
| Hardware token | YubiKey, FIDO2 key | Very high; phishing-resistant |
| SMS / Voice call | Code sent to registered phone number | Moderate; vulnerable to SIM swap but legitimate second factor |
| Authentication broker | Device-level SDK (e.g., Microsoft Authenticator SDK embedded in Teams) | Varies; can appear even when not explicitly configured |

## MFA in Microsoft 365 / Entra ID

[[collection/entities/microsoft-entra-id|Microsoft Entra ID]] enforces MFA through [[collection/concepts/conditional-access|Conditional Access]] policies. When Conditional Access requires MFA for an app, the user must satisfy the MFA requirement using a method registered in Entra ID's Authentication Methods framework. External providers like [[collection/entities/cisco-duo|Cisco Duo]] integrate as External Authentication Methods (EAM).

## Session Persistence ("Remembered Device")

MFA platforms typically cache successful verification using a browser cookie or device trust record, avoiding re-prompting the user on every authentication. The cookie duration is configurable:
- Under ADFS with Duo, UNT System used a 30-day remembered-device duration.
- Post-migration to Entra ID with Duo EAM, the effective session duration is shorter, causing more frequent Duo prompts. This is adjustable in the Duo Admin Panel.

## Fail-Open vs. Fail-Closed

A critical architectural decision in MFA deployments is behavior during an MFA provider outage:

- **Fail-open**: Authentication proceeds without MFA if the MFA provider is unreachable. Prioritizes availability.
- **Fail-closed**: Authentication is blocked if MFA cannot be completed. Prioritizes security.

ADFS supported a fail-open configuration for Duo. [[collection/entities/microsoft-entra-id|Microsoft Entra ID]] does not — Conditional Access has no "skip MFA" logic, meaning a Duo outage with no fallback method results in a complete lockout of M365 services. See [[collection/synthesis/unt-mfa-migration-entra-id|UNT MFA Migration]] for the business continuity implications.

## Fallback Methods

To mitigate the fail-closed risk in Entra ID, enabling supplemental MFA methods (e.g., SMS, Voice Call) ensures users have an alternative path if the primary method (Duo) is unavailable. Entra ID does not support method priority — all enabled methods appear as equal options to the user. The tradeoff: users may select weaker methods (SMS) for convenience even when the primary method is available.

## Relationship to Authentication Infrastructure

MFA operates as a layer above the credential store. For [[collection/entities/unt-system-iam|UNT System IAM]], [[collection/entities/active-directory|Active Directory]] stores credentials, [[collection/entities/microsoft-entra-id|Entra ID]] enforces MFA policy through Conditional Access, and [[collection/entities/cisco-duo|Cisco Duo]] fulfills the MFA challenge as an External Authentication Method. The account lifecycle managed by [[collection/concepts/account-lifecycle-management|account lifecycle management]] is the enforcement layer beneath all authentication flows — a disabled AD account bypasses MFA by failing at credential validation before MFA is even attempted.
