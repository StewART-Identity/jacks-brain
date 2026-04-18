---
title: "Case Study: Authentication Methods Migration"
type: source
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - iam
  - unt-system
  - entra-id
  - change-management
  - testing
  - incident
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Auth_Methods_Migration-Case_Study--1-.docx)

A retrospective case study examining the January 28, 2026 ADFS → Entra ID migration at [[recall/entities/unt-system]]. Argues that a formal [[recall/concepts/iam-testing-methodology]] and the [[recall/concepts/entra-id-three-tenant-model]] would have prevented every production issue encountered.

## The Incident

On January 28, 2026, the IAM team executed an Enterprise-scope migration from ADFS federation to Entra ID native authentication, with [[recall/entities/cisco-duo]] configured as an [[recall/concepts/external-authentication-method]]. The change affected over 72,000 user accounts across all three UNT System institutions. The migration completed, but multiple undocumented issues required diagnosis and remediation in production.

## Issues Encountered in Production

### Orphaned Authentication Registrations

Deleting an EAM configuration does **not** remove the corresponding registrations from individual user objects. This behavior was documented by neither [[recall/entities/microsoft-entra-id]] nor [[recall/entities/cisco-duo]]. The IAM team built custom PowerShell scripts to scan and clean up all 72,274 affected accounts. See [[recall/concepts/orphaned-authentication-registrations]].

### Authentication Strength Propagation Delays

After updating authentication strength requirements for administrator roles, the changes took longer than expected to propagate. Administrators received unexpected MFA prompts for Microsoft Authenticator despite policy specifying Duo as the required method.

### No Pre-Migration User Audit Guidance

Microsoft's migration documentation addresses tenant-level policy settings but does not mention auditing user-level authentication method registrations. The gap between policy state and user object state was the root cause of the orphaned registrations.

### Undocumented Deletion Behavior

Cisco Duo's documentation covers creating an External Authentication Method in detail but provides no guidance on what happens when one is deleted or what cleanup is required afterward.

## What a Testing Methodology Would Have Caught

The case study argues the change would have been classified as Enterprise scope under the [[recall/concepts/iam-testing-methodology]], requiring all testing phases including a production pilot. Specifically:

- **Pre-migration user audit** — A scan in the staging tenant would have revealed the relationship between EAM configuration and user-level registrations before production.
- **Full lifecycle functional testing** — Testing create, modify, and delete of the EAM configuration (not just "Duo works") would have exposed the orphaned registration issue in staging.
- **Regression testing** — Structured regression across administrator MFA prompts, authentication strengths, and [[recall/concepts/conditional-access-policy|Conditional Access]] policies would have caught the propagation timing issue.
- **Production pilot (500–1,000 users)** — A controlled pilot across all institutions would have provided early warning before the full 72,000-user cutover.

## What Dedicated Test Environments Would Have Provided

Under the [[recall/concepts/entra-id-three-tenant-model]]:

- **Staging tenant (myunttest):** Full end-to-end migration including de-federation, Duo EAM configuration, user registration, deletion, and cleanup with 1,000 test users — every production issue would have been discovered here instead.
- **Greenfield tenant (myuntsrc):** Post-migration state comparison against the greenfield baseline to confirm no unexpected configuration artifacts remained, providing confidence independent of incomplete vendor documentation.

## The Before/After Comparison

| | What Happened | What Could Have Happened |
|---|---|---|
| **Where issues were found** | Production, affecting all users | Staging tenant, affecting no users |
| **Orphaned registrations** | Discovered after go-live; required emergency scripting for 72,274 accounts | Discovered during functional lifecycle testing in staging; cleanup documented before go-live |
| **Admin MFA prompts** | Reported by administrators after cutover; required investigation | Identified during regression testing; propagation timing documented in rollout plan |
| **User disruption** | Authentication issues experienced during production remediation | No production impact; all issues resolved before deployment |

## Conclusion

The IAM team resolved every issue; the tools and scripts developed are now part of the team's operational toolkit. The case study's argument: without investment in testing process and infrastructure, this pattern of production-discovered undocumented behaviors will repeat with every major Entra ID project over the next four years of the university's migration roadmap.

## Related Pages

- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/entities/unt-system]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
