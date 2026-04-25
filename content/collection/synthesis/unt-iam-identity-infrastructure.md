---
title: "UNT IAM Identity Infrastructure"
summary: "How eDirectory, IDM drivers, Active Directory, Cisco Duo, and ALMA form an integrated account lifecycle system at UNT System."
type: synthesis
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - unt-system
  - account-lifecycle
  - identity-infrastructure
  - synthesis
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

The UNT System IAM infrastructure is not a collection of independent systems — it is a layered pipeline with a defined source of truth, asynchronous propagation paths, and a carefully sequenced lifecycle orchestration layer. Understanding how the parts interlock explains why [[collection/entities/alma|ALMA]] is designed the way it is.

## The Topology

```
EIS (PeopleSoft)     ← eligibility checks
        ↓
eDirectory (IDTREE)  ← source of truth for all identity state
        ↓ (async, via IDM drivers: HSCAD / UNTAD / UNTADSTU)
Active Directory     ← three domains: HSC, STUDENTS, UNT
        ↓
Cisco Duo            ← MFA layer (separate API, not IDM-driven)
```

[[collection/entities/edirectory-idtree|eDirectory (IDTREE)]] is the authoritative source. Changes always flow outward from IDTREE — never inward from AD or Duo. [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers are the propagation mechanism. [[collection/entities/cisco-duo|Cisco Duo]] sits outside the IDM path entirely and is managed directly via its Admin API.

## Why ALMA's Three-Phase Design Exists

The architecture has two properties that together mandate a phased workflow:

1. **IDM drivers are asynchronous**: a write to IDTREE does not immediately appear in AD. There is a processing delay of unknown duration.
2. **The sync path can be locked**: `untAccountADNoSync` + `VetoADNoSyncEvents` can prevent all subsequent IDM events from reaching AD.

A naive two-step deactivation (disable IDTREE → lock sync) risks locking before propagation completes, leaving AD in an enabled state permanently. ALMA's solution: write → wait → verify (confirm AD is actually disabled) → lock. The verification gate is what makes the lock safe to set.

## The Sync Lock as a Consistency Invariant

`untAccountADNoSync` is not just a deactivation tool — it is a consistency mechanism. Once set, it guarantees that no future IDTREE change (for any unrelated attribute) can trigger a sync that re-enables AD. This prevents a class of subtle bugs: an administrative attribute update, a group membership change, or any other IDM-observed event that would normally trigger a full object sync.

The invariant is: *`untAccountADNoSync` is set if and only if the account is deactivated and all downstream systems have been verified to reflect that state.*

## Connection to Authentication Flows

When ALMA disables an AD account (clears `userAccountControl` bit 2 to `true`), it directly revokes the user's ability to authenticate in any protocol that uses AD as a credential store. This includes:

- **[[collection/concepts/saml|SAML]] SSO flows** where the IdP validates credentials against AD — the IdP will reject authentication attempts for disabled accounts before issuing any assertion.
- **[[collection/concepts/oauth|OAuth]] flows** where the Authorization Server uses AD for user validation — token issuance will fail.

Account lifecycle management is therefore the enforcement layer beneath the authentication protocols. A correctly configured SAML IdP or OAuth Authorization Server provides no access control benefit if the underlying directory does not reflect the intended user state. ALMA is what keeps that underlying state correct at scale.

## ALMA as Orchestration, Not Direct Writer

ALMA never writes directly to AD or Duo. Every operation goes through `iam-apis`, the FastAPI intermediary. This design choice has several implications:

- **Auditability**: all operations are logged at the API layer, not scattered across direct LDAP and REST calls.
- **Testability**: dry-run mode (`--commit` flag) can run the full decision logic without any actual writes — the API suppresses the effects.
- **Replaceability**: the orchestration logic (ALMA) and the execution layer (`iam-apis`) can evolve independently.

## Contrasting with Previous Tooling

ALMA v2 replaces three separate tools with divergent behaviors. The key architectural improvement is not speed or simplicity — it is *observability*. Each phase of the workflow has explicit state checks (the verification endpoints) that confirm the expected state before the workflow advances. The three-tool predecessor had no such gate; partial propagation could go undetected.

See [[collection/entities/alma|ALMA]], [[collection/concepts/account-lifecycle-management|account lifecycle management]], and [[collection/concepts/identity-propagation|identity propagation]] for individual component details. See [[collection/sources/2026-04-25-alma-v2-technical-reference|ALMA v2 Technical Reference]] for the authoritative source.
