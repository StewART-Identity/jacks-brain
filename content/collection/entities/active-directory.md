---
title: "Active Directory"
summary: "Microsoft's directory and credential store; the canonical backend behind enterprise SAML and OAuth flows."
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
  - "[[collection/sources/2026-04-23-img-2369]]"
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
  - "[[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Microsoft Active Directory (AD) is a directory service and credential store used in enterprise environments to manage users, computers, groups, and policies. It is the canonical backend against which Identity Providers validate credentials in enterprise [[collection/concepts/saml|SAML]] flows.

## Role in IAM Protocols

In a [[collection/concepts/saml|SAML]] SSO flow, the SAML Identity Provider queries Active Directory (or a compatible LDAP directory) to verify that a user's submitted credentials are valid before issuing a SAML assertion to the Service Provider. The user never interacts with AD directly — the IdP acts as the intermediary.

In [[collection/concepts/oauth|OAuth]] flows, AD may serve as the underlying user store for the Authorization Server, though this coupling is less explicit in the OAuth specification.

## Variants

| Product | Description |
|---------|-------------|
| Active Directory Domain Services (AD DS) | On-premises directory, the classic enterprise deployment |
| Azure Active Directory / Entra ID | Microsoft's cloud identity platform; supports SAML, OAuth 2.0, and OIDC natively |
| AD Lightweight Directory Services (AD LDS) | LDAP-compatible, no Kerberos/domain controller requirements |

## Role in Account Lifecycle Management

At [[collection/entities/unt-system-iam|UNT System IAM]], Active Directory is deployed across three domains (HSC, STUDENTS, UNT) and is a downstream consumer of [[collection/entities/edirectory-idtree|eDirectory (IDTREE)]]. [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers propagate identity state changes from IDTREE to AD asynchronously.

[[collection/entities/alma|ALMA]] manages the AD account state through the `userAccountControl` attribute, specifically bit 2 (`UF_ACCOUNTDISABLE`): setting it disables the account; clearing it re-enables it. During inactivity deactivation, ALMA lets IDM propagation set this bit (via the `DeactivateAccounts` output transformation that sets `dirxml-uACAccountDisable=true`). During reactivation, because the `untAccountADNoSync` sync lock is still active at that stage, ALMA re-enables AD accounts directly via the `/reactivate/ad` endpoint rather than through IDM.

When an AD account is disabled, it cannot authenticate in [[collection/concepts/saml|SAML]] flows (where the IdP validates credentials against AD) or [[collection/concepts/oauth|OAuth]] flows (where the Authorization Server uses AD for user validation). Account lifecycle management is therefore the enforcement layer beneath these authentication protocols. See [[collection/concepts/account-lifecycle-management|account lifecycle management]] and [[collection/synthesis/unt-iam-identity-infrastructure|UNT IAM Identity Infrastructure]] for broader context.

## AD Offboarding Gap

ALMA handles inactivity-based deactivation, but permanent offboarding of separated employees has a separate gap. `ad/offboarding.py` in `dstools` contains logic to disable AD accounts and delete Exchange ActiveSync objects for terminated users — but it does not appear in any crontab. The only scheduled offboarding-adjacent process, `idtree/idtree_offboarding_workaround.py` (daily, 11:59 PM), only removes terminated employees from IDTREE group memberships and does not touch AD accounts.

As a result, automated account disablement for separated employees depends entirely on manual action or Identity Manager driver behavior. See [[collection/concepts/deprovisioning|deprovisioning]] and [[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis|Deprovisioning Gap Analysis]] for full context.
