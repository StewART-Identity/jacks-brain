---
title: "ALMA"
summary: "Python system that automates UNT System account deactivation and reactivation across eDirectory, AD, and Duo for 72,000+ users."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - alma
  - account-lifecycle
  - iam
  - python
  - unt-system
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
confidence: high
---

ALMA (Account Lifecycle Management Application) v2 is a Python system running on `iam-script-gab` that automates deactivation and reactivation of user accounts across the [[collection/entities/unt-system-iam|UNT System IAM]] identity infrastructure. It manages 72,000+ accounts across [[collection/entities/edirectory-idtree|eDirectory (IDTREE)]], three [[collection/entities/active-directory|Active Directory]] domains (HSC, STUDENTS, UNT), and [[collection/entities/cisco-duo|Cisco Duo MFA]].

## Architecture

ALMA never writes directly to Active Directory or Duo. All operations are mediated through `iam-apis`, a FastAPI service on `iam-app-gab` over HTTPS (port 8443). `iam-apis` provides HTTP Basic Authentication against eDirectory and exposes discrete endpoints for each lifecycle workflow phase.

## Workflows

ALMA implements [[collection/concepts/account-lifecycle-management|account lifecycle management]] through two mirrored three-phase workflows:

| Phase | Deactivation | Reactivation |
|-------|-------------|--------------|
| 1 | Deactivate IDTREE + delete Duo | Reactivate IDTREE + re-enable AD directly |
| 2 | Wait (allow IDM propagation) | Wait (allow systems to settle) |
| 3 | Verify all systems; set `untAccountADNoSync` | Verify all systems; delete `untAccountADNoSync` |

The wait phase exists because [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers are asynchronous — ALMA must give them time to propagate eDirectory changes to AD before verifying the result. See [[collection/concepts/identity-propagation|identity propagation]] for the broader pattern.

The key asymmetry: during reactivation, `untAccountADNoSync` is still set at the start (locking IDM drivers out), so AD must be re-enabled directly in Phase 1 rather than relying on IDM propagation.

## Design Rationale

ALMA v2 replaces three separate tools with divergent behaviors. The single orchestrated workflow provides observable state at every step and a verification gate that prevents the most common failure mode: incomplete propagation. Feature flags (`DEACTIVATE_ENABLED`, `DUO_ENABLED`, `REACTIVATE_ENABLED`) allow each capability to be enabled independently in production. The `--commit` dry-run flag provides a second layer of safety orthogonal to the feature flags.

See [[collection/sources/2026-04-25-alma-v2-technical-reference|ALMA v2 Technical Reference]] for full endpoint and workflow documentation.
