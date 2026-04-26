---
title: "Microsoft Entra ID"
summary: "Microsoft's cloud identity platform (formerly Azure AD); hosts Conditional Access, Authentication Methods, and MFA integrations including Duo EAM."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - entra-id
  - azure-ad
  - identity
  - iam
  - cloud
  - authentication
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
confidence: high
---

Microsoft Entra ID (formerly Azure Active Directory) is Microsoft's cloud-based identity platform. It serves as the Authorization Server and policy enforcement point for Microsoft 365 services — including Teams, Outlook, and SharePoint — and integrates with enterprise [[collection/concepts/multi-factor-authentication|MFA]] providers through the Authentication Methods framework.

## Authentication Methods Framework

The Authentication Methods framework is Entra ID's unified configuration layer for how users verify their identity. Microsoft deprecated its legacy MFA and SSPR (Self-Service Password Reset) policy interfaces on September 30, 2025, requiring all organizations to migrate to this new framework. Key behaviors:

- Settings not explicitly configured default to "Microsoft managed," which can silently enable features such as Microsoft Authenticator enrollment.
- Deleting an authentication method configuration does **not** clean up registrations already on user objects — orphaned registrations persist until explicitly removed.
- Administrators across the industry have reported hours of troubleshooting related to undocumented default behaviors.

## External Authentication Method (EAM)

Entra ID supports integrating third-party MFA providers as External Authentication Methods. [[collection/entities/cisco-duo|Cisco Duo]] is configured as an EAM at [[collection/entities/unt-system-iam|UNT System IAM]], meaning Entra ID delegates the MFA challenge step to Duo. The user authenticates to Entra ID with their password, and Duo fulfills the second factor requirement.

## Conditional Access

[[collection/concepts/conditional-access|Conditional Access]] is Entra ID's policy engine. It evaluates conditions (user identity, device state, location, application) and enforces controls (require MFA, block access, require compliant device). At UNT System, Conditional Access requires MFA for all cloud apps — including M365 services. There is no "skip MFA" or fail-open override available within Conditional Access.

## No Fail-Open Mechanism

This is the most significant architectural constraint introduced by the ADFS-to-Entra-ID migration at UNT System. Under ADFS, a "fail open" setting allowed authentication to proceed without MFA during a Duo outage. Entra ID has no equivalent: if a Duo EAM is the only configured MFA method and Duo is unreachable, all users are locked out of M365 services for the duration of the outage. Microsoft does not support authentication method priority or ordered fallback between methods.

## Authenticator SDK Broker

Microsoft Teams and other M365 mobile apps embed a Microsoft Authenticator SDK that creates a device-level authentication broker. This broker exists only on the device and does not create a record on the user object in Entra ID — it cannot be seen, audited, or removed by administrators. Organizations using Duo EAM report that users see Authenticator prompts on mobile despite Authenticator not being a configured authentication method in their tenant.

## Password Hash Sync

Password Hash Sync (PHS) is the mechanism used after ADFS de-federation. Rather than relying on an on-premises ADFS server to federate authentication, PHS synchronizes a hash of the AD password hash to Entra ID, allowing cloud authentication to occur without dependency on on-premises infrastructure. [[collection/entities/unt-system-iam|UNT System IAM]] enabled PHS as part of the January 28, 2026 migration.

## Relationship to Active Directory

Entra ID is the cloud counterpart to on-premises [[collection/entities/active-directory|Active Directory]]. Before the migration, [[collection/entities/unt-system-iam|UNT System]] used ADFS (Active Directory Federation Services) as a federation layer between on-premises AD and Microsoft cloud services. Post-migration, Entra ID authenticates directly using synchronized password hashes, eliminating the dependency on on-premises ADFS infrastructure.

See [[collection/synthesis/unt-mfa-migration-entra-id|UNT MFA Migration — Entra ID Analysis]] for the full migration context and industry validation findings.
