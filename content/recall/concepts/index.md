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
| [[recall/concepts/dry-run-by-default\|Dry-Run by Default]] | Safety design pattern for IAM scripts: no changes without `--commit`; safe state is the default; users opt into execution |
| [[recall/concepts/iam-scripting-architecture\|IAM Scripting Architecture]] | Three-layer pattern for UNT provisioning scripts: iam-modules (connections), lib/ (business logic), scripts (orchestration) |
| [[recall/concepts/entra-id-authentication-strength\|Entra ID Authentication Strength]] | Named MFA method combinations enforced via Conditional Access; custom strengths are incompatible with EAM (Duo), requiring cloud-native admin accounts |
| [[recall/concepts/cloud-native-admin-accounts\|Cloud-Native Admin Accounts]] | Admin accounts created directly in myunt.onmicrosoft.com (not federated) to resolve EAM + authentication strength incompatibility; paired with PIM eligible assignments |
| [[recall/concepts/entra-connect\|Entra Connect (Hybrid Identity Sync)]] | Microsoft sync tool replicating on-prem AD groups to Entra ID; bridges the provisioning and authentication layers at UNT System |
| [[recall/concepts/neuron-metaphor\|Neuron Metaphor for Knowledge Organization]] | Neuron anatomy (dendrites → soma → axon) mapped to wiki structure (sources → concepts → wikilinks); connections are as valuable as nodes |
| [[recall/concepts/graceful-interrupt-handling\|Graceful Interrupt Handling in IAM Scripts]] | Two-layer Ctrl+C safety (SIGINT handler + run() wrapper) ensuring scripts always report what they were doing when interrupted, never a traceback |
| [[recall/concepts/go-no-go-gate\|Go/No-Go Gate]] | Formal production deployment checkpoint: all pre-production test cases must pass and all signers must agree before any production change is applied |
