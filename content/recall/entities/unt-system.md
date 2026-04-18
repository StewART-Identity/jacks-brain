---
title: "UNT System"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - organization
  - higher-education
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]]"
confidence: high
---

The University of North Texas System — a public university system operating a shared Identity and Access Management (IAM) infrastructure.

## IAM Infrastructure

UNT System's IAM team manages centralized authentication for the system's institutions. Key infrastructure includes:

- **[[recall/entities/microsoft-entra-id]]** — Cloud identity platform (migrated from ADFS on January 28, 2026)
- **[[recall/entities/cisco-duo]]** — MFA provider, integrated as an [[recall/concepts/external-authentication-method]]
- **[[recall/entities/citrix-horizon]]** — Virtual desktop/application delivery platform requiring dedicated [[recall/concepts/conditional-access-policy]]
- **Entra Connect** — Syncs on-premises AD groups (including DuoUsers, ~90,000 members) to Entra ID

## Key Personnel

- [[recall/entities/jack-stewart]] — Architect/Engineer, Identity and Access Management
- [[recall/entities/parker-bush]] — Manager, Identity and Access Management
- [[recall/entities/ryan-kane]] — Director, Enterprise Collaboration Services

## Multi-Tenant Environment Strategy

In February 2026, [[recall/entities/jack-stewart]] proposed the [[recall/concepts/entra-id-three-tenant-model]] — three persistent Entra ID P2 tenants for production, staging, and greenfield baseline comparison. The proposal was motivated by the January 2026 migration incident, in which the absence of a test environment forced all troubleshooting to occur in production.

The strategy integrates with the [[recall/concepts/iam-testing-methodology]], a formal change management process defining scope, risk assessment, testing phases, and approval workflows.

Estimated new cost: $9,900/month ($118,800/year) before enterprise/educational pricing.

## Planned IAM Projects (2026–2030)

- [[recall/concepts/conditional-access-policy|Conditional Access]] policy redesign across all three institutions
- [[recall/concepts/privileged-identity-management|PIM]] rollout for administrative roles
- Enterprise application migration to Entra ID SSO
- Identity Protection policy tuning and risk-based CA
- Potential Entra Connect Sync → Entra Cloud Sync migration
- Access reviews for FERPA and HIPAA compliance

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
- [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]
- [[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]]
