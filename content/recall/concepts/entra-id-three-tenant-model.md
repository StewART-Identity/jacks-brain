---
title: "Entra ID Three-Tenant Model"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - entra-id
  - testing
  - infrastructure
  - iam
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
confidence: high
---

# Entra ID Three-Tenant Model

A persistent, licensed Microsoft [[recall/entities/microsoft-entra-id]] infrastructure pattern using three parallel tenants: production, staging, and greenfield baseline. Proposed by [[recall/entities/jack-stewart]] for [[recall/entities/unt-system]] in February 2026.

## The Three Tenants

| Role | Tenant | Purpose | Change Policy |
|------|--------|---------|---------------|
| **Production** | myunt.onmicrosoft.com | Live identity services for all UNT System users | Changes require validated test plan |
| **Staging** | myunttest.onmicrosoft.com | Pre-production testing; mirrors production config | Freely modifiable; can be reset from production export |
| **Greenfield** | myuntsrc.onmicrosoft.com | Microsoft out-of-box defaults; never modified | Read-only reference; no configuration changes |

## Why Each Tenant Requires Entra ID P2

All three tenants require P2 licensing to enable the full feature surface:
- **Staging** needs P2 to test P2-dependent production features: risk-based [[recall/concepts/conditional-access-policy|Conditional Access]], [[recall/concepts/privileged-identity-management]], Identity Protection, access reviews. Testing against a P1 tenant produces a false sense of readiness.
- **Greenfield** needs P2 to ensure all P2 feature defaults are visible for comparison.

## Greenfield Integrity

The greenfield tenant answers a critical auditing question: "Is this a setting we configured, or is it what Microsoft delivers by default?" This eliminates guesswork when reviewing inherited configurations.

The greenfield must be **persistent** (not recreated from a trial) because Microsoft regularly updates default tenant settings. A greenfield created at a known point in time provides a stable, documentable reference. If the tenant is deleted and recreated, there is no guarantee of identical defaults.

## Why Persistent Environments (vs. 30-Day Trials)

Microsoft 30-day P2 trials are inadequate for ongoing infrastructure work:
- IAM projects span months (the January 2026 migration ran September 2025 through February 2026)
- Destroying/recreating staging state between projects wastes engineering time and risks reconstruction errors
- Under a production incident, provisioning a trial tenant is not viable — persistent environments allow immediate access

## Integration with IAM Testing Methodology

This model provides the physical infrastructure for the [[recall/concepts/iam-testing-methodology]]:
1. **Greenfield** — planning phase comparison against known defaults
2. **Staging** — smoke testing, functional testing, regression testing
3. **Production** — receives changes only after documented staging validation

## Origin

The January 28, 2026 ADFS → Entra ID migration, which affected 72,000+ users, forced the [[recall/entities/unt-system]] IAM team to troubleshoot in production due to the absence of a test environment. The migration revealed undocumented behaviors around [[recall/concepts/external-authentication-method]] registration cleanup and tenant-policy vs. user-object-level configuration discrepancies. See [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]] for full background.

## Precedent

Maintaining parallel production/test/baseline environments is standard enterprise IT practice. ERP platforms like PeopleSoft have established the same pattern. Identity infrastructure, which underpins authentication and authorization for every university system, warrants the same rigor.

## Related Pages

- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/unt-system]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/privileged-identity-management]]
- [[recall/concepts/external-authentication-method]]
