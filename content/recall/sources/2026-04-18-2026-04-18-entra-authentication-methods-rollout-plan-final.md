---
title: "Entra Authentication Methods Rollout Plan (MFA Reauthentication Frequency & System-Preferred MFA)"
type: source
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - entra-id
  - conditional-access
  - unt-system
  - cisco-duo
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Entra_Authentication_Methods-Rollout-Plan-FINAL.docx)

**Prepared by:** [[recall/entities/jack-stewart]] | Architect/Engineer, [[recall/entities/unt-system]] Identity and Access Management
**Date:** March 10, 2026
**Scope:** Part 0 (Pre-Production Testing) · Part 1 (Enterprise) · Part 2 (Departmental)

## Overview

A structured three-part rollout plan for two [[recall/entities/microsoft-entra-id]] configuration changes at [[recall/entities/unt-system]]:

1. Disabling [[recall/concepts/system-preferred-mfa]] to prevent Entra ID from overriding [[recall/entities/cisco-duo]] as the external authentication method (EAM)
2. Configuring [[recall/concepts/mfa-sign-in-frequency]] to reduce daily MFA prompts (target: once per 7 days)
3. Restoring MFA enforcement for [[recall/entities/citrix-horizon]] access via a new [[recall/concepts/conditional-access-policy]]

The plan was triggered by gaps in testing coverage discovered after the January 28, 2026 ADFS → Entra ID migration that caused unplanned user impact.

## Part 0 — Pre-Production Testing

All changes must be validated in the `myunttest.onmicrosoft.com` non-production tenant before any production changes. P2 licensing was being procured at time of writing.

**Test environment requirements:**
- [[recall/entities/cisco-duo]] configured as an [[recall/concepts/external-authentication-method]] against a Duo sandbox
- [[recall/concepts/conditional-access-policy|Conditional Access policies]] replicating `Logon-InternalUsers-CA`, `Logon-EntraAdminRoles-CA`, and the new `Logon-CitrixHorizon-CA`
- Enterprise app registration for [[recall/entities/citrix-horizon]]
- Authentication strength definition matching the production Entra Admin MFA custom strength

**Test personas:** Internal user (Duo EAM), Student (Duo only), Student (no groups/no MFA), Cloud-native admin (Authenticator), Federated admin (Duo EAM + Authenticator — tests EAM/auth strength conflict)

**Key test cases:** System-Preferred MFA override, [[recall/concepts/mfa-sign-in-frequency|sign-in frequency + remembered devices]], risk-based policy with Duo EAM, `Logon-CitrixHorizon-CA` in report-only, EAM population expansion, auth strength for admins, app-specific session controls.

**Go/No-Go:** All test cases must pass before production deployment.

## Part 1 — System-Preferred MFA, Sign-In Frequency, and Duo Remembered Devices

**Objective:** Reduce daily MFA prompts to once per 7 days for internal users; prevent Entra ID from overriding [[recall/entities/cisco-duo]] with Microsoft Authenticator.

| Step | Change | Detail |
|------|--------|--------|
| 1 | Disable [[recall/concepts/system-preferred-mfa]] | Set State to "Disabled." Target: DuoUsers group. |
| 2 | Configure Duo Remembered Devices | Enable in Duo Admin Panel for browser-based apps. Set to 7 days. |
| 3 | Set CA [[recall/concepts/mfa-sign-in-frequency\|Sign-In Frequency]] | On `Logon-InternalUsers-CA`, enable sign-in frequency → 7 days. |
| 4 | Rename and Modify Risk Policy | Rename to `Logon-InternalUsers-HighRisk-CA`. Narrow to DuoUsers. Replace `RequireDuoMfa` with built-in Require MFA. |
| 5 | Update Entra Admin MFA Strength | Remove Password + SMS/Voice. Add Password + Authenticator (Push). |

**Rollout sequence:** Step 1 → Step 2 (Duo) → Step 3 (Entra CA) → Steps 4–5 after 1–3 confirmed.

**Key risk:** Users on mobile (Teams/Outlook) may bypass Duo via Authenticator broker. No config-level fix from Microsoft; documented in executive brief.

**Rollback:** All five steps independently reversible.

## Part 2 — Citrix Horizon MFA and DuoUsers Group Sync

**Objective:** Restore MFA enforcement for [[recall/entities/citrix-horizon]] for all Duo-enrolled users (~90,000).

| Step | Change | Detail |
|------|--------|--------|
| 1 | Sync DuoUsers Group | Added to Entra Connect sync scope (~90,000 members, refreshed every 12h). **DONE.** |
| 2 | Create `Logon-CitrixHorizon-CA` | New [[recall/concepts/conditional-access-policy]]. Users: DuoUsers. Target: Citrix Horizon. Grant: Require MFA. Report-only first. |
| 3 | Add DuoUsers to Cisco Duo EAM | Add DuoUsers alongside existing `ECS-DUO-Users` in Authentication Methods → Cisco Duo → Include. |

**Critical sequencing:** Step 3 must precede Step 2 enforcement. If CA enforces before Duo EAM is available, users fall through to Authenticator or are blocked.

## Known Considerations

- **Unenrolled students** not in Duo are intentionally not covered by Citrix CA policy.
- **Duo EAM + custom auth strengths** are incompatible — Microsoft platform limitation. Resolution: provision cloud-native admin accounts (`euid@myunt.onmicrosoft.com`).
- **Federated admin accounts** may conflict with EAM routing — provision cloud-native accounts.
- **App-specific sessions** (e.g., Infoblox 2-hr timeout) must be excluded from broader session controls.

## Recommendation

Provision dedicated cloud-native admin accounts with minimum roles and PIM eligible assignments. Migrate users currently holding admin roles on federated accounts.

## Sign-Off

Approved by [[recall/entities/jack-stewart]] (Architect/Engineer, IAM), Parker Bush (Manager, IAM), and Ryan Kane (Director, Enterprise Collaboration Services).
