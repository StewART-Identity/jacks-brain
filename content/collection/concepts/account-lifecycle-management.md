---
title: "Account Lifecycle Management"
summary: "Discipline of managing user accounts through deactivation and reactivation, ensuring consistent state across all connected identity systems."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - account-lifecycle
  - iam
  - deactivation
  - reactivation
  - identity
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
  - "[[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Account lifecycle management (ALM) is the discipline of systematically managing user accounts through the transitions that matter for security: deactivation when a user becomes inactive, and reactivation when they return. In a multi-system identity infrastructure, the challenge is ensuring all connected systems reflect consistent state at each transition.

## The Core Problem

A user account typically exists in multiple places simultaneously: a central directory, one or more domain directories, MFA systems, application databases. When a user becomes inactive, all of these must be deactivated together. Inconsistency creates security exposure — an account disabled in the central directory but still active in a domain directory can still be used for authentication in federated flows (see [[collection/concepts/saml|SAML]] and [[collection/concepts/oauth|OAuth]]).

## Trust-but-Verify

[[collection/entities/alma|ALMA]] implements a trust-but-verify model for lifecycle transitions:

1. Write the desired state change to the authoritative source ([[collection/entities/edirectory-idtree|IDTREE]])
2. Allow asynchronous [[collection/concepts/identity-propagation|propagation]] to downstream systems (IDM drivers → AD)
3. Verify that all downstream systems reflect the expected state
4. Only then lock down the state (set `untAccountADNoSync`) to prevent reversion

The verification gate catches the most common failure mode — a system that appears to have received the change but where propagation was incomplete — before that state is considered final.

## The Sync Lock

`untAccountADNoSync` is the mechanism that prevents IDM drivers from undoing a completed deactivation. Once set, any IDM change event for a listed domain is vetoed by the `VetoADNoSyncEvents` transformation. This means:

- A subsequent unrelated attribute change in IDTREE cannot trigger a full sync that re-enables the AD account
- Race conditions between ALMA operations and ongoing directory activity are blocked

The sync lock is always the **last** step in deactivation, and the **last** thing removed in reactivation.

## Deactivation vs. Reactivation Asymmetry

Reactivation is not simply the reverse of deactivation. Because `untAccountADNoSync` is still set at the start of reactivation (locking IDM drivers out), [[collection/entities/active-directory|Active Directory]] accounts must be re-enabled directly by ALMA rather than via normal IDM propagation. The sync lock is only deleted after all systems are verified active.

This asymmetry is a deliberate consequence of using the sync lock as a safety mechanism: the lock enforces sequential, observable state transitions rather than allowing concurrent operations that could produce inconsistent intermediate states.

## Feature Flags and Dry Run

ALMA separates two orthogonal safety dimensions:

- **Feature flags** (`DEACTIVATE_ENABLED`, `DUO_ENABLED`, `REACTIVATE_ENABLED`): control which code paths are active at all. Used to enable capabilities independently in production.
- **`--commit` flag** (`dry_run`): controls whether actual writes happen when a code path executes. Full logic runs (lookups, logging, decisions) — only LDAP writes and Duo API deletes are suppressed.

This allows progressive production enablement: observe in dry-run first to validate decisions, then commit.

## Safety Guards

| Guard | Mechanism | Enforcement Level |
|-------|-----------|------------------|
| `untAccountIgnore=Y` | Excluded from candidate discovery | LDAP search filter + application eligibility check |
| `untAccountOverride=Y` | Exempt from inactivity deactivation | Application eligibility check |

`untAccountIgnore` is double-enforced: it operates at the LDAP search filter level (the user never enters the processing queue) and again at the application level (rejected if somehow reached by another path). This defense-in-depth approach prevents both accidental and programmatic bypass.

## Scope Boundary: Lifecycle vs. Deprovisioning

Account lifecycle management (as implemented by [[collection/entities/alma|ALMA]]) is scoped to **inactivity**: users who have stopped using their accounts but retain an organizational relationship. It is explicitly reversible — every deactivation has a corresponding reactivation path.

[[collection/concepts/deprovisioning|Deprovisioning]] is the adjacent but distinct discipline of handling **permanent separation**: terminated, retired, or unaffiliated users who will not return. These operations — deleting [[collection/entities/cisco-duo|Duo]] accounts, purging stale [[collection/entities/edirectory-idtree|IDTREE]] role attributes, disabling [[collection/entities/active-directory|AD]] accounts for separated employees — are not part of ALMA's scope and are handled by separate tooling. At UNT System, this tooling (in `dstools`) was never fully activated, creating a gap documented in the [[collection/sources/2026-04-25-iam-brief-deprovisioning-gap-analysis|Deprovisioning Gap Analysis]]. See [[collection/synthesis/unt-iam-deprovisioning-gap|UNT IAM Deprovisioning Gap]] for the cross-cutting analysis.
