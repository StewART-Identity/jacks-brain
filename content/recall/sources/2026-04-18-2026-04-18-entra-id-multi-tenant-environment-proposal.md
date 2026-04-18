---
title: "Entra ID Multi-Tenant Environment Proposal"
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

# Entra ID Multi-Tenant Environment Proposal

[Download original](/originals/2026-04-18-Entra_ID_Multi-Tenant_Environment_Proposal.docx)

**Prepared by:** [[recall/entities/jack-stewart]] | IAM Engineer, [[recall/entities/unt-system]] Identity and Access Management
**Date:** February 2026 (v1.0 drafted 2026-02-13)
**Classification:** Internal

## Overview

A formal proposal requesting two persistent, licensed [[recall/entities/microsoft-entra-id]] tenants to complement the existing production tenant. Together, the three tenants provide testing, staging, and baseline comparison environments for [[recall/entities/unt-system]] IAM infrastructure projects.

## Background: The January 2026 Migration

The January 28, 2026 ADFS → Entra ID migration (affecting 72,000+ users) exposed several undocumented behaviors that had to be troubleshot in production:

- Deleting an [[recall/concepts/external-authentication-method]] configuration does **not** remove EAM registrations from individual user objects — leaving orphaned entries on all 72,274 accounts, requiring custom PowerShell cleanup.
- Neither Microsoft nor [[recall/entities/cisco-duo]] documentation addressed auditing user-level authentication method registrations before migration.
- The migration status setting operates at the **tenant policy level**, but actual user authentication state exists at the **individual object level** — a disconnect that produced unexpected behavior.
- Administrators experienced unexpected MFA prompts from authentication strength configurations that required unpredictable propagation time.

The IAM team resolved all issues but was forced to troubleshoot against production with real users experiencing disruptions.

## Inherited Configuration Risk

The production tenant contains security configurations set by previous administrators. Without documentation of intent, the team cannot determine whether existing settings represent deliberate decisions, defaults, or drift. A greenfield tenant provides the definitive reference: "Is this a setting we configured, or is it what Microsoft delivers by default?"

## Proposed Three-Tenant Model

See [[recall/concepts/entra-id-three-tenant-model]] for the full architectural concept.

| Tenant | Domain | Purpose | Licensed Users |
|--------|--------|---------|----------------|
| Production (myunt) | myunt.onmicrosoft.com | Live identity services | 72,000+ (existing) |
| Staging (myunttest) | myunttest.onmicrosoft.com | Pre-production testing | 1,000 |
| Greenfield (myuntsrc) | myuntsrc.onmicrosoft.com | Microsoft default baseline (read-only) | 100 |

All three tenants require Entra ID P2 licensing to test P2-dependent features: [[recall/concepts/conditional-access-policy|Conditional Access]], [[recall/concepts/privileged-identity-management]], Identity Protection, and access reviews.

### Why P2 for Staging

Testing P2-dependent features (risk-based CA, PIM, Identity Protection) against a P1 or free tenant produces incomplete validation and a false sense of readiness.

### Why the Greenfield Must Be Persistent

A greenfield recreated from a trial cannot guarantee identical defaults — Microsoft regularly updates default tenant settings. A persistent greenfield created at a known point in time provides a stable, documentable reference.

## The Case for Persistent Environments

Microsoft 30-day P2 trials are inadequate for ongoing infrastructure testing because:

1. **Project timelines exceed trial periods** — The authentication methods migration spanned September 2025 through February 2026 (five months). Future projects will be similar or longer.
2. **Continuity between projects** — Destroying and recreating staging state for each project wastes engineering time and risks reconstruction errors.
3. **Greenfield integrity** — Expired and recreated tenants may not reproduce identical defaults.
4. **Operational readiness** — Under a production incident, provisioning a trial tenant and recreating config state is not viable. Persistent environments allow troubleshooting within minutes.

## Integration with IAM Testing Methodology

The proposal explicitly provides the infrastructure required to execute the [[recall/concepts/iam-testing-methodology]]:

- **Greenfield (myuntsrc):** Planning phase — compare proposed changes against known defaults.
- **Staging (myunttest):** Smoke, functional, and regression testing before production deployment.
- **Production (myunt):** Receives changes only after successful staging validation with documented results and required approvals.

## Cost Estimate

Based on Microsoft Entra ID P2 pricing of $9.00/user/month (may be reduced via UNT System enterprise agreement or educational pricing):

| Tenant | Users | Monthly | Annual |
|--------|-------|---------|--------|
| Staging (myunttest) | 1,000 | $9,000 | $108,000 |
| Greenfield (myuntsrc) | 100 | $900 | $10,800 |
| **Total New Cost** | **1,100** | **$9,900** | **$118,800** |

## Projected Four-Year Use Cases

- [[recall/concepts/conditional-access-policy|Conditional Access]] policy redesign across all three institutions
- [[recall/concepts/privileged-identity-management|Privileged Identity Management (PIM)]] rollout for administrative roles
- Enterprise application migration from on-premises auth to Entra ID SSO
- Identity Protection policy tuning and risk-based CA implementation
- Potential migration from Entra Connect Sync to Entra Cloud Sync
- Access reviews for FERPA and HIPAA compliance
- Integration of additional Entra-based services

## Recommendations

1. Provision `myuntsrc.onmicrosoft.com` as a persistent greenfield baseline with 100 Entra ID P2 licenses.
2. Upgrade existing `myunttest.onmicrosoft.com` from free to Entra ID P2 with 1,000 licensed users.
3. Establish operational policies designating myuntsrc as read-only and myunttest as the mandatory pre-production validation environment.

## Related Pages

- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/unt-system]]
- [[recall/entities/jack-stewart]]
- [[recall/entities/cisco-duo]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/privileged-identity-management]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/conditional-access-policy]]
