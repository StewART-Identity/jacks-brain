---
title: "Entra ID"
summary: "Microsoft's cloud identity platform (formerly Azure AD) providing authentication, SSO, conditional access, and hybrid identity for Microsoft 365 and beyond."
type: concept
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
tags:
  - entra-id
  - azure-ad
  - microsoft
  - cloud-identity
  - sso
  - conditional-access
  - entra-connect
  - azure-ad-connect
  - tenant
  - saml
  - oidc
  - hybrid-identity
sources:
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
confidence: high
---

Entra ID (formerly Azure Active Directory, or Azure AD) is Microsoft's cloud-native identity platform. While [[collection/concepts/active-directory]] is the on-premise directory, Entra ID is the cloud-resident identity system that underpins Microsoft 365, Azure, and thousands of third-party SaaS applications.

## Core Capabilities

- **Authentication**: Supports modern protocols (OIDC, OAuth 2.0) and legacy federation via [[collection/concepts/saml]] and WS-Federation.
- **Single Sign-On**: Acts as an identity provider for thousands of pre-integrated SaaS applications.
- **Conditional Access**: Policy engine that gates authentication on device state, location, user risk score, and other signals.
- **Hybrid Identity**: Via **Microsoft Entra Connect** (formerly Azure AD Connect), on-premise [[collection/concepts/active-directory]] objects are synchronized to Entra ID, creating a hybrid identity model.
- **B2B / B2C**: Federation and guest access across organizational boundaries.

## Naming History

| Period | Name |
|--------|------|
| 2010–2023 | Azure Active Directory (Azure AD) |
| 2023–present | Microsoft Entra ID |

## In This Wiki

[[collection/entities/jack-stewart]] has led multiple Entra ID implementations:

- At [[collection/entities/university-of-michigan]] (2017–2019, 2022): Led two consecutive Azure AD rollouts; performed a swing upgrade of Azure AD Connect v2; authored detailed cross-team run-books for a tenant-to-tenant migration.
- At [[collection/entities/university-of-north-texas]] (2024–present): Continues Entra ID engineering and architecture work.

The tenant-to-tenant migration at Michigan is a particularly complex operation — moving all users, groups, applications, and conditional access policies from one Entra ID tenant to another without disrupting production workloads. Jack's cross-team run-books for this migration are evidence of both the technical complexity and the need for meticulous coordination.

See [[collection/concepts/identity-and-access-management]] for the broader IAM context, and [[collection/synthesis/iam-career-in-higher-education]] for how cloud identity fits into Jack's career arc.
