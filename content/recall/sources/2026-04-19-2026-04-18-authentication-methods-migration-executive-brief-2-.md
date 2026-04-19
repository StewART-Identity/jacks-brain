---
title: "Executive Brief: Authentication Methods Migration — Industry Validation (re-read 2026-04-19)"
type: source
created: 2026-04-19
updated: 2026-04-19
tags:
  - identity
  - iam
  - unt-system
  - entra-id
  - mfa
  - industry-validation
  - executive-communication
  - business-continuity
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Authentication-Methods-Migration-Executive-Brief--2-.docx)

An executive brief authored by [[recall/entities/jack-stewart]] for University Leadership at [[recall/entities/unt-system]], dated February 14, 2026. It provides external validation that challenges encountered during the Microsoft Authentication Methods migration are consistent with industry-wide experience, and documents areas where UNT exceeded typical organizational practice.

> The original ingest (2026-04-18) is at [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]. This entry records a second read on 2026-04-19, alongside the re-read of the [[recall/sources/2026-04-19-2026-04-18-auth-methods-migration-case-study-1-|case study]].

## Document Purpose and Audience

Unlike the [[recall/sources/2026-04-19-2026-04-18-auth-methods-migration-case-study-1-|case study]] (technical/executive audience, retrospective argument for testing infrastructure), this brief is addressed specifically to University Leadership and serves a different purpose: reassurance + strategic risk disclosure. It argues simultaneously that (1) UNT's problems were not unique failures and (2) UNT's response was exceptional.

## The Two Microsoft Mandates Conflation

A key insight on re-read: the brief explicitly identifies a widespread industry confusion between two distinct Microsoft requirements with different scopes and timelines:

| Mandate | Scope | Timeline |
|---------|-------|----------|
| Authentication Methods policy migration | **All users, all MFA/SSPR methods** | Deadline: September 30, 2025 |
| Mandatory MFA enforcement for admin portals (Phase 1) | Admin portal access only (`portal.azure.com`) | Rolling from October 2024 |

This distinction explains why [[recall/entities/jack-stewart]]'s August 2025 warning was dismissed — colleagues assumed the approaching deadline only affected administrators. The same confusion is documented across industry sources as a systemic pattern, not a UNT-specific failure. See [[recall/concepts/entra-id-authentication-strength]] for related admin-scoped authentication issues.

## Industry Validation of the Five Findings

### Finding 1: Authenticator Broker Fallback (Mobile)

Microsoft's M365 apps (Teams, Outlook) embed the Authenticator SDK as a device-level authentication broker. This broker creates authentication capabilities outside the scope of the Authentication Methods policy — invisible to administrators, not appearing on user objects in Entra ID, uncontrollable through standard policy mechanisms. Multiple organizations report identical symptoms. No configuration fix exists.

### Finding 2: Admin Lockouts Are Common Post-Migration

Multiple documented cases of Global Administrators locked out of their tenants after migration — required Microsoft support intervention. The brief validates that UNT's careful execution avoided a common failure mode.

### Finding 3: "Microsoft Managed" Defaults Cause Widespread Confusion

See [[recall/concepts/microsoft-managed-defaults]]. The Registration Campaign and [[recall/concepts/system-preferred-mfa]] defaulting to "Microsoft managed" silently enables Authenticator enrollment prompts. One administrator spent 7 hours troubleshooting with no published list of which settings are affected. Hundreds of forum responses document the same confusion.

### Finding 4: Orphaned Registrations — No Industry Guidance Exists

See [[recall/concepts/orphaned-authentication-registrations]]. After comprehensive research across Microsoft documentation, Cisco Duo EAM documentation, Microsoft Q&A, community forums, and consultant blogs — **no guidance exists anywhere in the industry** on auditing or cleaning up authentication method registrations on user objects before, during, or after migration. UNT's discovery is genuinely novel. No other organization has publicly documented performing this cleanup.

### Finding 5: Increased MFA Prompt Frequency Is Expected

See [[recall/concepts/mfa-sign-in-frequency]]. Under ADFS+Duo, the Duo remembered-device cookie governed session duration (typically 30 days). Under EAM, session lifetime is the intersection of Entra token policies, Conditional Access session controls, and Duo's remembered device duration — producing more frequent prompts without explicit configuration. This is by design and configurable.

## Where UNT Exceeded Industry Practice

Five specific differentiators documented in the brief:

1. **Early warning** — Jack flagged the migration need in August 2025, a month before the September 30 deadline. Warning was dismissed due to mandate conflation described above.
2. **No disruption despite deadline miss** — Operated in an unsupported state October 2025–January 2026 without incident. The brief is explicit: this was due to Microsoft's gradual enforcement approach, "not a guarantee." An unsupported state means legacy policy issues could not be resolved through deprecated interfaces.
3. **Proactive orphaned registration cleanup** — Custom PowerShell scan and remediation across all 72,274 user objects. No other organization has documented this.
4. **Simultaneous multi-system migration** — ADFS de-federation, Password Hash Sync, Authentication Methods migration, and Duo EAM in a single change window. More complex than phased migrations recommended by Microsoft and consultancies.
5. **Discovery of undocumented behavior** — The device-level Authenticator broker fallback and orphaned registration behavior are not documented by Microsoft, Cisco, or any third-party source.

## Business Continuity Risk: EAM Fail-Mode Removal

The most significant new issue this document surfaces relative to the case study: the loss of fail-mode control when migrating from ADFS+Duo to EAM. See [[recall/concepts/mfa-fail-open-fail-closed]] for the full architectural analysis.

**ADFS+Duo:** Explicit Fail Mode setting — administrators choose fail-open (allow without MFA if Duo unreachable) or fail-closed (block).

**EAM:** No equivalent control. If Duo is unreachable:
1. Entra ID redirects to Duo via OpenID Connect
2. Redirect fails
3. No MFA claim reaches Entra ID
4. `Logon-InternalUsers-CA` denies access — no override mechanism exists

**Impact:** A Duo service outage could lock all ~72,000 UNT users out of Microsoft 365 (Outlook, Teams, SharePoint, OneDrive) for the outage duration.

**Recommended mitigation:** Enable SMS and Voice Call for `ECS-DUO-Users` as automatic fallback. These methods are already configured for `Entra-Admin-Roles` and operate independently of Duo.

**Key tradeoff:** [[recall/entities/microsoft-entra-id]] does not support authentication method priority or ordered fallback — users would see SMS, Voice, and Duo as equal choices at every login.

## Connections to Today's Re-Reads

Read alongside the [[recall/sources/2026-04-19-2026-04-18-auth-methods-migration-case-study-1-|case study re-read]], a clear division of labor emerges:

- The **case study** makes the internal argument: here is what happened, here is what testing would have caught, here is the infrastructure we need.
- The **executive brief** makes the external argument: here is evidence the industry shares these challenges, and here is where UNT exceeded what any other organization has done.

Together they form a complete executive communication package: the case study establishes accountability and forward investment case; the executive brief provides external validation and strategic risk disclosure.

## Related Pages

- [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]
- [[recall/sources/2026-04-19-2026-04-18-auth-methods-migration-case-study-1-]]
- [[recall/entities/jack-stewart]]
- [[recall/entities/unt-system]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/concepts/mfa-fail-open-fail-closed]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/microsoft-managed-defaults]]
- [[recall/concepts/mfa-sign-in-frequency]]
- [[recall/concepts/entra-id-authentication-strength]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
