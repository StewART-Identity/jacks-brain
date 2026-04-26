---
title: "Conditional Access"
summary: "Microsoft Entra ID's policy engine that evaluates user/device/location conditions to enforce controls like MFA — with no fail-open override."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - conditional-access
  - microsoft
  - entra-id
  - mfa
  - policy
  - iam
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Conditional Access is [[collection/entities/microsoft-entra-id|Microsoft Entra ID]]'s policy enforcement engine. It evaluates signals at authentication time and applies access controls before granting access to cloud resources. It is the mechanism through which [[collection/concepts/multi-factor-authentication|MFA]] is enforced for Microsoft 365 services at [[collection/entities/unt-system-iam|UNT System IAM]] and across the Microsoft 365 ecosystem generally.

## How It Works

A Conditional Access policy is an if-then rule: **if** a set of conditions is true, **then** enforce a set of access controls.

**Conditions (signals evaluated):**
- User identity and group membership
- Application being accessed
- Device compliance status and platform
- Network location (IP range, named location)
- Sign-in risk level (via Entra ID Identity Protection)

**Controls (what happens when conditions match):**
- Require [[collection/concepts/multi-factor-authentication|MFA]]
- Require compliant device
- Block access entirely
- Require terms of use acceptance
- Limit session duration

## MFA Enforcement at UNT

At [[collection/entities/unt-system-iam|UNT System IAM]], the Conditional Access policy requires MFA for all cloud applications. When a user signs in to any Microsoft 365 service, Conditional Access intercepts the authentication and requires MFA satisfaction before access is granted. [[collection/entities/cisco-duo|Cisco Duo]] fulfills this requirement as an External Authentication Method (EAM) configured in [[collection/entities/microsoft-entra-id|Entra ID]].

## No Fail-Open Capability

Conditional Access does not support a "fail open" or "skip MFA" exception for scenarios where the MFA provider is unreachable. This is a fundamental constraint of the platform:
- Microsoft does not support authentication method priority.
- Microsoft does not support ordered fallback between MFA methods.
- If Duo is unreachable and no other MFA method is enabled for the user, the Conditional Access MFA requirement cannot be satisfied and access is denied.

This contrasts with ADFS, which supported a fail-open configuration allowing authentication to proceed without MFA during a provider outage. The absence of this capability in Entra ID is the primary business continuity risk identified in [[collection/sources/2026-04-25-authentication-methods-migration-summary|the migration industry validation brief]].

The recommended mitigation — enabling SMS and Voice Call as supplemental MFA methods — works because Conditional Access only requires that MFA be satisfied via *some* configured method. Having SMS/Voice registered means users can satisfy the MFA requirement even if Duo is unreachable. But Conditional Access cannot enforce that Duo is preferred over SMS.

## Relationship to Authentication Flow

Conditional Access operates above the credential validation layer. The authentication sequence for an M365 service at UNT:

1. User submits credentials → Entra ID validates against the synchronized password hash (Password Hash Sync from [[collection/entities/active-directory|Active Directory]])
2. Conditional Access evaluates policies → determines MFA is required
3. Entra ID redirects to the Duo EAM → user completes the Duo challenge
4. Duo signals success → Conditional Access grants the access token

A failure at step 3 (Duo unreachable) terminates the flow at step 4 — there is no bypass path in the Conditional Access engine itself.

See [[collection/concepts/multi-factor-authentication|multi-factor authentication]] and [[collection/entities/microsoft-entra-id|Microsoft Entra ID]] for broader context.
