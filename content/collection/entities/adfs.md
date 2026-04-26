---
title: "Active Directory Federation Services (ADFS)"
summary: "Microsoft's on-premises federation server — replaced by direct Entra ID authentication at UNT System in January 2026."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - microsoft
  - adfs
  - federation
  - on-premises
  - legacy
confidence: high
---

Active Directory Federation Services (ADFS) is Microsoft's on-premises federation server. It acts as an identity broker — handling authentication locally and issuing tokens to cloud services — allowing organizations to keep credential validation on-premises while federating identity to cloud providers like [[collection/entities/microsoft-entra-id]].

## Role at UNT System

[[collection/entities/unt-system]] used ADFS as the federation layer between its on-premises Active Directory and [[collection/entities/microsoft-entra-id]]. Under this configuration:

- MFA was handled via [[collection/entities/cisco-duo]] with a ~30-day "remembered device" cookie duration
- A "fail open" setting allowed authentication without MFA during a Duo outage

On **January 28, 2026**, UNT System de-federated from ADFS as part of its [[collection/concepts/authentication-methods-policy]] migration. [[collection/concepts/password-hash-sync]] replaced the federation dependency, and the "fail open" capability was not preserved in the new architecture.

See [[collection/sources/2026-04-25-authentication-methods-migration-summary]] for migration details and the open risk this created.
