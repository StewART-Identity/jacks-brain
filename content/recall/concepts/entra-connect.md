---
title: "Entra Connect (Hybrid Identity Sync)"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - entra-id
  - active-directory
  - synchronization
  - hybrid
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

Microsoft Entra Connect (formerly Azure AD Connect) is the synchronization tool that replicates identity objects — users, groups, and attributes — from on-premises [[recall/entities/active-directory]] to [[recall/entities/microsoft-entra-id]]. At [[recall/entities/unt-system]], it is the bridge between the on-premises provisioning layer and the cloud authentication layer.

## How It Works

Entra Connect runs on-premises, connecting to AD and Entra ID. It operates on a configurable sync cycle (default 30 minutes; UNT's DuoUsers group syncs every 12 hours) and replicates objects within the configured sync scope into the Entra ID tenant. Objects not in scope are not visible to Entra ID and therefore cannot be used as [[recall/concepts/conditional-access-policy]] targets.

## UNT System Sync Scope

| Group | Members | Sync Status | Used As |
|-------|---------|-------------|---------|
| `DuoUsers` | ~90,000 Duo-enrolled users | Synced; 12h refresh cycle | CA target in `Logon-CitrixHorizon-CA`; Duo EAM population |
| `ECS-DUO-Users` | Internal users | Synced | CA target in `Logon-InternalUsers-CA`; original Duo EAM population |

Adding `DuoUsers` to the Entra Connect sync scope was Part 2, Step 1 of the [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final|Entra Authentication Methods Rollout Plan]] — marked DONE before the plan was written, as this was a prerequisite for both the new CA policy and the Duo EAM expansion.

## Architectural Role

Entra Connect is the coupling point between the provisioning layer and the authentication layer:

1. **[[recall/entities/edirectory]]** — identity source of truth; provisioning scripts write here first
2. **[[recall/entities/active-directory]]** — downstream of eDirectory; group memberships managed by provisioning scripts
3. **Entra Connect** ← this page — replicates AD groups to Entra ID on schedule
4. **[[recall/entities/microsoft-entra-id]]** — cloud authentication; uses synced groups as CA policy targets

See [[recall/synthesis/unt-iam-provisioning-layer]] for the full analysis of this dependency chain.

## Dependency Risk

Because [[recall/concepts/conditional-access-policy]] policies target synced groups, **provisioning-layer bugs silently break authentication policy enforcement**. If a script incorrectly manages `ECS-DUO-Users` or `DuoUsers` membership in AD, Entra Connect faithfully replicates that incorrect state to Entra ID, and users either lose or gain MFA enforcement without any authentication-layer change.

The 12-hour refresh cycle for DuoUsers also means additions and removals are not instantaneous — there is an inherent lag between on-prem group changes and when those changes are enforced in Entra ID [[recall/concepts/conditional-access-policy|Conditional Access]].

## Related Concepts

- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/iam-testing-methodology]]

## Related Entities

- [[recall/entities/active-directory]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/unt-system]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]] — Part 2 Step 1: DuoUsers sync scope expansion
- [[recall/sources/2026-04-18-2026-04-18-contract]] — AD group membership management by provisioning scripts
