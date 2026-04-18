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
  - "[[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

# UNT System

The University of North Texas System — a public university system operating a shared Identity and Access Management (IAM) infrastructure.

## IAM Infrastructure

UNT System's IAM team manages centralized authentication for the system's institutions. Key infrastructure includes:

- **[[entities/microsoft-entra-id]]** — Cloud identity platform (migrated from ADFS on January 28, 2026)
- **[[entities/cisco-duo]]** — MFA provider, integrated as an [[concepts/external-authentication-method]]
- **[[entities/citrix-horizon]]** — Virtual desktop/application delivery platform requiring dedicated [[concepts/conditional-access-policy]]
- **Entra Connect** — Syncs on-premises AD groups (including DuoUsers, ~90,000 members) to Entra ID

## Key Personnel

- [[entities/jack-stewart]] — Architect/Engineer, Identity and Access Management
- Parker Bush — Manager, Identity and Access Management
- Ryan Kane — Director, Enterprise Collaboration Services

## Sources

- [[sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
