---
title: "Andrew Sciberras"
summary: "Australian engineer at eB2Bcom who edited RFC 4519, the 2006 LDAP schema for user applications that superseded RFC 2256."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ietf
  - rfc
  - ldap-schema
  - user-schema
  - rfc4519
  - rfc4510
  - eb2bcom
  - australia
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc4519-txt]]"
---

Andrew Sciberras is an engineer at eB2Bcom (Suite 3, Woodhouse Corporate Centre, 935 Station Street, Box Hill North, Victoria 3129, Australia; email: `andrew.sciberras@eb2bcom.com`) who edited [[reflect/sources/2026-05-02-rfc4519-txt|RFC 4519]] — the June 2006 IETF standards-track specification of attribute types and object classes for use by [[reflect/concepts/ldap|LDAP]] directory clients in user applications. RFC 4519 is part of the [[reflect/sources/2026-05-02-rfc4510-txt|RFC 4510]] LDAPv3 Technical Specification series.

## RFC Authorship

| RFC | Title | Role |
|-----|-------|------|
| [[reflect/sources/2026-05-02-rfc4519-txt\|RFC 4519 (2006)]] | LDAP: Schema for User Applications | Editor |

RFC 4519 obsoletes [[reflect/sources/2026-05-02-rfc2256-txt|RFC 2256]] (December 1997, authored by [[reflect/entities/mark-wahl|Mark Wahl]]), carrying forward the standard [[reflect/concepts/x500-user-schema|X.500 user schema]] definitions — attribute types and [[reflect/concepts/ldap-object-classes|object classes]] for representing people, organizations, and locations — into the 2006 LDAPv3 revision. The RFC's acknowledgements credit [[reflect/entities/steven-legg|Steven Legg]] and [[reflect/entities/kurt-zeilenga|Kurt Zeilenga]] for "significant contribution to this update."

## eB2Bcom and the RFC 4510 Series

Sciberras shares an organizational affiliation with [[reflect/entities/steven-legg|Steven Legg]], who edited [[reflect/sources/2026-05-02-rfc4517-txt|RFC 4517]] (LDAP Syntaxes and Matching Rules) from the same address. Both RFCs are part of the RFC 4510 series produced by the IETF LDAPBIS Working Group. The two documents are tightly coupled: RFC 4519's attribute type definitions reference the syntax OIDs and matching rule names that RFC 4517 specifies.

## Scope of RFC 4519

RFC 4519's key editorial decisions relative to RFC 2256:

- **Removed PKI elements** (certificate attributes, revocation lists, `certificationAuthority` object classes) — moved to RFC 4523
- **Removed legacy server objects** (`applicationEntity`, `dSA`, `dmd`, etc.) — marked Historic
- **Incorporated `dc`, `dcObject`** from RFC 2247, with IDN ToASCII requirements
- **Incorporated `uid`** as the definitive description, superseding RFC 2798 / RFC 1274
- **Incorporated `uidObject`** as the definitive description, superseding RFC 2377
- **Added Unicode/SASLprep guidance** for `userPassword`

The result is a document scoped exclusively to *user application* schema, separating it from server-administration and PKI concerns that RFC 2256 had bundled together.
