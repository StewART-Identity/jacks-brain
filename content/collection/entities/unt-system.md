---
title: "UNT System"
summary: "University of North Texas System — the higher education organization whose IAM environment is the subject of multiple wiki sources."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - organization
  - higher-education
  - unt
confidence: high
---

UNT System is the University of North Texas System, a Texas public university system. In the wiki, it is the organization whose IAM (Identity and Access Management) infrastructure is the subject of multiple sources.

## IAM Environment

UNT System operates a Microsoft 365 environment managed through [[collection/entities/microsoft-entra-id]], with [[collection/entities/cisco-duo]] as its MFA provider configured as an [[collection/concepts/external-authentication-method]]. Prior to January 2026, federation was handled via [[collection/entities/adfs]].

The IAM function is performed by an IAM Engineer who:
- Migrated the organization from legacy MFA/SSPR policies to [[collection/concepts/authentication-methods-policy]] on January 28, 2026
- Manages NetIQ Identity Manager drivers on [[collection/entities/dsnr-idpr-app01]] (see [[collection/sources/2026-04-25-driver-migration-husk]])

## Sources

- [[collection/sources/2026-04-25-authentication-methods-migration-summary]] — Microsoft Auth Methods migration executive summary
- [[collection/sources/2026-04-25-driver-migration-husk]] — IDM driver migration runbook
