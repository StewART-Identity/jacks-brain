---
title: "Authentication Strength Propagation Delays"
type: concept
created: 2026-04-19
updated: 2026-04-19
tags:
  - identity
  - authentication
  - entra-id
  - iam
  - incident
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]"
  - "[[recall/sources/2026-04-19-2026-04-18-auth-methods-migration-case-study-1-]]"
confidence: medium
---

A behavior in [[recall/entities/microsoft-entra-id]] where changes to [[recall/concepts/entra-id-authentication-strength|authentication strength]] requirements do not take effect immediately after being applied. During the propagation window, the system may enforce stale policy, producing unexpected MFA prompts or method conflicts for affected users.

## Discovery

First documented in [[recall/entities/unt-system]]'s January 28, 2026 ADFS → Entra ID migration. After the IAM team updated authentication strength requirements for administrator roles — specifying [[recall/entities/cisco-duo]] as the required MFA method — administrators continued to receive Microsoft Authenticator prompts during the delay. The propagation timeline was not documented by Microsoft.

## Mechanism

Entra ID's [[recall/concepts/conditional-access-policy|Conditional Access]] policy evaluation depends on authentication strength definitions being fully resolved at the point of sign-in evaluation. When a policy change is made, there is an undocumented period during which the updated strength definition may not be uniformly applied across all authentication evaluations. Users signing in during this window encounter the pre-change behavior.

## Impact at UNT

- Administrator role holders received unexpected Microsoft Authenticator prompts despite policy specifying Duo as the required method
- Required post-cutover investigation to diagnose timing as root cause
- No Microsoft documentation provided a propagation SLA or recommended mitigation

## Testing Coverage

Under the [[recall/concepts/iam-testing-methodology]], regression testing across administrator MFA flows — including sign-in behavior before, during, and after authentication strength updates — would have identified the propagation timing issue in the staging tenant. The propagation window could then be documented in the production rollout plan as a known behavior, rather than requiring live investigation.

## Relationship to Other EAM Limitations

Propagation delays compound existing tensions in the [[recall/concepts/external-authentication-method]] + [[recall/concepts/entra-id-authentication-strength|custom auth strength]] stack. Because EAM is already incompatible with custom auth strengths (see [[recall/concepts/cloud-native-admin-accounts]] for the workaround), any delay in strength policy updates creates a window where the conflict is more likely to surface. Neither issue is independently documented by Microsoft.

## Related Pages

- [[recall/concepts/entra-id-authentication-strength]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/cloud-native-admin-accounts]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/unt-system]]
- [[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]
