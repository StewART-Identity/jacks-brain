---
title: "OpenText Identity Manager"
summary: "IDM platform with three drivers (HSCAD, UNTAD, UNTADSTU) synchronizing eDirectory identity state to Active Directory domains at UNT System."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - idm
  - opentext
  - netiq
  - identity-sync
  - iam
  - unt-system
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

OpenText Identity Manager (formerly NetIQ IDM) is the identity synchronization platform at [[collection/entities/unt-system-iam|UNT System IAM]]. It runs three drivers that asynchronously synchronize identity state from [[collection/entities/edirectory-idtree|eDirectory (IDTREE)]] to [[collection/entities/active-directory|Active Directory]]:

| Driver | Target Domain |
|--------|--------------|
| HSCAD | HSC |
| UNTAD | UNT |
| UNTADSTU | STUDENTS |

## Driver Behavior

Drivers operate on subscriber channels. When `untAccountDisabled=Y` is set in IDTREE, each driver fires a change event that flows through two transformations before reaching AD:

**DeactivateAccounts output transformation** — strips the event down to only `dirxml-uACAccountDisable=true` and `description`. This prevents extraneous IDTREE attributes from leaking into AD during a deactivation event.

**VetoADNoSyncEvents event transformation** — reads the `untAccountADNoSync` attribute on the user object. If the user's domain appears in that CSV list, the entire event is vetoed, blocking all subsequent synchronization for that domain. This is how [[collection/entities/alma|ALMA]] prevents unintended account recreation in AD after deactivation is verified.

## Role in Account Lifecycle

IDM drivers are asynchronous — they cannot be forced to complete synchronously. This creates the need for an explicit wait phase in ALMA's three-phase workflows: ALMA writes to IDTREE, waits for `BATCH_PAUSE_TIME` seconds (default: 30), then verifies AD state before proceeding. See [[collection/concepts/identity-propagation|identity propagation]] for the broader pattern this represents.

During reactivation, `untAccountADNoSync` is still set (locking the drivers out), so ALMA re-enables AD accounts directly rather than relying on IDM propagation. The nosync flag is deleted last, after all systems are verified active, which restores normal IDM operation.

## Planned Driver Cleanup

A one-time modification will remove `Login Disabled` and `untAccountEnabled` from the driver filter and output transformation policies. After this change, `loginDisabled` is localized to IDTREE (governing eDirectory authentication only) and `untAccountDisabled` becomes the sole signal that flows through drivers to AD.
