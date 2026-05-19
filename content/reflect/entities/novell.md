---
title: "Novell, Inc."
summary: "Enterprise software company known for NetWare and eDirectory; a significant LDAP implementer and contributor to LDAP authentication standards."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - directory-services
  - netware
  - edirectory
  - enterprise-software
  - novell
  - nds
  - authentication
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc4511-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4513-txt]]"
---

Novell, Inc. was an American enterprise software company headquartered in Provo, Utah, known primarily for its **NetWare** network operating system and **Novell Directory Services (NDS)** — later renamed **eDirectory**. Novell was a pioneer in enterprise directory services, bringing a production directory product to market roughly seven years before [[reflect/entities/microsoft|Microsoft]] Active Directory.

## Directory Services Legacy

NDS, introduced with NetWare 4 in 1993, was an X.500-derived hierarchical directory and one of the first widely deployed enterprise directory products. eDirectory is a full-featured [[reflect/concepts/ldap|LDAP]] server that continues to be deployed in enterprise environments. Novell's experience operating production directory services at scale gave its engineers significant insight into LDAP's authentication and interoperability requirements.

## Role in LDAP Standards

Novell supplied editors for two of the most consequential documents in the RFC 4510 series: [[reflect/entities/jim-sermersheim|Jim Sermersheim]] edited [[reflect/sources/2026-05-02-rfc4511-txt|RFC 4511]] (the core protocol document), and [[reflect/entities/roger-harrison|Roger Harrison]] edited [[reflect/sources/2026-05-02-rfc4513-txt|RFC 4513]] (authentication and security). RFC 4513 in particular reflects Novell's interest in a rigorous, interoperable authentication layer — a weak standard would have put eDirectory at a disadvantage against Microsoft's vertically-integrated AD ecosystem.

## Position in LDAP Standards History

| Era | Primary Driver | Key Contribution |
|---|---|---|
| 1997 (LDAPv3 core) | [[reflect/entities/netscape-communications|Netscape Communications]] | RFC 2251–2256 core protocol |
| 1999 (extensions) | [[reflect/entities/microsoft|Microsoft]] | RFC 2696 paged results |
| 2006 (protocol spec) | Novell (Sermersheim) | RFC 4511 core protocol |
| 2006 (auth/security) | Novell (Harrison) | RFC 4513 authentication methods |
| 2006 (revision) | [[reflect/entities/openldap-foundation|OpenLDAP Foundation]] (Zeilenga) | RFC 4510 series overall revision |

Novell was acquired by Attachmate Corporation in 2011.
