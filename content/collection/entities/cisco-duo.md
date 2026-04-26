---
title: "Cisco Duo"
summary: "Third-party MFA provider integrated into Microsoft Entra ID as an External Authentication Method at UNT System."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - mfa
  - cisco
  - duo
  - security
confidence: high
---

Cisco Duo is a multi-factor authentication (MFA) provider owned by Cisco. At [[collection/entities/unt-system]], it is configured as an [[collection/concepts/external-authentication-method]] (EAM) within [[collection/entities/microsoft-entra-id]], meaning it handles the MFA challenge step for users authenticating to Microsoft 365 services.

## Integration Model

Under the EAM model, [[collection/concepts/conditional-access]] redirects the MFA prompt to Duo rather than using Microsoft's native Authenticator. Duo returns a pass/fail signal to Entra ID.

## Key Behaviors at UNT System

- **Prompt frequency**: controlled by Duo's "remembered device" cookie duration. Under [[collection/entities/adfs]], this was ~30 days. Post-migration the duration is shorter, causing more frequent prompts — adjustable in the Duo Admin Panel.
- **Outage risk**: if Duo is unreachable and no fallback MFA method is enabled, all internal users are locked out of M365 services. [[collection/concepts/conditional-access]] has no fail-open mechanism.

See [[collection/sources/2026-04-25-authentication-methods-migration-summary]] for full migration context and the recommendation to add SMS/Voice as fallback methods.
