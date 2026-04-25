---
title: "UNT System IAM"
summary: "UNT System's IAM team, maintaining eDirectory, AD, Duo, and ALMA for 72,000+ users across UNT, HSC, and STUDENTS institutions."
type: entity
created: 2026-04-25
updated: 2026-04-25
tags:
  - unt
  - unt-system
  - iam
  - identity
sources:
  - "[[collection/sources/2026-04-25-alma-v2-technical-reference]]"
  - "[[collection/sources/2026-04-25-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
  - "[[collection/sources/2026-04-25-jacks-rules-for-website-design]]"
confidence: high
---

UNT System IAM is the Identity and Access Management team at the University of North Texas System, responsible for maintaining identity infrastructure for 72,000+ users across multiple institutions served by three [[collection/entities/active-directory|Active Directory]] domains (UNT, HSC, STUDENTS).

## Identity Infrastructure

| System | Role |
|--------|------|
| [[collection/entities/edirectory-idtree\|eDirectory (IDTREE)]] | Central identity store and source of truth |
| [[collection/entities/active-directory\|Active Directory]] | Three domain deployments: HSC, STUDENTS, UNT |
| [[collection/entities/opentext-identity-manager\|OpenText IDM]] | Asynchronous sync from IDTREE to AD via three drivers |
| [[collection/entities/cisco-duo\|Cisco Duo]] | Multi-factor authentication |
| [[collection/entities/alma\|ALMA]] | Account lifecycle management automation |
| [[collection/entities/iam-toolbox\|IAM Toolbox]] | Internal React/TypeScript web application |

## Servers

- `iam-script-gab` — runs ALMA and other batch scripts
- `iam-app-gab` — runs `iam-apis`, the FastAPI service mediating all directory operations (HTTPS port 8443)

## People

- [[collection/entities/jack-stewart|Jack Stewart]] — IAM Engineer; author of ALMA and IAM team documentation
