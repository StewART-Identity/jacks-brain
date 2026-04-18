---
title: "IAM Testing Methodology"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - iam
  - testing
  - change-management
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
confidence: medium
---

# IAM Testing Methodology

A formal testing methodology document developed by [[recall/entities/unt-system]]'s IAM team that defines scope classifications, risk assessment criteria, testing phases, and approval workflows for identity infrastructure changes.

## What It Defines

- **Scope classifications** — categorizing changes by impact breadth and risk level
- **Risk assessment criteria** — framework for evaluating change risk before execution
- **Testing phases** — structured progression through smoke, functional, and regression testing
- **Approval workflows** — required sign-offs before production deployment

## How It Maps to Environments

The methodology requires the [[recall/concepts/entra-id-three-tenant-model]] to execute:

| Phase | Environment | Activity |
|-------|-------------|----------|
| Planning | Greenfield (myuntsrc) | Compare proposed changes against Microsoft default configuration |
| Testing | Staging (myunttest) | Execute smoke, functional, and regression test cases |
| Deployment | Production (myunt) | Apply changes only after documented staging validation and required approvals |

## Motivation

The January 28, 2026 ADFS → Entra ID migration — which affected 72,274 user accounts — demonstrated the cost of identity infrastructure changes without a formal testing process. Issues not documented by Microsoft or [[recall/entities/cisco-duo]] had to be discovered and resolved in production, causing user-facing authentication disruptions.

The methodology was developed in response to that incident. Without the supporting infrastructure (the three-tenant model), it remains a procedural document with no environment to run against.

## Status

As of February 2026, the methodology document exists but its supporting infrastructure (persistent staging and greenfield tenants) was pending approval per [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]].

## Related Pages

- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/entities/unt-system]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/jack-stewart]]
- [[recall/concepts/conditional-access-policy]]
