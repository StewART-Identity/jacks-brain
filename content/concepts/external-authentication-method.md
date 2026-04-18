---
title: "External Authentication Method (EAM)"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - entra-id
sources:
  - "[[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

# External Authentication Method (EAM)

A [[entities/microsoft-entra-id]] feature that allows a third-party MFA provider to handle the MFA challenge in place of Microsoft's built-in methods (e.g., Microsoft Authenticator). The external provider is registered in Entra ID's Authentication Methods settings and invoked during Conditional Access MFA grants.

## How It Works

When a [[concepts/conditional-access-policy]] requires MFA, Entra ID delegates the challenge to the registered EAM provider rather than presenting a built-in method. The provider authenticates the user and returns a claim to Entra ID confirming MFA was satisfied.

## UNT System Usage

[[entities/cisco-duo]] is configured as the EAM at [[entities/unt-system]]. Two groups are included:
- `ECS-DUO-Users` — original internal user population
- `DuoUsers` — ~90,000 Duo-enrolled users, added in Part 2 of the rollout

**Critical issue:** If [[concepts/system-preferred-mfa]] is set to "Microsoft managed," Entra ID may present Microsoft Authenticator instead of the Duo EAM, bypassing Duo. The fix is to set System-Preferred MFA to "Disabled."

## Known Limitations

- **Incompatible with custom authentication strengths** — A Microsoft platform limitation. Policies using custom auth strength definitions cannot route through an EAM. Cloud-native admin accounts are the recommended workaround for admin roles that need both.
- **Mobile broker bypass** — On mobile platforms, authentication may go through the Microsoft Authenticator broker app instead of Duo, bypassing the EAM. No config-level fix is available.
- **Federated admin accounts** — May conflict with EAM routing.

## Related Concepts

- [[concepts/system-preferred-mfa]]
- [[concepts/conditional-access-policy]]
- [[concepts/mfa-sign-in-frequency]]

## Sources

- [[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
