---
title: "Entra ID Multi-Tenant Environment Proposal (re-read 2026-04-19)"
type: source
created: 2026-04-19
updated: 2026-04-19
tags:
  - identity
  - entra-id
  - iam
  - unt-system
  - testing
  - infrastructure
  - change-management
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Entra_ID_Multi-Tenant_Environment_Proposal.docx)

**Prepared by:** [[recall/entities/jack-stewart]] | IAM Engineer, [[recall/entities/unt-system]] Identity and Access Management
**Date:** February 2026 (v1.0 drafted 2026-02-13) · **Re-read:** 2026-04-19

Second reading of the [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal|Entra ID Multi-Tenant Environment Proposal]]. This read surfaces the documentation reliability argument as the deepest justification for the greenfield tenant, the inherited configuration risk problem, the FERPA/HIPAA compliance driver embedded in the four-year roadmap, and the operational readiness framing that makes persistent environments about incident response — not just pre-production testing.

## Documentation Unreliability as the Core Greenfield Justification

The first reading of this document framed the greenfield tenant primarily as a tool for comparing production settings against known defaults. The second reading reveals a sharper argument: **the greenfield is necessary precisely because Microsoft's documentation cannot be trusted to accurately describe those defaults**.

The proposal states this explicitly:

> "Without a P2 greenfield, the team would need to rely on Microsoft documentation to determine defaults. However, the authentication methods migration demonstrated that Microsoft's documentation does not always accurately reflect actual tenant behavior, particularly around user-object-level configurations versus tenant-policy-level settings."

This is not a general caution about documentation being incomplete — it is a specific claim, backed by the January 2026 migration incident, that Microsoft's documentation actively misrepresented how the tenant behaves. Neither the [[recall/concepts/orphaned-authentication-registrations|EAM deletion behavior]] nor the tenant-policy vs. user-object disconnect appeared in any official documentation. The greenfield provides an empirical answer when documentation fails.

## Inherited Configuration Risk: The Provenance Problem

Section 2.2 articulates a distinct problem not fully captured in the first read: the current production tenant contains security configurations set by **previous administrators** whose decisions are undocumented.

The proposal frames this as a provenance problem: "the IAM team cannot determine with confidence whether existing settings represent deliberate security decisions, default configurations, or configuration drift."

This matters for auditing and for risk management. Before you can decide whether to retain, modify, or remove a setting, you need to know what the alternative is. Without a greenfield, the IAM team must rely on documentation (unreliable, as established above) or judgment (which cannot distinguish default from intentional). The greenfield eliminates this ambiguity by providing a known baseline created at a documented point in time.

The practical question the greenfield answers: *"Is this setting something we configured, or is it what Microsoft delivers by default?"*

## Greenfield as a Versioned Configuration Snapshot

The proposal describes the greenfield not just as a static reference but as a **versioned artifact**:

> "A persistent greenfield created at a known point in time provides a stable reference that can be documented and versioned."

This is a subtle but important distinction. Microsoft regularly updates default tenant settings. A greenfield created from a 30-day trial, allowed to expire, and then recreated cannot guarantee that the new defaults match the original. A persistent greenfield created at a specific date — and never modified — represents a stable snapshot of what Microsoft shipped at that moment, comparable across time.

This has practical implications for long-running projects: a Conditional Access redesign spanning 2026–2027 needs a consistent baseline throughout, not one that shifts with each Microsoft policy update.

## Operational Readiness: Persistent Environments as Incident Response Infrastructure

The first read emphasized pre-production testing as the primary value of persistent environments. Section 4.4 reveals a second, equally important use case: **production incident response**.

> "When a production issue arises — as it did during the authentication methods migration — the IAM team needs immediate access to a functional test environment. Provisioning a new trial tenant, activating licenses, and recreating configuration state under the pressure of a production incident is not viable. Persistent environments ensure the team can begin troubleshooting and validating fixes within minutes."

The January 2026 migration forced troubleshooting against production because no persistent staging environment existed. Under the proposed model, the next incident would have an immediately available staging tenant — pre-configured to mirror production — where fixes can be validated before touching the live environment.

This reframes persistent environments from a planning asset to an **incident response asset**: their value is highest when time is shortest.

## FERPA/HIPAA Compliance as a Roadmap Driver

The four-year project roadmap (Section 7) includes one item with explicit regulatory grounding:

> "Access reviews implementation for compliance with FERPA and HIPAA requirements."

This is the only mention of specific regulatory compliance across all ingested [[recall/entities/unt-system]] IAM documents. It establishes that the identity infrastructure roadmap is not purely operational — there are external compliance obligations that create non-discretionary project timelines. Access reviews in [[recall/entities/microsoft-entra-id]] are a P2 feature, which is one of the reasons the staging tenant requires P2 licensing: you cannot test access review workflows against a free or P1 tenant.

## The Four Reasons for Persistent Environments (Structured)

Section 4 provides a structured argument worth preserving in full:

| Reason | Core Claim |
|--------|-----------|
| Project timelines exceed trial periods | The January 2026 migration spanned September 2025–February 2026. Future projects will be comparable or longer. 30-day trials cannot support multi-month workstreams. |
| Continuity between projects | Staging state reflects the current production environment. Destroying and recreating it wastes engineering time and risks reconstruction errors. |
| Greenfield integrity | Expired/recreated tenants cannot guarantee identical defaults. A persistent greenfield at a known creation date provides a stable, versionable reference. |
| Operational readiness | Under a production incident, you cannot provision a trial tenant and recreate config state in real time. Persistent environments allow immediate access. |

These four reasons together make the case that **persistent infrastructure is operationally different in kind from temporary trials** — not just more convenient.

## Cost and Enterprise Agreement Context

The proposal estimates new licensing cost at $9,900/month ($118,800/year) based on list price of $9.00/user/month. It explicitly notes that this may be reducible through UNT System's existing Microsoft enterprise agreement or educational pricing, and recommends procurement consultation before budget finalization.

| Tenant | Users | Monthly | Annual |
|--------|-------|---------|--------|
| Staging (myunttest) | 1,000 | $9,000 | $108,000 |
| Greenfield (myuntsrc) | 100 | $900 | $10,800 |
| **Total New Cost** | **1,100** | **$9,900** | **$118,800** |

The 100-user greenfield allocation is the minimum to activate all P2 feature surfaces. The 1,000-user staging allocation provides a representative population for group-scoped [[recall/concepts/conditional-access-policy|Conditional Access]] policy testing.

## Related Pages

- [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/privileged-identity-management]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/mfa-fail-open-fail-closed]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/unt-system]]
- [[recall/entities/jack-stewart]]
- [[recall/entities/cisco-duo]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
