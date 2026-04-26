---
title: "Driver Migration Husk — CHG0038717"
summary: "Step-by-step runbook for replacing HSCAD, UNTAD, and UNTADSTU IDM drivers in Designer and deploying them live under CHG0038717."
type: source
created: 2026-04-26
updated: 2026-04-26
tags:
  - idm
  - opentext
  - driver-migration
  - runbook
  - unt-system
  - iam
role: reference
views:
  - date: 2026-04-26
    note: "Initial cataloging."
sources: []
confidence: high
---

A procedural runbook for migrating the three [[collection/entities/opentext-identity-manager|OpenText IDM]] drivers — HSCAD, UNTAD, and UNTADSTU — on `dsnr-idpr-app01`. The change is tracked as CHG0038717. Each driver is replaced with an updated definition imported from `I:\changes\drivers\CHG0038717\DRIVER.xml`.

[Download original](/api/originals/2026-04-26-Driver-Migration-Husk.docx)

## Procedure Summary

The same sequence of steps applies to each of the three drivers:

1. **Delete** the existing driver from the Designer project.
2. **Import** the replacement driver from `I:\changes\drivers\CHG0038717\DRIVER.xml`, accepting all defaults.
3. **Live → Compare** to diff the imported definition against the currently deployed driver.
4. **Resolve attributes**: Under the Compare view, select the left-most (import-side) icon for each attribute — except any attribute whose name contains "Password".
5. **Reconcile** the resolved changes.
6. **Live → Deploy** and confirm completion.

See [[collection/concepts/idm-driver-deployment|IDM driver deployment]] for a detailed explanation of the compare-and-reconcile workflow and why passwords are left untouched.

## Relationship to Planned Driver Cleanup

This runbook executes the modification described in the [[collection/entities/opentext-identity-manager|OpenText IDM]] "Planned Driver Cleanup." That change removes `Login Disabled` and `untAccountEnabled` from the driver filter and output transformation policies, leaving `untAccountDisabled` as the sole signal flowing from [[collection/entities/edirectory-idtree|eDirectory (IDTREE)]] through drivers to [[collection/entities/active-directory|Active Directory]].

## Key Details

| Detail | Value |
|--------|-------|
| Server | `dsnr-idpr-app01` |
| Change ticket | CHG0038717 |
| Driver source | `I:\changes\drivers\CHG0038717\DRIVER.xml` |
| Drivers affected | HSCAD, UNTAD, UNTADSTU |
| Tool | OpenText Identity Manager Designer (run as Administrator) |
