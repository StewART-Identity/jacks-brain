---
title: "System-Preferred MFA"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - entra-id
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

A [[recall/entities/microsoft-entra-id]] setting that, when set to "Microsoft managed," allows Entra ID to automatically select the MFA method it determines to be most secure or appropriate — overriding the user's default or a configured [[recall/concepts/external-authentication-method]].

## States

| State | Behavior |
|-------|----------|
| Microsoft managed | Entra ID chooses the MFA method, potentially overriding configured EAMs |
| Enabled | Explicitly on — Entra ID selects the method |
| Disabled | Entra ID does not override; the configured EAM or user default is presented |

## Problem at UNT System

When System-Preferred MFA was set to "Microsoft managed," [[recall/entities/microsoft-entra-id]] would present Microsoft Authenticator instead of [[recall/entities/cisco-duo]] (the configured [[recall/concepts/external-authentication-method]]) for some users. This undermined the organization's decision to use Duo as the primary MFA provider.

**Fix:** Set System-Preferred MFA to "Disabled," scoped to the DuoUsers group, so Duo is consistently presented to all targeted users.

## Relationship to Other Controls

- Must be disabled before [[recall/concepts/mfa-sign-in-frequency|sign-in frequency]] and [[recall/concepts/conditional-access-policy|Conditional Access policy]] changes take effect as intended — otherwise Entra may swap the MFA method and invalidate the session controls.
- Disabling this setting is Step 1 (first in sequence) in the UNT rollout plan, as it has no direct user-facing impact and unblocks all subsequent steps.

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
