---
title: "Isode Ltd."
summary: "UK software company specializing in messaging and directory software; contributed to LDAPv3 standards through Steve Kille's co-authorship of the December 1997 RFC cluster."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv2
  - ldapv3
  - ietf
  - directory-access
  - messaging
  - uk
  - steve-kille
  - isode-consortium
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc1777-txt]]"
  - "[[collection/sources/2026-05-02-rfc2252-txt]]"
  - "[[collection/sources/2026-05-02-rfc2253-txt]]"
---

Isode Ltd. (and its predecessor, the ISODE Consortium) is a UK-based organization specializing in messaging and directory services. Its most prominent IETF contributor in the [[collection/concepts/ldap|LDAP]] standards context is [[collection/entities/steve-kille|Steve Kille]], who co-authored foundational LDAP RFCs spanning both the LDAPv2 and LDAPv3 eras.

## ISODE Consortium (pre-1997)

In the LDAPv2 period, the organization operated as the **ISODE Consortium** (PO Box 505, London SW11 1DX, UK) — a not-for-profit consortium that developed the ISODE software suite for OSI and X.500 interoperability. Under this name, [[collection/entities/steve-kille|Steve Kille]] co-authored [[collection/sources/2026-05-02-rfc1777-txt|RFC 1777]] (March 1995, LDAPv2) alongside [[collection/entities/wengyik-yeong|Wengyik Yeong]] (PSI Inc.) and [[collection/entities/tim-howes|Tim Howes]] (University of Michigan).

## Isode Ltd. (1997 onward)

By December 1997, the organization had reorganized as **Isode Ltd.**, located at The Dome, The Square, Richmond, Surrey TW9 1DT, England. Under this name, [[collection/entities/steve-kille|Kille]] co-authored the foundational LDAPv3 RFCs alongside engineers from [[collection/entities/netscape-communications|Netscape Communications]] and others:

- RFC 2251 — LDAPv3 core protocol
- **[[collection/sources/2026-05-02-rfc2252-txt|RFC 2252]]** — Attribute syntax definitions (also co-authored by [[collection/entities/andy-coulbeck|Andy Coulbeck]] of Isode Inc., the US entity)
- **[[collection/sources/2026-05-02-rfc2253-txt|RFC 2253]]** — UTF-8 String Representation of [[collection/concepts/distinguished-name|Distinguished Names]]

Isode's involvement spans both LDAPv2 and LDAPv3, reflecting a continuous organizational interest in standardized directory access. Its product line in high-assurance messaging systems depends on interoperable directory naming (distinguished names, [[collection/concepts/ldap-syntaxes|DN syntax]]), making LDAP standardization directly relevant to its commercial positioning.

## QUIPU and X.500 Heritage

The ISODE software suite included "QUIPU" — an early and influential X.500 directory implementation. [[collection/sources/2026-05-02-rfc2256-txt|RFC 2256]] (the 1997 summary of the X.500 user schema for LDAPv3) explicitly credits QUIPU as the basis for its syntax definitions, reflecting how the ISO/[[collection/entities/itu-t|ITU-T]] X.500 standards and their early ISODE implementations co-evolved. This heritage links Isode directly to the [[collection/concepts/x500-user-schema|X.500 user schema]] that all LDAPv3 servers implement today.
