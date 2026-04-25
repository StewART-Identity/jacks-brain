---
title: "eDirectory / IDTREE"
summary: "Micro Focus eDirectory deployment at UNT System; the central LDAP identity store and source of truth for 72,000+ user accounts."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - edirectory
  - ldap
  - directory-service
  - identity
  - iam
  - unt-system
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

IDTREE is the [[collection/entities/unt-system-iam|UNT System IAM]] deployment of Micro Focus eDirectory — the central LDAP identity store and source of truth for 72,000+ user accounts. [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers propagate changes from IDTREE outward to [[collection/entities/active-directory|Active Directory]]; IDTREE is always written first in [[collection/concepts/account-lifecycle-management|account lifecycle]] transitions.

## Key Lifecycle Attributes

| Attribute | Purpose |
|-----------|---------|
| `loginDisabled` | Governs eDirectory authentication; `TRUE` blocks direct eDirectory login |
| `untAccountDisabled` | Primary lifecycle signal; when set to `Y`, fires IDM driver change events toward AD |
| `untAccountDisabledDate` | Timestamp of most recent deactivation |
| `untAccountHistory` | Multi-valued, append-only log of all deactivation and reactivation events (Central Time) |
| `untAccountADNoSync` | CSV list of AD domains to block sync to; IDM events for listed domains are vetoed |
| `untAccountIgnore` | When `Y`, excludes user from all ALMA processing (double-enforced) |
| `untAccountOverride` | When `Y`, exempts user from inactivity deactivation regardless of affiliation status |
| `untAccountEnabled` | Legacy attribute being removed from driver filter in a planned driver cleanup |

## Role in Account Lifecycle

In [[collection/entities/alma|ALMA]]'s deactivation workflow, IDTREE is written first (`loginDisabled=TRUE`, `untAccountDisabled=Y`), then IDM drivers are given time to propagate to AD. `untAccountADNoSync` is set last — only after verification confirms all downstream systems reflect the expected state — acting as a sync lock that prevents subsequent IDM events from undoing the deactivation.

During reactivation, `untAccountDisabled` is set to `N` rather than deleted; IDM requires an actual change event, and a deletion would not reliably trigger one. Because `untAccountADNoSync` is still set at reactivation start, AD is re-enabled directly by ALMA rather than via IDM propagation. The nosync flag is deleted last, after verification.

## Relationship to Active Directory

IDTREE is the authoritative source; [[collection/entities/active-directory|AD]] is a downstream consumer. Changes in IDTREE flow to AD via IDM drivers, subject to the `VetoADNoSyncEvents` transformation that respects `untAccountADNoSync`. See [[collection/concepts/identity-propagation|identity propagation]] for the flow details.
