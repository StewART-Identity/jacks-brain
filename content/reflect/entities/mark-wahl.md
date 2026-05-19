---
title: "Mark Wahl"
summary: "LDAP engineer at Critical Angle Inc. who co-authored the core December 1997 LDAPv3 RFCs including the wire protocol, attribute syntaxes, and DN string representation."
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
  - rfc2251
  - rfc2252
  - rfc2253
  - rfc2256
  - rfc3829
  - x500-user-schema
  - rfc2891
  - sun-microsystems
  - distinguished-name
  - attribute-syntaxes
  - server-side-sorting
  - authorization-identity
  - directory-access
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2251-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2252-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2253-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2256-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2891-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4532-txt]]"
---

Mark Wahl was an LDAP engineer affiliated with Critical Angle Inc. (4815 W. Braker Lane #502-385, Austin, TX 78759; email: `M.Wahl@critical-angle.com`) at the time of the December 1997 [[reflect/concepts/ldap|LDAPv3]] specification publications.

Wahl is listed as a co-author on several foundational LDAP RFCs from December 1997:

- **RFC 2251** — Lightweight Directory Access Protocol (v3): core wire protocol, operations, and information model
- **[[reflect/sources/2026-05-02-rfc2252-txt|RFC 2252]]** — LDAPv3 Attribute Syntax Definitions (co-authored with [[reflect/entities/andy-coulbeck|A. Coulbeck]], [[reflect/entities/tim-howes|T. Howes]], and [[reflect/entities/steve-kille|S. Kille]])
- **[[reflect/sources/2026-05-02-rfc2253-txt|RFC 2253]]** — UTF-8 String Representation of [[reflect/concepts/distinguished-name|Distinguished Names]] (co-authored with [[reflect/entities/steve-kille|S. Kille]] and [[reflect/entities/tim-howes|T. Howes]])
- **[[reflect/sources/2026-05-02-rfc2256-txt|RFC 2256]]** — A Summary of the X.500(96) User Schema for Use with LDAPv3 (sole author; compiles attribute types and object classes from ISO/ITU-T X.500 into the standard LDAP [[reflect/concepts/x500-user-schema|user schema]])

[[reflect/sources/2026-05-02-rfc2256-txt|RFC 2256]] — his sole-authored user schema document — was superseded in 2006 by [[reflect/sources/2026-05-02-rfc4519-txt|RFC 4519]], edited by [[reflect/entities/andrew-sciberras|Andrew Sciberras]] of eB2Bcom. RFC 4519 explicitly acknowledges: "This document is an update of RFC 2256 by Mark Wahl." The core content (attribute types, object classes from X.520 and X.521) is carried forward; PKI elements are removed to RFC 4523, and domain/user identity attributes (`dc`, `uid`, `uidObject`) are incorporated from other RFCs.

RFC 2251 is also cited in RFC 4510 as foundational to the LDAPbis 2006 revision: "based largely on RFC 3377 by J. Hodges and R. Morgan, and borrows from RFC 2251 by M. Wahl, T. Howes, and S. Kille." The December 1997 cluster he co-authored forms the original LDAPv3 specification, later reorganized into the [[reflect/synthesis/ldap-technical-specification-architecture|RFC 4510 series]].

The [[reflect/entities/netscape-communications|Netscape Communications]] entity page notes Wahl alongside [[reflect/entities/tim-howes|Tim Howes]] and [[reflect/entities/steve-kille|Steve Kille]] as central to the 1997 LDAPv3 standards effort, though RFC 2253 lists his affiliation as Critical Angle Inc. rather than Netscape.

## RFC 3829: Authorization Identity Controls

Wahl co-authored RFC 3829 (July 2004) — the Authorization Identity Request and Response Controls — alongside [[reflect/entities/rob-weltman|Rob Weltman]] and [[reflect/entities/mark-smith|Mark Smith]]. The RFC defined a mechanism for LDAP clients to obtain the authorization identity a server associates with a session, delivered via Bind request and response controls. [[reflect/sources/2026-05-02-rfc4532-txt|RFC 4532]] (2006) by [[reflect/entities/kurt-zeilenga|Kurt Zeilenga]] is explicitly intended to replace this mechanism, citing the security limitation that Bind controls are not protected by the security layers the Bind operation establishes. RFC 4532 acknowledges their prior work.

## Sun Microsystems (2000)

By August 2000 Wahl had moved to Sun Microsystems, Inc. (8911 Capital of Texas Hwy Suite 4140, Austin, TX 78759; `Mark.Wahl@sun.com`). He co-authored **[[reflect/sources/2026-05-02-rfc2891-txt|RFC 2891]]** (LDAP Control Extension for Server Side Sorting of Search Results) alongside [[reflect/entities/tim-howes|Tim Howes]] (Loudcloud) and Anoop Anantha ([[reflect/entities/microsoft|Microsoft Corp.]]). RFC 2891 defines the [[reflect/concepts/ldap-server-side-sorting|server-side sorting]] control pair, extending the `controls` mechanism established in RFC 2251 — the same protocol document Wahl had co-authored three years earlier. His move from Critical Angle Inc. to Sun Microsystems between 1997 and 2000 parallels Howes's move from Netscape to Loudcloud over the same period.
