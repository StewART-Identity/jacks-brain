---
title: "Concepts"
---

Ideas, theories, frameworks, and principles distilled from sources.

| Page | Summary |
|------|---------|
| [[recall/concepts/conditional-access-policy\|Conditional Access Policy]] | Entra ID policy engine that enforces MFA, sign-in frequency, and other controls based on user/device/app/risk signals |
| [[recall/concepts/external-authentication-method\|External Authentication Method (EAM)]] | Entra ID feature delegating MFA challenges to a third-party provider (e.g., Cisco Duo) |
| [[recall/concepts/system-preferred-mfa\|System-Preferred MFA]] | Entra ID setting that, when enabled, lets Microsoft override the configured MFA method — disabled at UNT to preserve Duo |
| [[recall/concepts/mfa-sign-in-frequency\|MFA Sign-In Frequency & Remembered Devices]] | Paired controls (Entra CA + Duo cookie) reducing MFA re-prompts to once per 7 days |
| [[recall/concepts/entra-id-three-tenant-model\|Entra ID Three-Tenant Model]] | Production + staging + greenfield baseline pattern for safely testing Entra ID changes before production deployment |
| [[recall/concepts/iam-testing-methodology\|IAM Testing Methodology]] | Formal UNT System process defining scope, risk assessment, testing phases, and approval workflows for identity infrastructure changes |
| [[recall/concepts/privileged-identity-management\|Privileged Identity Management (PIM)]] | Entra ID P2 feature for just-in-time privileged access with eligible role assignments and approval workflows |
| [[recall/concepts/orphaned-authentication-registrations\|Orphaned Authentication Registrations]] | Undocumented Entra ID behavior: deleting an EAM configuration leaves stale registration records on individual user objects |
| [[recall/concepts/microsoft-managed-defaults\|Microsoft Managed Authentication Defaults]] | Pattern of Entra ID settings that default to "Microsoft managed," silently enabling Authenticator behaviors without explicit admin action |
| [[recall/concepts/mfa-fail-open-fail-closed\|MFA Fail-Open vs. Fail-Closed]] | Architectural tradeoff between allowing or denying access when MFA is unreachable; configurable under ADFS+Duo, removed under EAM |
