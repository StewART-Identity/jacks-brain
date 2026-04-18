---
title: "Cloud-Native Admin Accounts"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - entra-id
  - privileged-access
  - iam
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

A provisioning pattern for privileged accounts at [[recall/entities/unt-system]] where admin accounts are created directly in `myunt.onmicrosoft.com` rather than federated from on-premises Active Directory. The recommended naming pattern is `euid@myunt.onmicrosoft.com`.

## Why Cloud-Native Accounts Are Needed

[[recall/entities/unt-system]] primarily uses federated identities — accounts that originate in on-premises AD and are synced to [[recall/entities/microsoft-entra-id]] via Entra Connect. For standard users, this works well. For admin role holders using [[recall/entities/cisco-duo]] via [[recall/concepts/external-authentication-method|EAM]], it creates an authentication conflict:

1. Federated admins are routed through Duo EAM for MFA
2. Duo EAM returns a generic "MFA satisfied" claim — it does not specify which method was used
3. The `Logon-EntraAdminRoles-CA` policy requires the **Entra Admin MFA** custom [[recall/concepts/entra-id-authentication-strength]], which specifies Password + Authenticator (Push)
4. Entra ID cannot verify the Duo claim satisfies the named strength → authentication blocked or falls back unexpectedly

Cloud-native accounts resolve this because:
- They are not subject to EAM routing (Duo EAM targets federated/synced identities)
- Administrators can register Microsoft Authenticator natively on the cloud-native account
- Authenticator Push satisfies the custom authentication strength requirement cleanly

## Recommended Configuration at UNT System

Per the MFA rollout plan recommendation:

- **Format:** `euid@myunt.onmicrosoft.com`
- **Roles:** Minimum required roles, assigned as [[recall/concepts/privileged-identity-management|PIM]] eligible (not permanent)
- **Migration:** Users currently holding admin roles on federated accounts should be migrated to cloud-native accounts

This also eliminates the risk of federated admin accounts conflicting with EAM routing at the tenant level.

## Relationship to Broader IAM Architecture

Cloud-native admin accounts represent a deliberate architectural split:

| Account Type | Identity Origin | MFA Method | Role Access |
|---|---|---|---|
| Standard users | Federated (on-prem AD) | Cisco Duo via EAM | None |
| Cloud-native admins | Native to myunt.onmicrosoft.com | Microsoft Authenticator | PIM eligible assignments |

This split is consistent with Microsoft's recommended practice of separating privileged identities from standard user identities — reducing the blast radius of a compromised credential.

## Related Concepts

- [[recall/concepts/privileged-identity-management]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/entra-id-authentication-strength]]
- [[recall/concepts/conditional-access-policy]]

## Related Entities

- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/unt-system]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
