---
title: "ALMA v2 Technical Reference"
summary: "Technical reference for ALMA v2, the Python system automating account lifecycle across 72,000+ UNT identities in eDirectory, AD, and Duo."
type: source
created: 2026-04-25
updated: 2026-04-25
tags:
  - alma
  - account-lifecycle
  - iam
  - edirectory
  - active-directory
  - duo
  - unt-system
role: reference
views:
  - date: 2026-04-25
    note: "Initial cataloging."
sources: []
confidence: high
---

[Download original](/api/originals/2026-04-25-ALMA_v2_Technical_Reference.docx)

ALMA v2 (Account Lifecycle Management Application) is a Python system running on `iam-script-gab` that automates deactivation and reactivation of user accounts across the [[collection/entities/unt-system-iam|UNT System IAM]] identity infrastructure. It manages 72,000+ accounts across [[collection/entities/edirectory-idtree|eDirectory (IDTREE)]], three [[collection/entities/active-directory|Active Directory]] domains (HSC, STUDENTS, UNT), and [[collection/entities/cisco-duo|Cisco Duo MFA]].

All directory and service operations are mediated through `iam-apis`, a FastAPI service on `iam-app-gab` over HTTPS (port 8443). ALMA never writes directly to AD or Duo.

## System Architecture

`iam-apis` provides HTTP Basic Authentication against eDirectory and exposes discrete endpoints for each workflow phase. EIS (PeopleSoft) databases are queried for affiliation checks during eligibility determination.

Three [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers (HSCAD, UNTAD, UNTADSTU) synchronize identity state from eDirectory to Active Directory asynchronously. The `DeactivateAccounts` output transformation strips change events to only `dirxml-uACAccountDisable=true` and `description`, preventing extraneous attributes from leaking into AD. The `VetoADNoSyncEvents` event transformation reads `untAccountADNoSync`; if a user's domain appears in that CSV list, the event is vetoed, blocking all subsequent synchronization.

## API Endpoints

All endpoints follow `POST /api/users/{euid}/...` and accept a `dry_run` query parameter.

**Deactivation**

| Endpoint | Action |
|----------|--------|
| `/deactivate/inactivity` | Sets IDTREE disable attributes, appends to `untAccountHistory` |
| `/duo/delete` | Deletes Duo account, removes from `DuoUsers` and `ECS-DUO-Users` |
| `/verify/inactivity` | Reads all systems; if verified, sets `untAccountADNoSync=HSC,STUDENTS,UNT` |

**Reactivation**

| Endpoint | Action |
|----------|--------|
| `/reactivate/inactivity` | Deletes IDTREE disable attributes, sets `untAccountDisabled=N`, appends history |
| `/reactivate/ad` | Clears `userAccountControl` bit 2, sets description in HSC/STUDENTS/UNT |
| `/verify/reactivation` | Reads all systems; if verified, deletes `untAccountADNoSync` |

## Deactivation Workflow

ALMA follows a trust-but-verify model with three explicit phases. See [[collection/concepts/account-lifecycle-management|account lifecycle management]] for the conceptual framing; [[collection/concepts/identity-propagation|identity propagation]] explains why the wait phase is necessary.

**Phase 1 — Deactivate + Duo**

Each step is gated by a feature flag:
- **IDTREE deactivation** (`DEACTIVATE_ENABLED`): sets `loginDisabled=TRUE`, `untAccountDisabled=Y`, `untAccountDisabledDate`, and `description`. Description text matches the `untAccountHistory` entry (e.g., `ALMA: Deactivated 2026-03-16 09:15:22 (742 days inactive)`).
- **Duo deletion** (`DUO_ENABLED`): deletes user from Duo Admin API, removes from `DuoUsers` in UNT domain and `ECS-DUO-Users` in AD forest root.

**Phase 2 — Wait**

ALMA pauses for `BATCH_PAUSE_TIME` seconds (default: 30) to allow IDM drivers to propagate the deactivation to AD. `BATCH_WAIT_SECONDS` separately controls inter-batch pacing within Phase 1.

**Phase 3 — Verify and Lock Down**

The verification endpoint reads all five systems (IDTREE + three AD domains + Duo). Only when all five confirm deactivation does it set `untAccountADNoSync=HSC,STUDENTS,UNT`. `VetoADNoSyncEvents` then blocks all subsequent IDM events from reaching AD, preventing unintended account recreation.

## Reactivation Workflow

Reactivation mirrors deactivation with one key asymmetry: because `untAccountADNoSync` is still set at the start of reactivation, AD accounts must be re-enabled directly — the IDM drivers are blocked. The nosync flag is deleted only after verification.

**Phase 1 — Reactivate IDTREE + AD**

- **IDTREE reactivation**: deletes `loginDisabled`, `description`, `untAccountDisabledDate`, `untAccountEnabled`. Sets `untAccountDisabled=N` (set, not deleted — IDM needs the change event). Appends to `untAccountHistory`.
- **AD reactivation (direct)**: for HSC, STUDENTS, and UNT, clears `userAccountControl` bit 2 and sets description to "givenName sn" (read from IDTREE).

**Phase 2 — Wait**

ALMA pauses for `BATCH_PAUSE_TIME` seconds.

**Phase 3 — Verify and Restore Sync**

Reads IDTREE (confirms `loginDisabled` absent and `untAccountDisabled=N`) and all three AD domains (confirms `userAccountControl` bit 2 cleared). If all pass, deletes `untAccountADNoSync`, restoring normal IDM synchronization. Duo is **not** re-enrolled automatically — the user must re-register.

## Account History

Every deactivation and reactivation appends a timestamped entry to the multi-valued `untAccountHistory` attribute in eDirectory (US Central Time). The same text is written to `description` during deactivation. Entry prefixes identify the originating tool:

| Prefix | Source |
|--------|--------|
| `ALMA:` | Inactivity-driven deactivation/reactivation |
| `ADMINISTRATIVE:` | Manual administrative action |
| `EMERGENCY:` | Emergency action |

A user deactivated by ALMA may be reactivated administratively, producing a mixed history that accurately reflects the full account lifecycle.

## Feature Flags and Dry Run

| Flag | Controls |
|------|---------|
| `DEACTIVATE_ENABLED` | IDTREE deactivation |
| `DUO_ENABLED` | Duo deletion and group cleanup |
| `REACTIVATE_ENABLED` | Reactivation |

The `--commit` flag (`dry_run`) is orthogonal to feature flags: when a code path executes, the full logic runs (lookups, logging, decisions), but actual LDAP writes and Duo API deletes are suppressed without `--commit`. This allows progressive production enablement: observe in dry-run first, then commit.

## Safety Guards

- **`untAccountIgnore=Y`**: double-enforced exclusion — at the LDAP search filter level (excluded from candidate discovery) and at the application eligibility check (rejected if reached by any other path).
- **`untAccountOverride=Y`**: exempt from inactivity deactivation even with no active affiliations. Checked during eligibility determination.

## Planned Driver Cleanup

A one-time driver modification will remove `Login Disabled` and `untAccountEnabled` from the driver filter and output transformation policies. This localizes `loginDisabled` to IDTREE (where it governs eDirectory authentication only) and makes `untAccountDisabled` the sole signal flowing through drivers to AD.
