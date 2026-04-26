---
title: "NetIQ Identity Manager Designer"
summary: "GUI authoring and deployment tool for NetIQ IDM driver configurations — import, live-compare, reconcile, and deploy."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - idm
  - netiq
  - tool
confidence: high
---

NetIQ Identity Manager Designer is the administrative GUI for building and managing Identity Manager (IDM) driver configurations. Core operations:

- **Import** — loads a driver definition from an XML file into the local Designer project.
- **Live Compare** — diffs the project's driver state against the live running configuration, surfacing attribute-level differences.
- **Reconcile** — selectively applies attribute differences from the compare step; operators choose per-attribute which side wins.
- **Deploy** — pushes the reconciled configuration live to the IDM engine.

Designer must be run as Administrator on [[collection/entities/dsnr-idpr-app01]].

See [[collection/concepts/idm-driver-migration]] for how these operations compose into a full driver migration workflow, and [[collection/sources/2026-04-25-driver-migration-husk]] for a concrete runbook example.
