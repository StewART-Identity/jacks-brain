---
title: "Authentication Methods Migration: Industry Validation"
summary: "Executive brief validating that UNT System's post-migration MFA behavior is industry-normal, with one open business continuity risk: no Duo fail-open mechanism."
type: source
role: argument
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - mfa
  - entra-id
  - adfs
  - duo
  - authentication
  - unt-system
  - microsoft
  - conditional-access
confidence: high
views:
  - date: 2026-04-25
    note: "Initial cataloging."
---

Authored by [[collection/entities/jack-stewart|Jack Stewart]], IAM Engineer, for University Leadership. Prepared February 14, 2026. [Download original](/api/originals/2026-04-26-Authentication-Methods-Migration-Summary.docx)

On January 28, 2026, [[collection/entities/unt-system-iam|UNT System IAM]] executed a coordinated migration: de-federation from ADFS, enablement of Password Hash Sync, migration to Microsoft's new Authentication Methods framework, and configuration of [[collection/entities/cisco-duo|Cisco Duo]] as an External Authentication Method (EAM). This migration was required by Microsoft's September 30, 2025 deprecation of legacy MFA and SSPR policies. This document presents industry validation that the post-migration behavior is expected, and identifies one open business continuity risk.

## Key Findings

### Daily Duo Prompts Are by Design

[[collection/entities/microsoft-entra-id|Microsoft Entra ID]]'s [[collection/concepts/conditional-access|Conditional Access]] policy requires [[collection/concepts/multi-factor-authentication|MFA]] for all cloud apps. Prompt frequency is controlled by Duo's "remembered device" cookie duration. Under ADFS, this was typically 30 days; the current setting is shorter. This is adjustable in the Duo Admin Panel.

### Authenticator App Appears Despite Being Disabled

Microsoft Teams and other M365 mobile apps embed an Authenticator SDK that creates a device-level authentication broker. This broker exists only on the device — it does not appear on the user object in Entra ID and cannot be seen, audited, or removed by administrators. Multiple organizations using Duo EAM report identical behavior (Cisco Community, Microsoft Q&A).

### Admin Lockouts Are Common Post-Migration

Multiple organizations report Global Administrators being locked out of their tenants after migration. Microsoft Q&A documents cases requiring direct Microsoft support intervention to restore access.

### Orphaned Registrations Are Undocumented

Deleting an authentication method configuration does not clean up registrations on user objects. Neither Microsoft nor Cisco document this behavior. UNT System discovered and remediated this across 72,274 users — no other organization has publicly documented this cleanup.

### "Microsoft Managed" Defaults Cause Confusion

Multiple settings default to "Microsoft managed," which silently enables Authenticator enrollment. Administrators across the industry report hours spent troubleshooting this. One Microsoft Q&A thread has hundreds of responses from affected admins.

## Business Continuity Risk: No Fail-Open Capability

Under the previous ADFS configuration, a "fail open" setting allowed users to authenticate without MFA during a Duo outage. The new [[collection/entities/microsoft-entra-id|Entra ID]] architecture has no equivalent mechanism. If [[collection/entities/cisco-duo|Cisco Duo]] is unreachable and no alternative MFA method is enabled, all internal users are locked out of Microsoft 365 services — including Outlook, Teams, and SharePoint — for the duration of the outage.

Entra ID's [[collection/concepts/conditional-access|Conditional Access]] engine does not support "skip MFA" logic. Microsoft does not support authentication method priority or ordered fallback.

**Recommendation:** Enable SMS and Voice Call as supplemental MFA methods for internal users. These function independently of Duo and provide automatic fallback during a service disruption without requiring manual administrative intervention.

Tradeoff: users will see SMS and Voice as equal options alongside Duo (no way to set Duo as preferred). Some users may select SMS for convenience. However, SMS and Voice remain legitimate MFA, and ensuring access during an outage outweighs this UX compromise.

## Timeline

| Date | Event |
|------|-------|
| March 2023 | Microsoft announces deprecation of legacy MFA and SSPR policies |
| August 2025 | IAM Engineer flags migration requirement; concern dismissed — reflecting a common industry confusion between the Authentication Methods migration (all users) and mandatory admin MFA enforcement (admins only) |
| September 30, 2025 | Deprecation deadline passes; UNT System enters unsupported state with no immediate disruption due to Microsoft's gradual enforcement |
| January 28, 2026 | Migration executed: ADFS de-federation, Password Hash Sync, Authentication Methods, Duo EAM in a single coordinated change window |
| January–February 2026 | Post-migration: orphaned registration cleanup (72,274 users), Conditional Access policy tuning, reauthentication frequency investigation |

## What UNT System Did Differently

- **Early warning**: IAM Engineer flagged the migration requirement in August 2025, before the September deadline.
- **Undocumented issue discovery**: Identified the Authenticator broker fallback and orphaned registration problems not documented by Microsoft, Cisco, or any third party.
- **Custom remediation tooling**: PowerShell scripts scanned and cleaned 72,274 user objects — no other organization has publicly documented this cleanup.
- **Complex multi-system migration**: ADFS de-federation + Password Hash Sync + Authentication Methods + Duo EAM in a single coordinated change window.

## Relationship to Broader IAM Context

This migration touches the same infrastructure documented in [[collection/synthesis/unt-iam-identity-infrastructure|UNT IAM Identity Infrastructure]]. The shift from ADFS federation to Password Hash Sync with Entra ID changes how [[collection/concepts/saml|SAML]]-adjacent authentication flows operate at UNT, moving credential validation from an on-premises IdP to Microsoft's cloud platform. The 72,274-user orphaned registration cleanup parallels the scale of ALMA's account lifecycle operations documented in [[collection/sources/2026-04-25-alma-v2-technical-reference|ALMA v2 Technical Reference]].

See [[collection/synthesis/unt-mfa-migration-entra-id|UNT MFA Migration — Entra ID Analysis]] for a cross-cutting synthesis of the migration's implications.
