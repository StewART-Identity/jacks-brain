---
title: "MFA Sign-In Frequency and Remembered Devices"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - entra-id
  - session-management
sources:
  - "[[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

# MFA Sign-In Frequency and Remembered Devices

Two complementary controls that reduce MFA re-prompt frequency for end users — one at the [[entities/microsoft-entra-id]] layer, one at the [[entities/cisco-duo]] layer.

## Sign-In Frequency (Entra Conditional Access)

A session control within a [[concepts/conditional-access-policy]] that forces re-authentication after a configurable period. At [[entities/unt-system]], set to **7 days** on `Logon-InternalUsers-CA`.

- After the period expires, the user is prompted for MFA again regardless of active sessions.
- Does not affect app-specific session timeouts (e.g., Infoblox's 2-hour timeout); those apps must be excluded from broader session controls.
- Applies per policy — the Citrix Horizon policy (`Logon-CitrixHorizon-CA`) does not include a sign-in frequency, so it doesn't interfere.

## Remembered Devices (Duo)

A feature in the [[entities/cisco-duo]] Admin Panel that stores a browser cookie after a successful Duo authentication, suppressing the Duo prompt for subsequent sign-ins within the configured window.

- Configured per application in Duo Admin Panel → Applications → Azure/Entra ID app.
- Set to **7 days** for browser-based apps at UNT System.
- Applies regardless of which [[concepts/conditional-access-policy]] triggered the MFA requirement.
- May not work consistently across all platforms — mobile apps using broker authentication may still prompt.

## Interaction Between the Two

Both controls must be configured to achieve the 7-day re-prompt goal:
- **Entra sign-in frequency** prevents Entra from demanding a new MFA claim after 7 days at the policy level.
- **Duo remembered device cookie** prevents Duo from presenting a new challenge when Entra does request MFA within the window.

If only one is set, users may still be prompted: Entra could request MFA again (no CA frequency set) or Duo could challenge again (no remembered device configured).

**Rollout order:** Configure Duo Remembered Devices (Step 2) *before* setting the Entra CA sign-in frequency (Step 3) to ensure coverage is in place when the CA change activates.

## Related Concepts

- [[concepts/conditional-access-policy]]
- [[concepts/external-authentication-method]]
- [[concepts/system-preferred-mfa]]

## Sources

- [[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
