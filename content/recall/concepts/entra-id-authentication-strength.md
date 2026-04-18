---
title: "Entra ID Authentication Strength"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - entra-id
  - security
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

A [[recall/entities/microsoft-entra-id]] feature that defines named combinations of acceptable MFA methods, used as a grant control within [[recall/concepts/conditional-access-policy|Conditional Access policies]]. Instead of requiring only "multifactor authentication," a policy can require a specific named strength — guaranteeing that only the designated method combinations satisfy the policy.

## How It Works

An authentication strength definition specifies which method combinations are acceptable (e.g., Password + Authenticator Push, Password + FIDO2 key). When a CA policy requires a named strength, Entra ID evaluates the MFA claim presented at sign-in against the definition and allows or blocks accordingly.

Strengths can be built-in (Microsoft-defined) or custom (admin-defined).

## UNT System: Entra Admin MFA Custom Strength

The **Entra Admin MFA** custom strength governs MFA requirements for admin role holders via `Logon-EntraAdminRoles-CA`. Per the rollout plan (Step 5, Part 1):

| Before | After |
|--------|-------|
| Password + SMS/Voice included | SMS/Voice removed |
| — | Password + Authenticator (Push) required |

This change removes weaker phone-based methods and enforces push notification approval for admin sign-ins.

## Critical Limitation: Incompatibility with EAM

Custom authentication strengths are **incompatible with [[recall/concepts/external-authentication-method|External Authentication Methods (EAM)]]**. This is a documented Microsoft platform limitation.

When Cisco Duo handles the MFA challenge as an EAM, it returns a generic "MFA satisfied" claim to Entra ID. Custom auth strengths require Entra ID to verify the specific method used — which it cannot do for an EAM, because the Duo challenge happens outside the Entra authentication stack. As a result:

- A CA policy requiring the "Entra Admin MFA" custom strength cannot be satisfied by Duo EAM
- Admins who are both in the DuoUsers EAM scope and hold admin roles face an authentication conflict

## Resolution: Cloud-Native Admin Accounts

The recommended fix is to provision [[recall/concepts/cloud-native-admin-accounts]] — accounts created directly in `myunt.onmicrosoft.com` (not federated from on-premises AD). These accounts can have Microsoft Authenticator registered natively, satisfying the auth strength requirement without touching the EAM routing.

See [[recall/concepts/cloud-native-admin-accounts]] for the full architectural pattern.

## Related Concepts

- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/cloud-native-admin-accounts]]
- [[recall/concepts/privileged-identity-management]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
