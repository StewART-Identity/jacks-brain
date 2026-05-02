---
title: "Active Directory"
summary: "Microsoft's on-premise directory platform combining LDAP, Kerberos, DNS, and Group Policy into the canonical enterprise identity store."
type: concept
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
tags:
  - active-directory
  - microsoft
  - ldap
  - kerberos
  - dns
  - group-policy
  - domain-controller
  - certificate-services
  - on-premise
  - pki
sources:
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
confidence: high
---

Active Directory (AD) is Microsoft's on-premise directory service, introduced with Windows 2000. It combines several protocols and services into a unified identity platform:

- **LDAP**: The directory access protocol for reading and writing identity data.
- **Kerberos**: The authentication protocol — AD issues Kerberos tickets for service access.
- **DNS**: Active Directory is tightly coupled with DNS; domain controller discovery and replication depend on DNS SRV records.
- **Group Policy**: The mechanism for distributing configuration to domain-joined machines and users.
- **Certificate Services (AD CS)**: Optional PKI component that issues certificates for machine/user auth, code signing, etc.

## Relationship to Cloud Identity

Active Directory is the on-premise predecessor to [[collection/concepts/entra-id]]. Hybrid deployments use **Microsoft Entra Connect** (formerly Azure AD Connect) to synchronize on-premise AD objects to the cloud. In most enterprise environments, both coexist; the question is which is authoritative for which attributes.

## Domain Scale and Administration

Large AD domains require careful design of the domain controller topology, site and services configuration, and administrative delegation model. [[collection/entities/jack-stewart]] served as lead Active Directory domain administrator for a ~1-million-object domain at [[collection/entities/university-of-michigan]], managing domain controller promotions and upgrades via Ansible and deploying controllers to the Azure cloud.

AD Certificate Services at scale typically use an **offline root CA** — powered down when not signing issuing CA certificates — paired with **online issuing CAs** that handle day-to-day certificate issuance. This architecture (which Jack implemented at Michigan) prevents root CA compromise while maintaining operational continuity.

## Provisioning into AD

Active Directory is a common target for identity provisioning systems. [[collection/entities/netiq-identity-manager]] drives AD object creation and attribute management via its Active Directory driver. [[collection/concepts/entra-id]] can in turn be sourced from AD via Entra Connect, or AD can be sourced from Entra ID in cloud-master scenarios.

See [[collection/concepts/identity-and-access-management]] for the broader IAM context.
