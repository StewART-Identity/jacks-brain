---
title: "DSTools"
summary: "UNT System IAM tooling layer: an admin web app for manual operations and a provisioning script repository for automated identity lifecycle management."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - dstools
  - unt-system
  - internal-tool
  - entra-id
  - authentication-methods
  - admin-tooling
  - provisioning
  - deprovisioning
  - automation
sources:
  - "[[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]"
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

DSTools serves two distinct roles in [[collection/entities/unt-system]]'s IAM infrastructure:

1. **Admin web application** — hosted at `unt-dstools.untsystem.edu`, providing purpose-built tooling for IAM operations that are awkward or unavailable in standard admin portals.
2. **Provisioning script repository** — a collection of Python (and formerly Perl) scripts that automate the identity lifecycle: account provisioning, attribute synchronization, and [[collection/concepts/deprovisioning|offboarding]].

## Web Application Features

- **Clear Authentication Methods** — removes the legacy MyUNT external [[collection/concepts/authentication-methods|authentication method]] from a user account in [[collection/entities/microsoft-entra-id]], unblocking Duo re-enrollment. Documented in [[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]].

## Web Application Access Model

Access is gated by security group membership (e.g., `DSTools-ClearMethods` for the clear-methods feature). Staff must sign in with UNT System credentials.

## Provisioning Scripts

The dstools provisioning scripts automate identity lifecycle operations across [[collection/entities/cisco-duo]], [[collection/entities/active-directory]], and [[collection/entities/idtree]]. As documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]], all deprovisioning automation in these scripts has been inactive since approximately 2022 due to an incomplete Perl-to-Python migration. Scripts were written but either had destructive operations commented out or were never added to crontab.

The dstools scripts are being migrated to the `iam-scripts-provisioning` repository under the `iam_modules` shared library (v3.0.0), which will close the [[collection/concepts/deprovisioning|deprovisioning gap]].
