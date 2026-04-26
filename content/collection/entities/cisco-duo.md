---
title: "Cisco Duo"
summary: "Cloud MFA used by UNT System; configured as Entra ID External Authentication Method post-Jan 2026 migration, with no fail-open fallback available."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - duo
  - mfa
  - cisco
  - iam
  - unt-system
  - entra-id
  - eam
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
  - "[[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis]]"
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Cisco Duo is the multi-factor authentication (MFA) platform used by [[collection/entities/unt-system-iam|UNT System IAM]]. During [[collection/entities/alma|ALMA]]'s inactivity deactivation workflow, ALMA deletes the user's Duo account via the Duo Admin API and removes them from two groups:

- `DuoUsers` in the UNT [[collection/entities/active-directory|Active Directory]] domain
- `ECS-DUO-Users` in the AD forest root

## Asymmetry with Reactivation

Duo is not automatically re-enrolled during reactivation. After a user's account is reactivated across [[collection/entities/edirectory-idtree|eDirectory]] and AD, the user must re-register with Duo manually. This is a deliberate design decision: Duo MFA enrollment is treated as a user-initiated action, not an automated one.

## Feature Flag

Duo operations in ALMA are gated behind the `DUO_ENABLED` feature flag, allowing Duo processing to be independently enabled or disabled from IDTREE and AD operations. Verification (`/verify/inactivity`) checks Duo account absence as one of five required confirmations before locking down AD sync.

## Deprovisioning Gap

A separate, permanent offboarding concern exists alongside the ALMA-managed inactivity lifecycle. Two scripts in `dstools` were written to delete Duo accounts for separated users but were never fully activated:

- `duo_offboard_users.py` — scheduled in the Duo crontab (daily, 5:40 AM), builds a list of terminated/retired/unaffiliated users, but the `admin_api.delete_user()` call on line 294 is commented out. A hardcoded skip (`cam0794`) indicates the script was frozen mid-testing.
- `duo_students_old_enrollment_no_affiliation.py` — targets disabled/terminated student accounts; not scheduled; `delete_user()` also commented out.

As a result, no Duo scripts currently perform any account deletion. Terminated, retired, and unaffiliated users retain active Duo accounts indefinitely, inflating the license count and expanding the authentication surface. This gap has persisted since approximately 2022. See [[collection/concepts/deprovisioning|deprovisioning]] and [[collection/synthesis/unt-iam-deprovisioning-gap|UNT IAM Deprovisioning Gap]] for context.

## External Authentication Method (EAM) Integration

As of January 28, 2026, [[collection/entities/unt-system-iam|UNT System IAM]] reconfigured Duo as an External Authentication Method (EAM) within [[collection/entities/microsoft-entra-id|Microsoft Entra ID]]. In this configuration, [[collection/concepts/conditional-access|Conditional Access]] policies require [[collection/concepts/multi-factor-authentication|MFA]] for all cloud apps, and Entra ID delegates the MFA challenge to Duo. This replaced the previous ADFS-based integration.

**Remembered device / reauthentication frequency**: Duo caches successful MFA challenges using a "remembered device" cookie. Under ADFS, this cookie duration was typically 30 days, limiting how often users were prompted. Post-migration, the effective duration is shorter, causing more frequent prompts. Adjustable in the Duo Admin Panel.

**Authenticator SDK broker**: Microsoft Teams and other M365 mobile apps embed an Authenticator SDK that creates a device-level authentication broker. This broker exists only on the device and does not appear on the Entra ID user object — it cannot be seen, audited, or removed by administrators. Organizations using Duo EAM report that users see Authenticator prompts on mobile despite Authenticator not being an explicitly configured tenant method.

## Fail-Open Gap

Under the previous ADFS configuration, a fail-open setting allowed users to authenticate without MFA during a Duo outage. [[collection/entities/microsoft-entra-id|Entra ID]]'s [[collection/concepts/conditional-access|Conditional Access]] engine has no equivalent: if Duo is unreachable and no alternative MFA method is configured, all users are locked out of M365 services for the duration of the outage. Entra ID does not support authentication method priority or ordered fallback. See [[collection/synthesis/unt-mfa-migration-entra-id|UNT MFA Migration — Entra ID Analysis]] for the full business continuity risk analysis.

## Relationship to Account Lifecycle

See [[collection/concepts/account-lifecycle-management|account lifecycle management]] for the full deactivation/reactivation flow that includes Duo.
