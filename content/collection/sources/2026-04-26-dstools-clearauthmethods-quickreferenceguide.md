---
title: "DSTools: Clear Authentication Methods Quick Reference Guide"
summary: "Procedural guide for removing legacy MyUNT auth methods from Entra ID accounts when users hit MFA setup failures after migration."
type: source
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - dstools
  - myunt
  - entra-id
  - authentication-methods
  - mfa
  - duo
  - unt-system
  - migration
  - troubleshooting
  - clear-methods
confidence: high
role: reference
views:
  - date: 2026-04-26
    note: "Initial cataloging."
---

Quick reference guide for the [[collection/entities/dstools]] **Clear Authentication Methods** feature used by [[collection/entities/unt-system]] IAM staff. The tool removes the legacy **MyUNT** external [[collection/concepts/authentication-methods|authentication method]] from user accounts in [[collection/entities/microsoft-entra-id]], restoring the user's ability to enroll in Duo two-factor authentication.

[Download original](/api/originals/2026-04-26-DSTools-ClearAuthMethods-QuickReferenceGuide.docx)

## Purpose

The tool targets a specific migration side-effect: users previously enrolled in the legacy MyUNT external authentication system who now see errors or stalled enrollment after UNT System moved to native Microsoft authentication. Clearing the stale MyUNT method unblocks Duo re-enrollment.

## Access

- **URL:** https://unt-dstools.untsystem.edu
- Requires membership in the **DSTools-ClearMethods** security group
- Sign in with UNT System credentials

## Procedure

1. Navigate to the tool URL and sign in.
2. Click **Clear Authentication Methods** on the landing page.
3. Enter the user's **EUID** or **email address**.
4. Review the user's current [[collection/concepts/authentication-methods]] displayed on screen.
5. Click **Clear** next to the MyUNT method.
6. Confirm the action when prompted.
7. Direct the user to https://mfa.untsystem.edu to re-enroll in Duo.

## Key Constraints

- **Irreversible.** The clear action cannot be undone — the user must re-enroll in Duo from scratch.
- **Immediate effect.** Changes sync to [[collection/entities/microsoft-entra-id]] instantly; no delay.
- Only removes the **MyUNT** method — other methods are unaffected.

## Symptom Triggers

Use this tool when a user:
- Cannot set up Duo two-factor authentication
- Sees an error mentioning "MyUNT" during MFA setup
- Has [[collection/concepts/authentication-methods]] that appear stuck or won't update
- Was previously enrolled in Duo and needs to re-enroll
