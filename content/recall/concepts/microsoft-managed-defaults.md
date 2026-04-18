---
title: "Microsoft Managed Authentication Defaults"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - mfa
  - entra-id
  - configuration
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]"
confidence: high
---

A pattern in [[recall/entities/microsoft-entra-id]] where several authentication-related settings default to a "Microsoft managed" state rather than an explicit on/off value. This state silently enables Microsoft-preferred behaviors — primarily Microsoft Authenticator enrollment and prompting — without explicit administrator action.

## Affected Settings

| Setting | "Microsoft managed" behavior |
|---------|------------------------------|
| [[recall/concepts/system-preferred-mfa\|System-Preferred MFA]] | Entra ID selects the MFA method it determines most secure, potentially overriding a configured [[recall/concepts/external-authentication-method]] |
| Registration Campaign | Nudges users to register Microsoft Authenticator; activates without explicit enablement |
| Authentication Methods policy defaults | Several method-specific settings default to Microsoft-managed states that favor Authenticator |

## Industry Impact

"Microsoft managed" defaults have caused widespread confusion for organizations using third-party MFA providers such as [[recall/entities/cisco-duo]]. Documented industry cases include:

- Administrators reporting no published list of which "Microsoft managed" controls affect Authenticator enrollment
- One administrator spending 7 hours troubleshooting why users were being forced to set up Authenticator when the organization uses Duo as its primary MFA provider
- Organizations discovering that the Registration Campaign was silently running, prompting users to enroll in Authenticator

The challenge is that these defaults activate behaviors *without explicit admin action*, making troubleshooting difficult — the administrator did not knowingly enable anything.

## Interaction with External Authentication Methods

When an organization configures an EAM (such as Duo), "Microsoft managed" defaults can undermine the intent of the EAM configuration:

- System-Preferred MFA may select Authenticator over Duo during authentication
- The Registration Campaign may prompt users to register Authenticator even when Authenticator is "disabled" in the Authentication Methods policy
- The JanBakker.tech analysis documents that Authenticator app *registration* automatically enables all authentication methods for the user — meaning the device-level broker gains capabilities regardless of policy

## Recommended Approach for Organizations Using Third-Party MFA

- Explicitly set System-Preferred MFA to "Disabled" (not "Microsoft managed") — see [[recall/concepts/system-preferred-mfa]]
- Explicitly disable the Registration Campaign
- Audit all "Microsoft managed" settings in the Authentication Methods policy after initial configuration
- Do not assume that disabling a method in the Authentication Methods policy eliminates all paths through which that method can be invoked (see mobile broker bypass in [[recall/concepts/external-authentication-method]])

## Related Pages

- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/external-authentication-method]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]
