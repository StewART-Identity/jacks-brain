---
title: "Identity Propagation"
summary: "Async flow of identity state from a source directory to downstream systems via sync drivers; creates timing and consistency challenges."
type: concept
created: 2026-04-25
updated: 2026-04-26
tags:
  - identity-propagation
  - directory-sync
  - idm
  - iam
  - consistency
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

Identity propagation is the flow of identity state changes from a source-of-truth directory to downstream identity systems via synchronization drivers. Because propagation is asynchronous, there is an inherent window during which systems are in inconsistent states — and any workflow that spans multiple systems must account for this.

## How IDM Drivers Propagate Changes

In the [[collection/entities/unt-system-iam|UNT System]] identity infrastructure, [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers listen on subscriber channels. When an attribute like `untAccountDisabled` changes in [[collection/entities/edirectory-idtree|IDTREE]], each driver fires a change event. That event passes through output and event transformations before reaching [[collection/entities/active-directory|Active Directory]]:

- **DeactivateAccounts output transformation**: strips the event to only the attributes that should flow to AD (`dirxml-uACAccountDisable=true`, `description`), preventing attribute leakage.
- **VetoADNoSyncEvents event transformation**: reads `untAccountADNoSync`; if the user's domain is listed, the entire event is vetoed before it reaches AD.

## The Wait Phase

[[collection/entities/alma|ALMA]]'s three-phase workflows include an explicit wait step between writing to IDTREE and verifying downstream state (`BATCH_PAUSE_TIME`, default 30 seconds). This is a pragmatic acknowledgment that asynchronous propagation cannot be forced to complete synchronously — only observed. The wait creates a window in which propagation is likely to complete; the verification step confirms whether it actually did.

## The Sync Lock Pattern

After propagation is verified complete, ALMA sets `untAccountADNoSync` in IDTREE. This engages `VetoADNoSyncEvents`, which vetoes any subsequent IDM events for listed domains. The sync lock solves a subtle problem: after deactivation is verified and considered final, any future change to any other IDTREE attribute (for any reason) could trigger a full-object sync that re-enables the AD account. The lock prevents this.

Setting the sync lock *after* verification (not before) ensures the lock captures a known-good state — both IDTREE and AD agree, and the lock then freezes that agreement.

## Implications for Reactivation

The sync lock creates a deliberate asymmetry in the reactivation workflow. Because `untAccountADNoSync` is still set at reactivation start, IDM drivers are blocked from processing any events for the user's domains. ALMA must therefore re-enable AD accounts directly in Phase 1, bypassing the normal propagation path. The sync lock is removed last, after all systems are verified active, which restores normal IDM operation.

## Driver Configuration and Propagation Behavior

The transformations that govern propagation are defined in the IDM driver configuration. Changes to driver policies — such as which attributes are included in the filter or output transformation — are applied via the [[collection/concepts/idm-driver-deployment|IDM driver deployment]] workflow in Designer. See [[collection/sources/2026-04-26-driver-migration-husk|Driver Migration Husk — CHG0038717]] for the concrete procedure used to update the HSCAD, UNTAD, and UNTADSTU drivers.

## Relationship to Account Lifecycle Management

Identity propagation is the mechanism through which [[collection/concepts/account-lifecycle-management|account lifecycle management]] state changes become consistent across systems. The trust-but-verify model in ALMA depends on propagation completing before the verification gate runs — and the sync lock mechanism depends on propagation being complete before it engages.
