---
title: "Duo"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - mfa
  - authentication
  - identity-management
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
  - "[[sources/2026-04-16-2026-04-16-remediation]]"
confidence: high
---

# Duo

Duo is the university's multi-factor authentication (MFA) platform. It is one of the systems where [[entities/alma|ALMA]] performs account [[concepts/account-deactivation-process|deactivation]] actions.

## Deactivation Actions

When ALMA deactivates a user in Duo:

- User is **deleted** from the Duo account
- User is removed from the `DuoUsers` group
- User is removed from the `ECS-DUO-Users` group

Note that Duo deactivation is a **deletion**, not a disable — the user record is removed entirely, unlike [[entities/idtree|IDTREE]] and [[entities/active-directory|AD]] where attributes are set.

## Infrastructure

The [[sources/2026-04-16-2026-04-16-remediation|December 2025 vulnerability report]] lists 6 Duo production application servers (`duo-idpr-app01` through `duo-idpr-app06.untsystem.edu`) and 1 dev server (`duo-iddv-app01`). These are Red Hat Linux hosts that appear in the kernel, python3, bind, sssd, and library upgrade remediations.

## Related

- [[entities/alma|ALMA]]
- [[entities/active-directory|Active Directory]]
- [[entities/idtree|IDTREE]]
- [[entities/rapid7|Rapid7]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/vulnerability-management|Vulnerability Management]]
