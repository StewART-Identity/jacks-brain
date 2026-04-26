---
title: "Authentication Methods Migration: Industry Validation"
summary: "Executive summary validating UNT System's Jan 2026 Microsoft Auth Methods migration as consistent with industry-wide experience."
type: source
role: analysis
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - microsoft
  - entra-id
  - mfa
  - duo
  - adfs
  - migration
  - unt-system
sources: []
confidence: high
views:
  - date: 2026-04-25
    note: "Initial cataloging."
---

Executive summary prepared by Jack Stewart, IAM Engineer, for University Leadership on February 14, 2026. Validates that [[collection/entities/unt-system]]'s January 28, 2026 migration to Microsoft's Authentication Methods framework produced behavior consistent with industry-wide experience, and identifies one open business continuity risk.

[Download original](/api/originals/2026-04-25-Authentication-Methods-Migration-Summary.docx)

## Context

On January 28, 2026, [[collection/entities/unt-system]] completed a multi-system migration in a single change window:

- De-federated from [[collection/entities/adfs]]
- Enabled [[collection/concepts/password-hash-sync]]
- Migrated to Microsoft's new [[collection/concepts/authentication-methods-policy]]
- Configured [[collection/entities/cisco-duo]] as an [[collection/concepts/external-authentication-method]]

The migration was required by Microsoft's September 30, 2025 deprecation of legacy MFA and SSPR policies.

## Key Findings

### Frequent Duo Prompts Are by Design

[[collection/concepts/conditional-access]] requires MFA for all cloud apps. Under [[collection/entities/adfs]], the Duo "remembered device" cookie lasted ~30 days. The post-migration setting is shorter — adjustable in the Duo Admin Panel.

### Authenticator Appears Despite Being Disabled

Microsoft Teams and other M365 mobile apps embed an Authenticator SDK that creates a device-level authentication broker. This broker:

- Exists only on the device — not on the user object in [[collection/entities/microsoft-entra-id]]
- Cannot be seen, audited, or removed by administrators
- Is reported identically by other organizations using [[collection/concepts/external-authentication-method]]

### Admin Lockouts Post-Migration Are Common

Multiple organizations report Global Administrators locked out of tenants after migration, requiring direct Microsoft support intervention.

### Orphaned Registrations Are Undocumented

Deleting an [[collection/concepts/authentication-methods-policy]] configuration does not clean up registrations on user objects. Neither Microsoft nor Cisco documents this. [[collection/entities/unt-system]] discovered and remediated this across **72,274 users** — no other organization has publicly documented doing so. This orphaned-state pattern also appears in IDM driver migrations; see [[collection/synthesis/orphaned-state-in-iam-migrations]].

### "Microsoft Managed" Defaults Cause Confusion

Multiple [[collection/concepts/authentication-methods-policy]] settings default to "Microsoft managed," silently enabling Authenticator enrollment. Administrators industry-wide report hours of troubleshooting as a result.

## Open Risk: No Fail-Open Capability

Under [[collection/entities/adfs]], a "fail open" setting allowed authentication without MFA during a Duo outage. [[collection/entities/microsoft-entra-id]]'s [[collection/concepts/conditional-access]] engine has no equivalent. If [[collection/entities/cisco-duo]] is unreachable and no alternative MFA method is enabled, all internal users are locked out of M365 services for the duration of the outage.

**Recommendation**: Enable SMS and Voice Call as supplemental MFA methods. These function independently of Duo and provide automatic fallback without manual administrative intervention. Tradeoff: users see SMS and Voice as equal options alongside Duo — no way to set Duo as preferred.

## Timeline

| Date | Event |
|------|-------|
| March 2023 | Microsoft announces deprecation of legacy MFA and SSPR policies |
| August 2025 | IAM Engineer flags migration need; dismissed by colleagues who confused Auth Methods migration (all users) with mandatory MFA for admin portals (admins only) |
| September 30, 2025 | Deprecation deadline passes; UNT System enters unsupported state with no immediate disruption due to gradual enforcement |
| January 28, 2026 | Migration executed: ADFS de-federation, Password Hash Sync, Auth Methods migration, Duo EAM |
| January–February 2026 | Post-migration: orphaned registration cleanup (72,274 users), Authenticator broker discovery, CA policy tuning |

## What UNT System Did Differently

- **Early identification**: IAM Engineer raised the alarm in August 2025, before the September deadline
- **Discovered undocumented issues**: Authenticator broker fallback and orphaned registrations — not documented by Microsoft, Cisco, or any third party
- **Custom remediation tooling**: PowerShell scripts to scan and remediate 72,274 user objects
- **Complex single-window execution**: ADFS de-federation + Password Hash Sync + Auth Methods + Duo EAM in one coordinated change window
