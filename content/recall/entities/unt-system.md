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
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

The University of North Texas System — a public university system operating a shared Identity and Access Management (IAM) infrastructure.

## IAM Infrastructure

UNT System's IAM team manages centralized authentication for the system's institutions. Key infrastructure includes:

- **[[recall/entities/microsoft-entra-id]]** — Cloud identity platform (migrated from ADFS on January 28, 2026)
- **[[recall/entities/cisco-duo]]** — MFA provider, integrated as an [[recall/concepts/external-authentication-method]]
- **[[recall/entities/citrix-horizon]]** — Virtual desktop/application delivery platform requiring dedicated [[recall/concepts/conditional-access-policy]]
- **Entra Connect** — Syncs on-premises AD groups (including DuoUsers, ~90,000 members) to Entra ID
- **[[recall/entities/edirectory]]** — On-premises NetIQ eDirectory (`idmpidv01.untsystem.edu:637`); primary identity store for provisioning
- **Active Directory** — Four domains: `ad.unt.edu`, `unt.ad.unt.edu`, `hsc.ad.unt.edu`, `students.ad.unt.edu`; one least-privilege service account per domain
- **Oracle databases** — HRPD (`oradb404`) and LSPD (`oradb405`), PeopleSoft HR/LS; source-of-truth for employee and student data
- **[[recall/entities/iam-modules]]** — Shared Python library centralizing all connections, logging, and credential management for 4+ scripting repos

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

## Scripting Infrastructure

Provisioning automation runs on `iam-script-gab` as the `iamadm` user. The [[recall/concepts/iam-scripting-architecture]] enforces a three-layer separation: [[recall/entities/iam-modules]] for connections and logging, `lib/` for business logic, and scripts for orchestration. All scripts default to dry-run mode; live execution requires `--commit`. See [[recall/synthesis/unt-iam-provisioning-layer]] for how the provisioning and authentication layers relate.

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
- [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]
- [[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
