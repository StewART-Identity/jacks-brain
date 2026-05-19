---
title: "LDAPv3 Specification Architecture: The RFC 4510 Modular Reorganization"
summary: "How the 2006 RFC 4510 series decomposed tangled 1997 LDAP specs into nine single-concern documents, each owning a distinct protocol layer."
type: synthesis
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - technical-specification
  - rfc4510
  - modular-design
  - x500
  - ietf
  - ldapbis
  - standards-track
  - protocol-design
  - openldap
  - internationalization
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc1487-txt]]"
  - "[[reflect/sources/2026-05-02-rfc1777-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2251-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2255-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4510-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4511-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4513-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4514-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4515-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4516-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4517-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4518-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4519-txt]]"
---

## LDAPv2 Prehistory: RFC 1777

Before the 1997 cluster, the protocol had already gone through two versions. [[reflect/sources/2026-05-02-rfc1777-txt|RFC 1777]] (March 1995, LDAPv2) was co-authored by [[reflect/entities/wengyik-yeong|Wengyik Yeong]] (PSI Inc.), [[reflect/entities/tim-howes|Tim Howes]] (University of Michigan), and [[reflect/entities/steve-kille|Steve Kille]] (ISODE Consortium), and itself obsoleted [[reflect/sources/2026-05-02-rfc1487-txt|RFC 1487]] (LDAPv1, July 1993). LDAPv2 established the core client-server model, the nine base operations, TCP port 389, and the restricted BER encoding profile that LDAPv3 inherited. What it lacked was the extensibility infrastructure: no Controls mechanism, no Extended operations, no SASL, no referrals returned to clients, and authentication limited to cleartext password or Kerberos v4. The 1997 RFC 2251 series added all of these while preserving LDAPv2's basic operation set intact.

The three-generation sequence [[reflect/sources/2026-05-02-rfc1487-txt|RFC 1487]] (1993) → [[reflect/sources/2026-05-02-rfc1777-txt|RFC 1777]] (1995) → [[reflect/sources/2026-05-02-rfc2251-txt|RFC 2251]] (1997) also marks a transition in institutional authorship: Yeong (PSI) dropped off after LDAPv2, while Howes moved from University of Michigan to [[reflect/entities/netscape-communications|Netscape]], and Kille's organization transitioned from ISODE Consortium to [[reflect/entities/isode-ltd|Isode Ltd.]] The 2006 RFC 4510 series then completed a second generational handoff to [[reflect/entities/kurt-zeilenga|Kurt Zeilenga]] and the IETF LDAPBIS working group.

The 1997 LDAPv3 specification — RFCs 2251 through 2256, plus 2829, 2830, and eventually 3377 and 3771 — was not designed as a modular suite. [[reflect/sources/2026-05-02-rfc2251-txt|RFC 2251]] alone covered the protocol wire encoding, the information model, the authentication framework, and the result codes. Syntaxes, matching rules, and schema were in RFC 2252; [[reflect/concepts/distinguished-name|DN]] string representation in [[reflect/sources/2026-05-02-rfc2253-txt|RFC 2253]]; filter string representation in [[reflect/sources/2026-05-02-rfc2254-txt|RFC 2254]]; URL format in [[reflect/sources/2026-05-02-rfc2255-txt|RFC 2255]]; X.500 user-application schema in RFC 2256. These documents overlapped, cross-referenced each other ambiguously, and each contained bits of normative material relevant to multiple concerns. The 2006 [[reflect/sources/2026-05-02-rfc4510-txt|RFC 4510]] series replaced this tangled set with nine documents, each owning a single, clearly bounded concern.

## The Decomposition

The concern mapping from 1997 to 2006 was not one-to-one. RFC 2251's content was split across three 2006 documents:

- Protocol elements, wire encoding, operations, controls, result codes, referrals → [[reflect/sources/2026-05-02-rfc4511-txt|RFC 4511]]
- Directory Information Models (DIT structure, object classes, attribute types, schema) → RFC 4512
- Authentication methods, StartTLS procedures, authorization state model → [[reflect/sources/2026-05-02-rfc4513-txt|RFC 4513]]

RFC 2252 (Attribute Syntaxes and Matching Rules) was similarly split: the information model portions went to RFC 4512; the 34 syntaxes and 32 matching rules themselves became [[reflect/sources/2026-05-02-rfc4517-txt|RFC 4517]]. RFC 2256's user-application schema moved to [[reflect/sources/2026-05-02-rfc4519-txt|RFC 4519]], with residual model material absorbed by RFC 4512. The authentication RFCs (2829 and 2830) were consolidated into RFC 4513. The IntermediateResponse RFC (3771) was absorbed directly into RFC 4511.

The result is a clean layering:

