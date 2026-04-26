---
title: "Password Hash Sync"
summary: "Entra Connect feature that syncs on-premises AD credential hashes to Entra ID, enabling cloud authentication without a federation server."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - entra-id
  - adfs
  - sync
  - authentication
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Password Hash Sync (PHS) is a feature of Microsoft Entra Connect (formerly Azure AD Connect) that replicates a hash of on-premises Active Directory password hashes to [[collection/entities/microsoft-entra-id]]. This allows users to authenticate directly to Entra ID using their on-premises credentials without requiring a live connection to an on-premises federation server.

## Role in ADFS De-Federation

Enabling Password Hash Sync is a prerequisite for de-federating from [[collection/entities/adfs]]. With PHS active, [[collection/entities/microsoft-entra-id]] can validate credentials independently, making the federation server redundant. [[collection/entities/unt-system]] enabled PHS as part of its January 28, 2026 migration — see [[collection/sources/2026-04-25-authentication-methods-migration-summary]].

## Relationship to Other Concepts

- Replaces the on-premises authentication path previously handled by [[collection/entities/adfs]]
- Works alongside [[collection/concepts/conditional-access]] for policy enforcement at sign-in
- Supports [[collection/concepts/authentication-methods-policy]] by ensuring user credentials are available for cloud-based authentication flows
