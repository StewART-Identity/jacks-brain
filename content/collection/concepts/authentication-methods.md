---
title: "Authentication Methods"
summary: "The set of verification mechanisms registered to a user account in Entra ID — including MFA methods like Duo and legacy methods like MyUNT that can block re-enrollment."
type: concept
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - authentication-methods
  - entra-id
  - mfa
  - duo
  - myunt
  - unt-system
  - migration
sources:
  - "[[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]"
confidence: high
---

In [[collection/entities/microsoft-entra-id]], each user account carries a list of registered authentication methods — the mechanisms the platform accepts for verifying identity during sign-in or MFA challenges. Methods can include passwordless options, authenticator apps, phone numbers, and external authentication integrations.

## Legacy MyUNT Method at UNT System

[[collection/entities/unt-system]] previously used an external authentication method called **MyUNT**. After migrating to native Microsoft authentication, some user accounts retained stale MyUNT method records. These stale records interfere with Duo enrollment: the user sees a "MyUNT" error during MFA setup and cannot register a new method.

The fix is to remove the legacy method via [[collection/entities/dstools]]'s Clear Authentication Methods feature, after which the user re-enrolls in Duo at https://mfa.untsystem.edu. The full procedure is documented in [[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]].

## Operational Notes

- Authentication method changes in Entra ID take effect immediately — no sync delay.
- The clear operation is irreversible; users must fully re-enroll in Duo after their methods are cleared.
- Affected users present with: inability to set up Duo, "MyUNT" errors during MFA setup, or methods that appear stuck and won't update.
