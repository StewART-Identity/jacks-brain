---
title: "Citrix Horizon"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - tool
  - virtual-desktop
  - application
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

A virtual desktop infrastructure (VDI) and application delivery platform used at [[recall/entities/unt-system]]. It is an enterprise application registered in [[recall/entities/microsoft-entra-id]].

## MFA Enforcement at UNT System

MFA enforcement for Citrix Horizon was disrupted during the January 28, 2026 ADFS → Entra ID migration. Part 2 of the rollout plan restores this enforcement by:

1. Syncing the `DuoUsers` group (~90,000 Duo-enrolled users) into Entra ID via Entra Connect (**DONE**)
2. Creating a dedicated [[recall/concepts/conditional-access-policy]] (`Logon-CitrixHorizon-CA`) targeting the DuoUsers group with Require MFA grant
3. Adding DuoUsers to the [[recall/entities/cisco-duo]] [[recall/concepts/external-authentication-method]] so Duo handles the MFA challenge

**Critical note:** The Duo EAM must be provisioned (Step 3) before the CA policy is enforced (Step 2). If the CA enforces before Duo is available, users fall through to Microsoft Authenticator or are blocked entirely.

**Scope decision:** Unenrolled students not in the DuoUsers group are intentionally excluded from the Citrix CA policy.

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
