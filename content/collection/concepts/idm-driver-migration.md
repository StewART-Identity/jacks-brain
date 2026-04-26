---
title: "IDM Driver Migration"
summary: "The delete-import-compare-reconcile-deploy pattern for replacing a NetIQ IDM driver with a new version while preserving live config."
type: concept
created: 2026-04-25
updated: 2026-04-25
tags:
  - idm
  - driver-migration
  - netiq
  - operations
sources:
  - "[[collection/sources/2026-04-25-driver-migration-husk]]"
confidence: high
---

An IDM driver migration replaces an existing [[collection/entities/netiq-identity-manager-designer]] driver with a new version using a five-stage pattern: **delete → import → compare → reconcile → deploy**.

## The pattern

1. **Delete** the old driver from the Designer project. This removes the local copy; the live driver continues running untouched.
2. **Import** a fresh driver XML (a "husk" — a clean definition, typically from a network share) into the project.
3. **Live Compare** — Designer diffs the imported driver against the live running configuration at the attribute level.
4. **Selective Reconcile** — the operator picks which attributes to accept from the incoming version. Password-related attributes are consistently excluded to avoid overwriting live credential bindings with placeholder values from the husk.
5. **Deploy** — the reconciled configuration is pushed live to the IDM engine.

## Why delete-then-import rather than in-place edit

Starting from a clean husk ensures stale or orphaned attributes from the prior version do not carry forward invisibly. The Live Compare step makes the delta explicit and auditable before anything is pushed live.

## Password attribute exclusion

A consistent operational pattern: skip reconciliation of any attribute whose name contains "Password". This preserves operational secrets and avoids overwriting live credential bindings.

## Example

[[collection/sources/2026-04-25-driver-migration-husk]] documents this pattern applied to the HSCAD, UNTAD, and UNTADSTU drivers on [[collection/entities/dsnr-idpr-app01]] under change record CHG0038717.
