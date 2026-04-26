---
title: "Microsoft Entra ID"
summary: "Microsoft's cloud identity platform (formerly Azure AD) — UNT System's directory and authentication backbone post-migration from legacy MyUNT external auth."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - entra-id
  - microsoft
  - azure-ad
  - cloud-identity
  - unt-system
  - authentication-methods
sources:
  - "[[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]"
confidence: high
---

Microsoft Entra ID (formerly Azure Active Directory) is the cloud identity and access management platform underpinning the [[collection/entities/unt-system]] authentication infrastructure. After migrating from the legacy MyUNT external authentication system to native Microsoft authentication, Entra ID manages [[collection/concepts/authentication-methods]] including Duo MFA integration.

## Relevance to UNT System

UNT System migrated from a legacy external authentication method ("MyUNT") to native Microsoft authentication. The migration left some users with stale authentication method records that block Duo enrollment — cleared via [[collection/entities/dstools]].

Changes to a user's authentication methods take effect immediately with no sync delay.
