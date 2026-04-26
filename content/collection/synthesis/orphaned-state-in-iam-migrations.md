---
title: "Orphaned State in IAM Migrations"
summary: "Deleting IAM configurations doesn't clean up residue on dependent objects — a pattern found in both IDM driver and Entra ID migrations at UNT System."
type: synthesis
created: 2026-04-25
updated: 2026-04-25
tags:
  - iam
  - migration
  - unt-system
  - patterns
  - operations
sources:
  - "[[collection/sources/2026-04-25-authentication-methods-migration-summary]]"
  - "[[collection/sources/2026-04-25-driver-migration-husk]]"
confidence: medium
---

Two sources in the wiki — an IDM driver migration runbook and an executive summary of a Microsoft authentication methods migration — independently surface the same operational pattern: **deleting a configuration does not clean up its residue on dependent objects**. Left unaddressed, orphaned state causes silent divergence between what administrators believe is configured and what is actually running.

## Instances

### IDM Driver Migration: The Husk Pattern

[[collection/sources/2026-04-25-driver-migration-husk]] documents a workflow built around this problem: the delete-import-compare-reconcile-deploy pattern described in [[collection/concepts/idm-driver-migration]]. The driver is deleted from the Designer project and replaced with a clean "husk" (a minimal fresh definition). A Live Compare step then surfaces the delta between the incoming husk and the live running configuration, making it explicit and auditable before anything is deployed. The entire pattern exists because simply deleting and reimporting is insufficient — residual state must be reconciled.

### Authentication Methods Migration: Orphaned Registrations

[[collection/sources/2026-04-25-authentication-methods-migration-summary]] documents a more severe instance: deleting an [[collection/concepts/authentication-methods-policy]] configuration in [[collection/entities/microsoft-entra-id]] does not remove authentication method registrations from user objects. Neither Microsoft nor Cisco documents this behavior. [[collection/entities/unt-system]] discovered it post-migration and built custom PowerShell tooling to scan and remediate **72,274 user objects** — no other organization has publicly documented this cleanup.

## Comparison

| Migration | What Was Deleted | What Remained | Discovery | Remediation |
|-----------|-----------------|---------------|-----------|-------------|
| IDM driver | Driver from Designer project | Live driver config on IDM engine | Expected (pattern is designed for it) | Live Compare + selective reconcile |
| Auth Methods | Authentication method configuration | Registrations on 72,274 user objects | Post-migration observation (unexpected) | Custom PowerShell tooling |

## Implications

**Deletion is not cleanup.** In both [[collection/entities/netiq-identity-manager-designer]] and [[collection/entities/microsoft-entra-id]], removing a configuration object does not cascade to the dependent state that referenced it.

**Vendors don't document it.** The IDM husk pattern is an undocumented operational practice; the Entra ID orphaned registration behavior is similarly undocumented. Both were discovered empirically.

**Scale matters.** The IDM case affects a small number of driver configurations. The Entra ID case affected 72,274 user objects — a difference in kind, not just degree.

**Explicit comparison is the mitigation.** The IDM pattern solves this with a Live Compare step that makes residue visible before deployment. The auth methods migration had no such pre-flight — the residue was discovered reactively. A proactive comparison of expected vs. actual registrations before migration would be the analogous mitigation for future Entra ID changes.
