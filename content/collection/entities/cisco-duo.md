---
title: "Cisco Duo"
summary: "Multi-factor authentication platform used by UNT System; Duo account offboarding automation has been effectively disabled since ~2022."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - duo
  - mfa
  - authentication
  - offboarding
  - deprovisioning
  - unt-system
  - api
sources:
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Cisco Duo is [[collection/entities/unt-system]]'s multi-factor authentication platform, used for staff and student account verification. At UNT System, Duo is integrated with [[collection/entities/active-directory]] and [[collection/entities/microsoft-entra-id]] as the primary MFA layer. The [[collection/concepts/authentication-methods]] concept covers how Duo methods are registered in Entra ID.

## Offboarding Gap

As documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]], all Duo [[collection/concepts/deprovisioning]] automation in the dstools provisioning infrastructure is inactive:

- `duo_offboard_users.py` runs daily but has its `admin_api.delete_user()` call commented out — it builds a deletion list to `delete-disable-users-duo.json` but takes no action.
- `duo_students_old_enrollment_no_affiliation.py` targets disabled/terminated student accounts but is not scheduled in any crontab, and its `delete_user()` call is also commented out.

This means terminated, retired, and unaffiliated users retain active Duo accounts indefinitely, inflating license counts and expanding the authentication surface.

## Remediation Path

The `iam-scripts-alma-v2` deactivation/reactivation scripts in the `iam-scripts-provisioning` repository already integrate with Duo. Completing the migration and scheduling those scripts will restore automated Duo offboarding.
