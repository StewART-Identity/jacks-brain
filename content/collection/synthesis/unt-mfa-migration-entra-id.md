---
title: "UNT MFA Migration — Entra ID Analysis"
summary: "Cross-cutting analysis of UNT System's ADFS-to-Entra-ID migration: industry validation, novel discoveries, and the fail-open business continuity gap."
type: synthesis
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - unt-system
  - entra-id
  - adfs
  - mfa
  - duo
  - conditional-access
  - synthesis
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

The [[collection/sources/2026-04-25-authentication-methods-migration-summary|Authentication Methods Migration industry validation brief]] documents UNT System's January 28, 2026 migration from ADFS to [[collection/entities/microsoft-entra-id|Microsoft Entra ID]], and positions the migration's post-migration behavior against documented industry experience. This page draws out the cross-cutting implications for [[collection/entities/unt-system-iam|UNT System IAM]]'s identity infrastructure and the patterns it reveals.

## What Changed Architecturally

The migration replaced ADFS — an on-premises federation server that proxied authentication between [[collection/entities/active-directory|Active Directory]] and Microsoft cloud services — with direct Password Hash Sync to Entra ID. The MFA layer, [[collection/entities/cisco-duo|Cisco Duo]], was simultaneously reconfigured as an External Authentication Method (EAM) under Entra ID's [[collection/concepts/conditional-access|Conditional Access]] framework.

Before migration:
```
User → ADFS (on-premises IdP) → AD credential validation → Duo MFA (configurable fail-open) → M365 access
```

After migration:
```
User → Entra ID (cloud IdP) → Password Hash Sync credential check → Duo EAM via Conditional Access → M365 access
```

The shift eliminates the on-premises ADFS dependency but removes the fail-open capability that ADFS provided.

## What the Industry Experience Shows

The brief's findings are consistent with a pattern visible across the Microsoft customer community: the Authentication Methods migration introduced multiple undocumented or poorly documented behaviors that caught administrators off-guard industry-wide.

| Behavior | Industry Experience | UNT Experience |
|----------|---------------------|----------------|
| Frequent Duo prompts | Common; caused by shorter remembered-device cookie duration | Identical |
| Authenticator app appearing despite being disabled | Reported widely on Cisco Community and Microsoft Q&A | Identical |
| Admin lockouts post-migration | Multiple organizations; some requiring Microsoft support intervention | Consistent with industry |
| Orphaned registrations after deleting method configuration | **Not documented by Microsoft or Cisco** | UNT discovered and remediated at scale |
| "Microsoft managed" defaults silently enabling Authenticator | Hundreds of affected admins documented on Microsoft Q&A | Consistent with industry |

The orphaned registration discovery is the standout. No other organization has publicly documented identifying this problem, let alone executing a remediation across 72,274 user objects. This represents novel operational knowledge that sits outside the official documentation of either Microsoft or Cisco.

## The Fail-Open Gap: An Architectural Regression

The migration introduced a business continuity regression with no straightforward mitigation within the platform.

Under ADFS, a fail-open configuration allowed authentication to proceed without [[collection/concepts/multi-factor-authentication|MFA]] if Duo was unreachable. This provided resilience against MFA provider outages. [[collection/entities/microsoft-entra-id|Entra ID]]'s [[collection/concepts/conditional-access|Conditional Access]] engine has no equivalent capability — if the MFA requirement cannot be satisfied, authentication is denied, period.

The recommended mitigation (enable SMS and Voice Call as supplemental methods) is a workaround, not a solution: it ensures users have an alternative MFA path during a Duo outage, but at the cost of offering weaker methods as equal options at all times. The underlying constraint — Entra ID cannot prioritize MFA methods or enforce ordered fallback — is a platform limitation, not a configuration gap.

This is a meaningful architectural tradeoff that the brief correctly presents to University Leadership as an open risk. The choice between:
1. **No fallback** (current state): full lockout during a Duo outage, but Duo is always the only option when Duo is available
2. **SMS/Voice fallback** (recommended): no lockout during a Duo outage, but users can always choose SMS over Duo

...cannot be resolved within the Entra ID platform. The organization must choose its risk tolerance.

## The Early Warning Pattern

The brief documents a recurring failure mode in Microsoft compliance migrations: **scope confusion between related-but-distinct mandates**. In August 2025, the IAM Engineer's early warning was dismissed because colleagues believed the Authentication Methods migration only affected Azure portal administrators — conflating it with a separate Microsoft mandate (mandatory MFA for admin portals).

This is consistent with how Microsoft's deprecation communications were received industry-wide. The Authentication Methods migration (affecting all users) and the admin portal MFA mandate (affecting only administrators) were two distinct requirements on overlapping timelines, and the distinction was frequently collapsed in informal team discussions.

The pattern: a compliance deadline arrives, the enforcement is gradual, and the false sense of safety during the "no immediate disruption" period (September 30 to January 28) obscures the actual unsupported state. UNT System operated in an unsupported configuration for approximately four months before completing the migration.

## Connection to ALMA and Account Lifecycle

The 72,274-user orphaned registration cleanup runs at the same scale as ALMA's lifecycle management scope (also ~72,000 UNT System accounts). Both represent custom operational tooling built because neither Microsoft, Cisco, nor any documented third-party provided the necessary remediation capability.

The broader pattern — [[collection/entities/unt-system-iam|UNT System IAM]] building PowerShell or Python tooling to fill gaps in vendor-documented behavior — appears in [[collection/synthesis/unt-iam-deprovisioning-gap|UNT IAM Deprovisioning Gap]] (deprovisioning scripts that vendors don't provide), [[collection/entities/alma|ALMA]] (lifecycle orchestration absent from IDM tooling), and now the orphaned registration cleanup. The wiki's cumulative picture is of a small IAM team operating complex multi-vendor infrastructure where operational gaps are the norm, not the exception.

See [[collection/synthesis/unt-iam-identity-infrastructure|UNT IAM Identity Infrastructure]] for how this migration fits into the broader topology.