| Layer | 2006 RFC | What it governs |
|---|---|---|
| Information model | RFC 4512 | DIT structure, object classes, attribute types, schema abstractions |
| Wire protocol | [[reflect/sources/2026-05-02-rfc4511-txt\|RFC 4511]] | ASN.1/BER encoding, all operations, controls mechanism, result codes |
| Authentication | [[reflect/sources/2026-05-02-rfc4513-txt\|RFC 4513]] | Bind semantics, StartTLS, SASL integration, authorization state |
| Data types | [[reflect/sources/2026-05-02-rfc4517-txt\|RFC 4517]] | Syntaxes and matching rules |
| String encodings | [[reflect/sources/2026-05-02-rfc4514-txt\|RFC 4514]], [[reflect/sources/2026-05-02-rfc4515-txt\|RFC 4515]] | DN string form, filter string form (1997 predecessors: [[reflect/sources/2026-05-02-rfc2253-txt\|RFC 2253]], RFC 2254) |
| URL syntax | [[reflect/sources/2026-05-02-rfc4516-txt\|RFC 4516]] | LDAP URL format |
| User schema | [[reflect/sources/2026-05-02-rfc4519-txt\|RFC 4519]] | Standard attributes (cn, mail, uid, etc.) |
| String preparation | [[reflect/sources/2026-05-02-rfc4518-txt\|RFC 4518]] | Internationalized string comparison normalization |

## RFC 4518: The New Addition

Every document in the 2006 series has a direct 1997 predecessor except [[reflect/sources/2026-05-02-rfc4518-txt|RFC 4518]] — Internationalized String Preparation. The 1997 specs implicitly handled string comparison for international characters in ad hoc ways across individual matching rule definitions. RFC 4518 extracted this into a single, principled document based on the IETF's StringPrep framework (RFC 3454), giving [[reflect/concepts/ldap-matching-rules|matching rules]] in [[reflect/sources/2026-05-02-rfc4517-txt|RFC 4517]] a normative foundation for Unicode string handling via the [[reflect/concepts/ldap-string-preparation|six-step string preparation algorithm]]. Its absence from the 1997 series was a gap, not an intentional omission — the StringPrep framework itself didn't exist until 2002.

## The X.500 Relationship

RFC 4510 specifies that LDAP is an X.500 access mechanism: LDAP servers MUST act in accordance with X.500 (1993) data and service models (X.501 for the directory model, X.511 for the abstract service definition). They need not, however, use X.500 protocols internally. This creates an important design property: LDAP is not a simplification of X.500 DAP, nor a subset, but a re-specification of the X.500 abstract service in Internet-native terms. An LDAP server may be backed by a relational database, an object store, or any other system — as long as the LDAP interface presents the X.500 data model correctly.

The 1993 X.500 constraint is also a deliberate freeze. Later X.500 revisions (1997, 2001, 2008...) do not automatically apply. This prevents the LDAP specification from being moving-target-dependent on ITU-T revision cycles.

## Extensibility Architecture

RFC 4510 specifies two governing policies for LDAP extensions:

- **BCP 118 (RFC 4521)** — extensions MUST be genuinely optional; no extension may be required for baseline conformance
- **BCP 64 (RFC 4520)** — IANA registration procedures for LDAP OIDs (attribute types, object classes, controls, extended operations, features, syntaxes, matching rules)

Both BCPs were authored by [[reflect/entities/kurt-zeilenga|Zeilenga]], consistent with the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]]'s dominant role in the 2006 revision. The BCP structure reflects a key design decision: the core spec is held stable, and the extension space is governed through an IANA registry with documented policies — not through core spec amendments. See [[reflect/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]] for how cataloged RFCs use each extension mechanism.

## Authorship and the Transition of Stewardship

The 1997 series was a [[reflect/entities/netscape-communications|Netscape]]-led effort with [[reflect/entities/tim-howes|Tim Howes]] and colleagues as principal authors. The 2006 series is a product of the IETF LDAPBIS Working Group, with [[reflect/entities/kurt-zeilenga|Zeilenga]] as the dominant author — editing RFC 4510 (this road map), RFC 4512, [[reflect/sources/2026-05-02-rfc4514-txt|RFC 4514]], [[reflect/sources/2026-05-02-rfc4518-txt|RFC 4518]], RFC 4520, and RFC 4521 outright, and contributing significantly to [[reflect/sources/2026-05-02-rfc4511-txt|RFC 4511]] and [[reflect/sources/2026-05-02-rfc4517-txt|RFC 4517]]. [[reflect/sources/2026-05-02-rfc4516-txt|RFC 4516]] (LDAP URLs) was edited by [[reflect/entities/mark-smith|Mark Smith]] and [[reflect/entities/tim-howes|Tim Howes]] — the same pair who produced RFC 4515 — with Zeilenga thanked in the acknowledgements. The authentication RFCs (RFC 4513) were instead edited by [[reflect/entities/roger-harrison|Roger Harrison]] of [[reflect/entities/novell|Novell]] — see [[reflect/synthesis/ldap-authentication-security-architecture|LDAP Security Architecture: Authentication Gap to RFC 4513]] for why a Novell engineer was positioned to own the authentication framework.

RFC 4510 itself traces its lineage explicitly: it is based largely on RFC 3377 by J. Hodges and R. Morgan, and borrows from RFC 2251 by M. Wahl, T. Howes, and S. Kille. The acknowledgement captures the generational handoff in LDAP stewardship.
