---
title: "Cisco Duo"
summary: "Cloud MFA used by UNT System; accounts are deleted on inactivity deactivation and must be manually re-enrolled on reactivation."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - duo
  - mfa
  - cisco
  - iam
  - unt-system
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

Cisco Duo is the multi-factor authentication (MFA) platform used by [[collection/entities/unt-system-iam|UNT System IAM]]. During [[collection/entities/alma|ALMA]]'s inactivity deactivation workflow, ALMA deletes the user's Duo account via the Duo Admin API and removes them from two groups:

- `DuoUsers` in the UNT [[collection/entities/active-directory|Active Directory]] domain
- `ECS-DUO-Users` in the AD forest root

## Asymmetry with Reactivation

Duo is not automatically re-enrolled during reactivation. After a user's account is reactivated across [[collection/entities/edirectory-idtree|eDirectory]] and AD, the user must re-register with Duo manually. This is a deliberate design decision: Duo MFA enrollment is treated as a user-initiated action, not an automated one.

## Feature Flag

Duo operations in ALMA are gated behind the `DUO_ENABLED` feature flag, allowing Duo processing to be independently enabled or disabled from IDTREE and AD operations. Verification (`/verify/inactivity`) checks Duo account absence as one of five required confirmations before locking down AD sync.

## Relationship to Account Lifecycle

See [[collection/concepts/account-lifecycle-management|account lifecycle management]] for the full deactivation/reactivation flow that includes Duo.
