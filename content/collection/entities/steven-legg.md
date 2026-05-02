---
title: "Steven Legg"
summary: "Australian engineer at eB2Bcom who edited RFC 4517 (LDAP syntaxes and matching rules), part of the 2006 RFC 4510 LDAPv3 revision series."
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
  - syntaxes
  - matching-rules
  - asn1
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
  - "[[collection/sources/2026-05-02-rfc4519-txt]]"
---

Steven Legg is an engineer at eB2Bcom (Box Hill North, Victoria, Australia) who edited [[collection/sources/2026-05-02-rfc4517-txt|RFC 4517]] — the 2006 IETF standards-track specification of [[collection/concepts/ldap-syntaxes|LDAP attribute syntaxes]] and [[collection/concepts/ldap-matching-rules|matching rules]]. RFC 4517 is part of the RFC 4510 technical specification series that obsoleted the original 1997 LDAPv3 RFCs (2251–2256).

## RFC Authorship

| RFC | Title | Role |
|-----|-------|------|
| RFC 4517 (2006) | LDAP: Syntaxes and Matching Rules | Editor |
| [[collection/sources/2026-05-02-rfc4519-txt\|RFC 4519 (2006)]] | LDAP: Schema for User Applications | Acknowledged contributor |

RFC 4517's acknowledgments attribute the document primarily to a revision of RFC 2252 by M. Wahl, A. Coulbeck, [[collection/entities/tim-howes|T. Howes]], and S. Kille. [[collection/entities/kurt-zeilenga|Kurt Zeilenga]] and Jim Sermersheim are credited for significant contributions to the revision.

## Context Within the RFC 4510 Series

Legg's contribution sits at the data-type layer of the [[collection/concepts/ldap|LDAP]] stack — defining what attribute values look like (syntaxes) and how they compare (matching rules). This layer is foundational but distinct from the protocol operations (RFC 4511), directory information models (RFC 4512), and authentication ([[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]]) that [[collection/entities/kurt-zeilenga|Kurt Zeilenga]] primarily drove within the same RFC 4510 series effort.

Where Zeilenga's work on RFC 4512 defines *how attributes are declared* (attribute type definitions, object classes, schema publication), Legg's RFC 4517 defines *what attribute values consist of* — the syntax and comparison semantics that attribute type definitions reference. The two documents are tightly coupled: an attribute type definition in RFC 4512 ABNF references syntax OIDs and matching rule names that are specified in RFC 4517.

Legg is also acknowledged in [[collection/sources/2026-05-02-rfc4519-txt|RFC 4519]] (LDAP Schema for User Applications), where editor [[collection/entities/andrew-sciberras|Andrew Sciberras]] credits him and [[collection/entities/kurt-zeilenga|Kurt Zeilenga]] for "significant contribution to this update." This contribution likely reflects the same syntaxes/matching-rules expertise he brought to RFC 4517, since RFC 4519 attribute type definitions depend directly on RFC 4517's syntax OIDs and matching rule names.

Legg is also credited as a reviewer of [[collection/sources/2026-05-02-rfc4370-txt|RFC 4370]] (LDAP Proxied Authorization Control, February 2006), where he is listed as "Steven Legg of Adacel" — a different organizational affiliation than eB2Bcom (his employer at the time of RFC 4517, June 2006). Both RFCs are from 2006; the discrepancy suggests an employer change between the February and June publication dates, or that Adacel and eB2Bcom are related entities.
