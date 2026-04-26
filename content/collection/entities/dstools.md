---
title: "DSTools"
summary: "UNT System internal web application for IAM administrative operations, including clearing legacy authentication methods from Entra ID accounts."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - dstools
  - unt-system
  - internal-tool
  - entra-id
  - authentication-methods
  - admin-tooling
sources:
  - "[[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]]"
confidence: high
---

Internal administrative web application hosted at `unt-dstools.untsystem.edu`, operated by the [[collection/entities/unt-system]] IAM team. Provides purpose-built tooling for identity management operations that are awkward or unavailable in standard admin portals.

## Known Features

- **Clear Authentication Methods** — removes the legacy MyUNT external [[collection/concepts/authentication-methods|authentication method]] from a user account in [[collection/entities/microsoft-entra-id]], unblocking Duo re-enrollment. Documented in [[collection/sources/2026-04-26-dstools-clearauthmethods-quickreferenceguide]].

## Access Model

Access is gated by security group membership (e.g., `DSTools-ClearMethods` for the clear-methods feature). Staff must sign in with UNT System credentials.
