---
title: "Authentication Methods Policy"
summary: "Microsoft's unified policy framework for managing MFA and SSPR methods in Entra ID — replacement for legacy policies deprecated September 2025."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - mfa
  - sspr
  - policy
  - entra-id
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Microsoft's Authentication Methods Policy is the unified administrative interface for managing which authentication and self-service password reset (SSPR) methods are available to users in [[collection/entities/microsoft-entra-id]]. It replaced two legacy per-feature policy surfaces — the legacy MFA policy and the SSPR policy — which Microsoft deprecated on **September 30, 2025**.

## Migration Requirement

Organizations using the legacy policies were required to migrate before the deprecation deadline. Failure to migrate left tenants in an unsupported state. [[collection/entities/unt-system]] completed this migration on January 28, 2026 (see [[collection/sources/2026-04-25-authentication-methods-migration-summary]]).

## Key Behaviors and Gotchas

### "Microsoft Managed" Defaults

Many settings default to "Microsoft managed," which can silently enable Authenticator enrollment without explicit administrator action. Administrators industry-wide report hours of troubleshooting to identify why Authenticator was appearing when they believed it was disabled.

### Orphaned Registrations

Deleting an authentication method configuration does not clean up existing registrations on user objects. This behavior is undocumented by Microsoft. [[collection/entities/unt-system]] discovered it and remediated 72,274 user objects using custom PowerShell tooling — the only organization known to have publicly documented this cleanup. This pattern is compared against similar orphaned-state problems in [[collection/synthesis/orphaned-state-in-iam-migrations]].

### Industry Confusion: Two Distinct Microsoft Mandates

The Authentication Methods Policy migration (affecting **all users**) was frequently confused with Microsoft's separate mandate for mandatory MFA for admin portals (**admins only**). This confusion caused organizations — including [[collection/entities/unt-system]] — to underestimate the migration's scope and urgency.

## Relationship to Other Concepts

- [[collection/concepts/conditional-access]] enforces which methods are required at sign-in
- [[collection/concepts/external-authentication-method]] allows third-party providers like [[collection/entities/cisco-duo]] to satisfy MFA requirements
- [[collection/concepts/password-hash-sync]] is a prerequisite for migrating away from [[collection/entities/adfs]] federation
