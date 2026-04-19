---
title: "MFA Fail-Open vs. Fail-Closed"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - availability
  - business-continuity
  - architecture
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]"
  - "[[recall/sources/2026-04-19-2026-04-18-authentication-methods-migration-executive-brief-2-]]"
confidence: high
---

An architectural concept governing what happens when the MFA service is unreachable during an authentication attempt. The two modes represent opposite positions on the security/availability tradeoff.

| Mode | Behavior When MFA Unreachable | Security posture | Availability posture |
|------|-------------------------------|-----------------|---------------------|
| Fail-open | Allow access without MFA | Weaker | Higher |
| Fail-closed | Block access | Stronger | Lower |

## ADFS + Duo: Configurable Fail Mode

Under [[recall/entities/unt-system]]'s previous ADFS-federated architecture, the [[recall/entities/cisco-duo]] MFA adapter ran as an on-premises plugin within ADFS infrastructure. ADFS provided an explicit **Fail Mode** setting giving administrators direct control over which posture to adopt during a Duo service disruption. This choice was a deliberate, documented configuration decision.

## EAM Architecture: No Fail Mode Control

After migrating to [[recall/entities/microsoft-entra-id]]'s [[recall/concepts/external-authentication-method]] (EAM) framework, this control no longer exists. The architectural change:

1. Entra ID redirects users to Duo's cloud service via OpenID Connect
2. If Duo is unreachable (service outage, network disruption, DNS failure), the redirect fails
3. Entra ID receives no MFA claim
4. The [[recall/concepts/conditional-access-policy]] (`Logon-InternalUsers-CA`) requires MFA for all cloud app access
5. Microsoft's Conditional Access engine has no fail-open or skip-MFA mechanism
6. Access is denied

**Impact at UNT System:** If Cisco Duo experiences a service outage and no fallback MFA method is enabled for internal users, the entire university user population (~72,000) could be unable to access Microsoft 365 services (Outlook, Teams, SharePoint, OneDrive) for the duration of the outage.

## Mitigation: Supplemental MFA Methods as Fallback

Since Conditional Access cannot be set to fail-open, the mitigation is to ensure an *alternative MFA method* is always available that does not depend on the Duo service. At UNT System, the recommended approach is enabling SMS and Voice Call for the `ECS-DUO-Users` group:

- SMS and Voice operate through Microsoft's own telephony infrastructure, independent of Duo
- These methods are already configured for the `Entra-Admin-Roles` group
- If Duo is unreachable, users can authenticate via SMS/Voice without administrator intervention

**Tradeoff:** [[recall/entities/microsoft-entra-id]] does not support authentication method priority or ordered fallback. Users would see SMS, Voice, and Duo as equal choices at every login — some users may choose SMS for convenience rather than using Duo. The executive brief argues the business continuity benefit outweighs this UX compromise.

## Architectural Significance

The loss of fail-mode control represents a meaningful reduction in operational autonomy that accompanied the migration to cloud-based EAM. Under ADFS+Duo, the university controlled both the authentication flow and the fallback behavior. Under EAM, Microsoft's Conditional Access engine governs the fallback path, and the only lever available to administrators is ensuring alternative MFA methods exist.

This is a broader pattern of cloud-native identity platforms offering less direct operational control in exchange for reduced infrastructure management burden.

## Related Pages

- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/unt-system]]
- [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]
