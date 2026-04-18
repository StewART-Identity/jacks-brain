---
title: "Privileged Identity Management (PIM)"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - entra-id
  - privileged-access
  - iam
  - microsoft
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: medium
---

# Privileged Identity Management (PIM)

A Microsoft [[recall/entities/microsoft-entra-id]] P2 feature that provides just-in-time privileged access to Azure and Entra ID roles. Administrators are assigned **eligible** (not permanent) role assignments and must activate them on demand, with optional approval workflows and time limits.

## Key Capabilities

- **Eligible assignments** — admins hold the right to activate a role, but are not continuously assigned it
- **Just-in-time activation** — roles activated on demand, typically for a defined time window
- **Approval workflows** — activations can require manager or peer approval
- **Access reviews** — periodic reviews to confirm ongoing need for privileged access
- **Audit logs** — full history of role activations and approvals

## At UNT System

PIM rollout for administrative roles is a planned IAM project at [[recall/entities/unt-system]], anticipated to use the staging and greenfield tenants from [[recall/concepts/entra-id-three-tenant-model]] for pre-production testing.

The Entra Authentication Methods Rollout Plan also recommended provisioning **dedicated cloud-native admin accounts** (`euid@myunt.onmicrosoft.com`) with minimum roles and PIM eligible assignments, as a mitigation for the incompatibility between [[recall/concepts/external-authentication-method|EAM (Cisco Duo)]] and custom authentication strengths.

## Why P2 Required

PIM is an Entra ID P2 feature. This is one reason the staging tenant in the [[recall/concepts/entra-id-three-tenant-model]] requires P2 licensing — testing PIM configurations against a P1 tenant would produce incomplete validation.

## Related Pages

- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/unt-system]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/external-authentication-method]]
