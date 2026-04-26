---
title: "UNT System"
summary: "University of North Texas System — the multi-campus higher-education organization whose IAM infrastructure is the central subject of this wiki."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - unt-system
  - higher-education
  - organization
sources:
  - "[[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]"
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

The University of North Texas System (UNT System) is a multi-campus higher-education organization. The wiki's primary domain is the UNT System's identity and access management (IAM) infrastructure — including its [[collection/entities/microsoft-entra-id]] tenant, [[collection/concepts/authentication-methods|authentication method]] policies, provisioning automation, and related tooling.

## IAM Environment

- **Identity platform:** [[collection/entities/microsoft-entra-id]]
- **On-premises directory:** [[collection/entities/active-directory]]
- **Internal directory (roles/affiliations):** [[collection/entities/idtree]]
- **MFA provider:** [[collection/entities/cisco-duo]] (via native Microsoft authentication, post-migration from legacy MyUNT)
- **Admin tooling:** [[collection/entities/dstools]]
- **Staff MFA enrollment portal:** https://mfa.untsystem.edu

## Known Infrastructure Gaps

UNT System's IAM infrastructure carries two documented gaps from incomplete migration work — see [[collection/synthesis/unt-system-iam-infrastructure-gaps]] for a cross-cutting analysis:

1. **Stale authentication methods** — legacy MyUNT methods persist on some accounts, blocking Duo re-enrollment. Addressed manually via [[collection/entities/dstools]]; documented in [[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]].
2. **Inactive deprovisioning automation** — all [[collection/concepts/deprovisioning]] automation (Duo, AD, IDTREE) has been inactive since ~2022; documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]].
