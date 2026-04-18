---
title: "Entra Test Environment: Executive Brief"
type: source
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - entra-id
  - iam
  - unt-system
  - testing
  - infrastructure
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Entra_Test_Environment-Executive_Brief--1-.docx)

**Purpose:** Executive-facing brief requesting approval for two persistent, P2-licensed [[recall/entities/microsoft-entra-id]] tenants alongside [[recall/entities/unt-system]]'s existing production tenant.
**Classification:** Internal — Executive Audience

## The Ask

Provision two persistent, Entra ID P2-licensed tenants:

- **myunttest.onmicrosoft.com** (staging) — upgrade from free to P2, 1,000 licensed users
- **myuntsrc.onmicrosoft.com** (greenfield) — new, read-only baseline, 100 P2 licensed users

Together with the existing production tenant, these form the [[recall/concepts/entra-id-three-tenant-model]].

## Justification

The brief cites four drivers:

1. **No test environment exists.** The January 2026 ADFS → Entra ID authentication methods migration disrupted real users because issues undocumented by both Microsoft and [[recall/entities/cisco-duo]] had to be resolved in production.

2. **Inherited configuration risk.** The production tenant contains settings from previous administrators with no documentation. Without a greenfield baseline, the team cannot distinguish intentional configurations from drift or misconfiguration.

3. **Project timelines exceed trials.** The authentication methods migration spanned five months (September 2025 – February 2026). Microsoft's 30-day P2 trials cannot support multi-month project timelines, and recreating environments between projects wastes engineering time and risks configuration errors.

4. **P2 features require P2 testing.** Production uses [[recall/concepts/conditional-access-policy|Conditional Access]], Identity Protection, [[recall/concepts/privileged-identity-management|PIM]], and [[recall/concepts/external-authentication-method|External Authentication Methods]] — all P2 features. A free or P1 test tenant cannot validate P2-dependent behavior.

## Proposed Model

| Tenant | Purpose | Users | Change Policy |
|--------|---------|-------|---------------|
| Production (myunt) | Live services | 72,000+ | Changes require validated test plan |
| Staging (myunttest) | Test changes before production | 1,000 | Freely modifiable; mirrors production |
| Greenfield (myuntsrc) | Microsoft default baseline | 100 | Read-only; never modified |

## Cost

List price at $9/user/month for Entra ID P2:

| Tenant | Users | Monthly | Annual |
|--------|-------|---------|--------|
| Staging (myunttest) | 1,000 | $9,000 | $108,000 |
| Greenfield (myuntsrc) | 100 | $900 | $10,800 |
| **Total** | **1,100** | **$9,900** | **$118,800** |

Actual cost may be lower through UNT System's Microsoft enterprise agreement or educational pricing.

## Four-Year Scope

The environments are intended to support all future Entra ID projects including:

- [[recall/concepts/conditional-access-policy|Conditional Access]] redesign across all three institutions
- [[recall/concepts/privileged-identity-management|PIM]] rollout for administrative roles
- Enterprise application SSO migrations
- Identity Protection policy tuning
- Potential Entra Cloud Sync migration
- FERPA/HIPAA access reviews

## Recommendations

1. Provision `myuntsrc.onmicrosoft.com` — persistent greenfield baseline, 100 P2 licenses, read-only
2. Upgrade `myunttest.onmicrosoft.com` — P2, 1,000 licensed users, staging
3. Designate myuntsrc as read-only and myunttest as mandatory pre-production validation for all identity changes

## Relationship to Full Proposal

This document is the executive-facing companion to the [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal|Multi-Tenant Environment Proposal]]. The brief explicitly notes "Full proposal available upon request" — it omits technical implementation detail in favor of cost, risk, and business justification framing. The [[recall/concepts/iam-testing-methodology]] is referenced implicitly (through the staging→production flow) rather than named directly.

## Related Pages

- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/entities/unt-system]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/privileged-identity-management]]
- [[recall/concepts/external-authentication-method]]
- [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]
