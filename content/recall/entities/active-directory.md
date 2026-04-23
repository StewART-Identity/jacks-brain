---
title: "Active Directory"
type: entity
created: 2026-04-23
updated: 2026-04-23
tags:
  - active-directory
  - microsoft
  - ldap
  - directory-service
  - identity
  - iam
sources:
  - "[[recall/sources/2026-04-23-img-2369]]"
confidence: high
---

Microsoft Active Directory (AD) is a directory service and credential store used in enterprise environments to manage users, computers, groups, and policies. It is the canonical backend against which Identity Providers validate credentials in enterprise [[recall/concepts/saml|SAML]] flows.

## Role in IAM Protocols

In a [[recall/concepts/saml|SAML]] SSO flow, the SAML Identity Provider queries Active Directory (or a compatible LDAP directory) to verify that a user's submitted credentials are valid before issuing a SAML assertion to the Service Provider. The user never interacts with AD directly — the IdP acts as the intermediary.

In [[recall/concepts/oauth|OAuth]] flows, AD may serve as the underlying user store for the Authorization Server, though this coupling is less explicit in the OAuth specification.

## Variants

| Product | Description |
|---------|-------------|
| Active Directory Domain Services (AD DS) | On-premises directory, the classic enterprise deployment |
| Azure Active Directory / Entra ID | Microsoft's cloud identity platform; supports SAML, OAuth 2.0, and OIDC natively |
| AD Lightweight Directory Services (AD LDS) | LDAP-compatible, no Kerberos/domain controller requirements |
