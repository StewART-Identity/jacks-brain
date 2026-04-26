---
title: "IDM Driver Deployment"
summary: "The Designer-based workflow for updating OpenText IDM drivers: import a definition, compare live vs. imported, reconcile, and deploy."
type: concept
created: 2026-04-26
updated: 2026-04-26
tags:
  - idm
  - opentext
  - driver
  - deployment
  - iam
sources:
  - "[[collection/sources/2026-04-26-driver-migration-husk]]"
confidence: high
---

OpenText Identity Manager driver changes — whether full replacements or targeted policy updates — are applied through the Designer application using a compare-and-reconcile pattern. The workflow is the same regardless of what the driver change actually does.

## The Compare-and-Reconcile Workflow

Designer's **Live → Compare** view diffs the locally imported (or edited) driver definition against the currently deployed driver. Each attribute is resolved individually:

- **Left-most icon** — take the value from the imported definition (promotes the incoming change).
- **Other icons** — keep or merge the existing live value.

After all attributes are resolved, **Reconcile** stages the complete set. **Live → Deploy** then pushes the staged configuration to the running IDM engine.

### Password attributes

Password attributes must not be promoted from an imported definition — the driver XML typically carries no live credential values. Leaving them untouched preserves the credentials already set in the deployed driver.

## Import-and-Replace Pattern

When a driver needs a full replacement rather than an in-place patch, the procedure is:

1. Delete the existing driver from the Designer project.
2. Import the replacement driver XML, accepting all defaults.
3. Run the compare-and-reconcile workflow above.
4. Deploy live.

Deleting first ensures the imported definition is the unambiguous baseline. Reconciliation then surgically re-applies live-only values (passwords, environment-specific settings) on top of the new definition.

## Drivers at UNT System

[[collection/entities/opentext-identity-manager|OpenText IDM]] at UNT System runs three drivers that govern [[collection/concepts/identity-propagation|identity propagation]] from [[collection/entities/edirectory-idtree|eDirectory (IDTREE)]] to [[collection/entities/active-directory|Active Directory]]:

| Driver | Target domain |
|--------|--------------|
| HSCAD | HSC |
| UNTAD | UNT |
| UNTADSTU | STUDENTS |

Driver configuration changes affect how all three institutions' identity events flow downstream. See [[collection/sources/2026-04-26-driver-migration-husk|Driver Migration Husk — CHG0038717]] for a concrete example of this workflow applied to all three drivers simultaneously.
