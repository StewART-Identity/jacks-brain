---
title: "Case Study: Authentication Methods Migration (re-read 2026-04-19)"
type: source
created: 2026-04-19
updated: 2026-04-19
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

A retrospective case study examining the January 28, 2026 ADFS → Entra ID migration at [[recall/entities/unt-system]]. The document's central argument: every production issue encountered could have been caught before go-live if the team had followed a formal [[recall/concepts/iam-testing-methodology]] and had access to the [[recall/concepts/entra-id-three-tenant-model]].

> The original ingest (2026-04-18) is at [[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]. This entry records a second read on 2026-04-19.

## The Incident

On January 28, 2026, [[recall/entities/unt-system]]'s IAM team executed an Enterprise-scope migration from ADFS federation to [[recall/entities/microsoft-entra-id]] native authentication, with [[recall/entities/cisco-duo]] configured as an [[recall/concepts/external-authentication-method]] (EAM). The change affected over 72,000 accounts across all three UNT System institutions. The migration completed but produced four undocumented issues requiring production diagnosis.

## Four Production Issues

### 1. Orphaned Authentication Registrations

Deleting an EAM configuration does **not** cascade to user objects — 72,274 accounts retained stale registration entries. Neither [[recall/entities/microsoft-entra-id]] nor [[recall/entities/cisco-duo]] documented this behavior or the cleanup requirement. The team built custom PowerShell scripts post-go-live to scan and remediate all affected accounts. See [[recall/concepts/orphaned-authentication-registrations]].

### 2. Authentication Strength Propagation Delays

After updating [[recall/concepts/entra-id-authentication-strength|authentication strength]] requirements for administrator roles, changes took longer than expected to propagate. Administrators received unexpected MFA prompts for Microsoft Authenticator despite policy specifying Duo as the required method. See [[recall/concepts/authentication-strength-propagation-delays]].

### 3. No Pre-Migration User Audit Guidance

Microsoft's migration documentation addresses tenant-level policy settings but does not mention auditing user-level authentication method registrations. The gap between policy state and user object state was the root cause of the orphaned registrations.

### 4. Undocumented Deletion Behavior

[[recall/entities/cisco-duo]]'s documentation covers creating an EAM in detail but provides no guidance on deletion consequences or post-deletion cleanup.

## Testing Methodology Mapping

The case study performs a point-by-point mapping of each issue to a testing phase that would have caught it:

| Production Issue | Testing Phase | Outcome With Testing |
|-----------------|---------------|---------------------|
| Orphaned registrations | Full lifecycle functional testing (create + modify + delete EAM) | Cleanup procedure documented before go-live |
| Auth strength propagation delays | Regression testing across admin MFA flows | Propagation timing documented in rollout plan |
| No pre-migration user audit guidance | Pre-migration scan in staging tenant | User-object vs. policy-level gap revealed in staging |
| User disruption during remediation | Production pilot (500–1,000 users) | No production impact; all issues resolved before deployment |

## Test Environment Value Proposition

Under the [[recall/concepts/entra-id-three-tenant-model]]:

- **Staging tenant (myunttest):** Full end-to-end migration — including de-federation, Duo EAM configuration, user registration, deletion, and cleanup with 1,000 test users — would have surfaced every issue before production.
- **Greenfield tenant (myuntsrc):** Post-migration state comparison against the greenfield baseline to confirm no unexpected configuration artifacts, providing confidence independent of incomplete vendor documentation.

## Before / After Comparison

| | What Happened | What Could Have Happened |
|---|---|---|
| **Where issues were found** | Production, affecting all users | Staging tenant, affecting no users |
| **Orphaned registrations** | Emergency scripting for 72,274 accounts post-go-live | Discovered in lifecycle testing; cleanup documented before go-live |
| **Admin MFA prompts** | Reported by administrators post-cutover; required investigation | Identified in regression testing; propagation timing in rollout plan |
| **User disruption** | Authentication issues during production remediation | No production impact |

## Key Contribution

The case study's primary contribution is traceability: it transforms a general argument for "better testing" into a structured, issue-by-issue demonstration where each production failure maps to a named testing control. This is the evidence base for the [[recall/concepts/iam-testing-methodology]]'s value claim and a critical supporting document for the [[recall/synthesis/adfs-migration-incident-driven-iam-maturation|ADFS migration synthesis]].

## Related Pages

- [[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/concepts/authentication-strength-propagation-delays]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/entra-id-authentication-strength]]
- [[recall/entities/unt-system]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
