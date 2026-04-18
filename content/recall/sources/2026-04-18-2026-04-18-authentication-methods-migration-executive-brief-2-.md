---
title: "Executive Brief: Authentication Methods Migration — Industry Validation"
type: source
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - iam
  - unt-system
  - entra-id
  - mfa
  - industry-validation
  - executive-communication
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Authentication-Methods-Migration-Executive-Brief--2-.docx)

An executive brief authored by [[recall/entities/jack-stewart]] for University Leadership at [[recall/entities/unt-system]], dated February 14, 2026. It serves two purposes: (1) external validation that the challenges UNT System encountered during the Microsoft Authentication Methods migration are consistent with industry-wide experience, and (2) documentation of areas where UNT exceeded typical organizational practice.

## Background

In March 2023, Microsoft announced deprecation of legacy MFA and SSPR policies, requiring all organizations to migrate to the unified Authentication Methods policy by September 30, 2025. [[recall/entities/unt-system]] completed its migration on January 28, 2026 — four months after the deadline — simultaneously de-federating from ADFS, enabling Password Hash Sync, and configuring [[recall/entities/cisco-duo]] as an [[recall/concepts/external-authentication-method]].

## Industry Finding 1: Authenticator Fallback Behavior Is Widely Reported

Multiple organizations using Duo as an EAM report Microsoft Authenticator continuing to appear as an MFA option despite being disabled in the Authentication Methods policy — identical symptoms to those at UNT.

**Root cause (documented):** Microsoft's M365 mobile apps (Teams, Outlook) embed the Authenticator SDK as a device-level authentication broker. This broker creates authentication capabilities that exist outside the scope of the Authentication Methods policy. These capabilities do not appear as registered methods on the user object in Entra ID, making them invisible to administrators and uncontrollable through standard policy mechanisms.

Supporting sources cited: Cisco Community forums (January 2026), Microsoft Q&A, JanBakker.tech (Authenticator app registration auto-enables all auth methods).

## Industry Finding 2: Admin Lockouts After Migration Are Common

Organizations migrating from legacy MFA to the new Authentication Methods framework report admin lockouts as a recurring issue. In multiple documented cases, Global Administrators were unable to access tenants after migration because the only MFA method presented was Microsoft Authenticator, even when alternatives were configured. Resolution required contacting Microsoft support.

## Industry Finding 3: "Microsoft Managed" Settings Cause Widespread Confusion

Microsoft's "Microsoft managed" default for settings including the Registration Campaign and [[recall/concepts/system-preferred-mfa]] has caused widespread industry confusion. Administrators report spending hours troubleshooting why users are being forced to set up Microsoft Authenticator when the organization uses a third-party MFA provider. The root cause is that these defaults silently enable Authenticator enrollment prompts without explicit admin action. See [[recall/concepts/microsoft-managed-defaults]].

One documented case: an administrator spent 7 hours troubleshooting with no published list of which "Microsoft managed" controls affect Authenticator enrollment.

## Industry Finding 4: Orphaned Authentication Registrations Are Undocumented

UNT System discovered that deleting an EAM configuration does not clean up corresponding registrations on individual user objects — requiring custom scanning and remediation across all 72,000+ user objects. After extensive research across Microsoft's official documentation, Cisco Duo's EAM documentation, Microsoft Q&A, community forums, and consultant blogs, **no guidance exists anywhere in the industry** regarding the need to audit or clean up authentication method registrations before, during, or after migration. See [[recall/concepts/orphaned-authentication-registrations]].

This represents a significant documentation gap from both Microsoft and Cisco.

## Industry Finding 5: Increased MFA Prompt Frequency Is an Expected Side Effect

Under the previous ADFS-federated configuration, Duo's "remembered device" cookie provided extended sessions (typically 30 days). After migrating to managed authentication with Entra ID, session lifetime is governed by the intersection of Entra's token policies, Conditional Access session controls, and Duo's remembered device duration. Without explicit configuration, users experience more frequent MFA prompts. This is by design and is configurable. See [[recall/concepts/mfa-sign-in-frequency]].

## What UNT System Did Differently

The brief documents five areas where UNT exceeded typical industry practice:

1. **Early identification of risk** — In August 2025 (more than a month before the September 30 deadline), [[recall/entities/jack-stewart]] flagged the need to begin migration. The concern was initially dismissed by colleagues who believed it only affected `portal.azure.com` users — reflecting common industry confusion between the *Authentication Methods policy migration* (all users) and the *mandatory MFA enforcement for admin portals* (admin-only, Phase 1, October 2024 rollout).

2. **No disruption despite passing the deadline** — Operated past the September 30, 2025 deadline until January 28, 2026 without incident. Microsoft's gradual enforcement approach removed the ability to manage legacy policies but did not break existing configurations. However, this placed UNT in an unsupported state where legacy policy issues could not be resolved through deprecated interfaces.

3. **Proactive orphaned registration cleanup** — Developed custom PowerShell scripts to scan all 72,274 user objects, identify orphaned registrations, and remediate them. No other organization has publicly documented performing this cleanup.

4. **Simultaneous multi-system migration** — ADFS de-federation, Password Hash Sync enablement, Authentication Methods migration, and Duo EAM configuration were executed in a single coordinated change window — significantly more complex than phased migrations recommended by Microsoft and most consultancies.

5. **Discovery of undocumented behavior** — The identification of the device-level Authenticator broker fallback and the orphaned registration issue represent findings not documented by Microsoft, Cisco, or any third-party source.

## Business Continuity Risk: Duo Service Dependency

The migration to EAM introduced a significant architectural change to fail behavior. Under ADFS+Duo, the Duo MFA adapter ran as an on-premises plugin with an explicit **Fail Mode** setting: administrators could choose fail-open (allow access without MFA if Duo is unreachable) or fail-closed (block access). This gave the university direct control over availability during a Duo service disruption.

**With EAM, this control no longer exists.** If Duo is unreachable, Entra ID receives no MFA claim. The Conditional Access policy (`Logon-InternalUsers-CA`) requires MFA for all cloud app access, and there is no fail-open mechanism in Microsoft's Conditional Access engine. If no alternative MFA method is available, access is denied. See [[recall/concepts/mfa-fail-open-fail-closed]].

**Impact:** If Cisco Duo experiences a service outage and no fallback MFA method is enabled for internal users, the entire university user population could be unable to access Microsoft 365 services (Outlook, Teams, SharePoint, OneDrive) for the duration of the outage.

**Recommended mitigation:** Enable SMS and Voice Call as supplemental MFA methods for the internal user population (`ECS-DUO-Users`). These are already configured for the `Entra-Admin-Roles` group and function independently of the Duo service, providing an automatic fallback path during a Duo outage.

**Tradeoff noted:** Entra ID does not support authentication method priority or ordered fallback. Enabling SMS and Voice alongside Duo means users see all three as equal choices — some users may select SMS for convenience. The brief argues the business continuity benefit outweighs this user experience compromise.

## Conclusion

The brief concludes that the observed authentication behavior (daily MFA prompts, occasional Authenticator fallback on mobile) is consistent with industry-wide post-migration experience and is adjustable. UNT System's implementation was "not only successful but identified and resolved issues that remain undocumented in the broader industry."

## Related Pages

- [[recall/entities/jack-stewart]]
- [[recall/entities/unt-system]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/microsoft-managed-defaults]]
- [[recall/concepts/mfa-sign-in-frequency]]
- [[recall/concepts/mfa-fail-open-fail-closed]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
