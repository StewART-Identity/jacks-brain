---
title: "Driver Migration Husk"
summary: "Runbook for migrating HSCAD, UNTAD, and UNTADSTU drivers in NetIQ IDM Designer: import, live-compare, reconcile, and deploy."
type: source
role: reference
created: 2026-04-25
updated: 2026-04-25
tags:
  - idm
  - driver-migration
  - netiq
  - runbook
  - change-management
sources: []
confidence: high
views:
  - date: 2026-04-25
    note: "Initial cataloging."
---

Procedural runbook for migrating three Identity Manager drivers (HSCAD, UNTAD, UNTADSTU) on [[collection/entities/dsnr-idpr-app01]] using [[collection/entities/netiq-identity-manager-designer]]. Executed under change record CHG0038717.

[Download original](/api/originals/2026-04-25-Driver-Migration-Husk.docx)

## Procedure

Steps apply identically to each of the three drivers: HSCAD, UNTAD, and UNTADSTU.

1. Log in to `dsnr-idpr-app01`.
2. Open [[collection/entities/netiq-identity-manager-designer]] as Administrator.
3. For each driver:
   - **Delete** the driver from the Designer project.
   - **Import** from `I:\changes\drivers\CHG0038717\DRIVER.xml`, accepting all defaults.
   - **Live Compare**: right-click the driver → Live → Compare.
   - **Reconcile attributes**: under Attributes, select the left-most icon for every item *except* any attribute whose name contains "Password".
   - Click **Reconcile**.
   - **Deploy**: right-click the driver → Live → Deploy → Deploy → OK.

## Key details

- **Change record**: CHG0038717
- **Driver source path**: `I:\changes\drivers\CHG0038717\DRIVER.xml`
- **Affected drivers**: HSCAD, UNTAD, UNTADSTU
- **Password attributes**: explicitly excluded from reconciliation — live credential bindings are preserved.

See [[collection/concepts/idm-driver-migration]] for background on the delete-import-compare-deploy pattern.
