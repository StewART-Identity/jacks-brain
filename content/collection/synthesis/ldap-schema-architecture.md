---
title: "LDAP Schema Architecture: The Four-Layer Type System"
summary: "How LDAP's schema is structured as four cooperating layers — syntaxes, matching rules, attribute types, and object classes — and why separating them enables flexible, extensible directory design."
type: synthesis
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-schema
  - syntaxes
  - matching-rules
  - object-class
  - attribute-types
  - asn1
  - x500
  - rfc4517
  - rfc4512
  - schema-design
  - oid
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4512-txt]]"
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
  - "[[collection/sources/2026-05-02-rfc4519-txt]]"
  - "[[collection/sources/2026-05-02-rfc2256-txt]]"
  - "[[collection/sources/2026-05-02-rfc4530-txt]]"
---

[[collection/concepts/ldap|LDAP]] schema is not a monolithic data model. It is a four-layer architecture in which each layer depends on the one below it, and each layer is independently extensible via OID-registered definitions. Understanding the layering explains both why LDAP schema is so flexible and why schema design errors propagate in surprising ways.

## The Four Layers

**Layer 1 — Syntaxes** define legal values: their structure, format, and LDAP-specific wire encoding. [[collection/concepts/ldap-syntaxes|LDAP syntaxes]] are specified in [[collection/sources/2026-05-02-rfc4517-txt|RFC 4517]], each identified by a dotted-decimal OID (e.g., Directory String = `1.3.6.1.4.1.1466.115.121.1.15`). A syntax answers: "What byte sequences are valid for this attribute?"

**Layer 2 — Matching Rules** define comparison semantics: how values of a given syntax are compared in Search filters, Compare operations, and Modify duplicate-detection. [[collection/concepts/ldap-matching-rules|Matching rules]] are also specified in RFC 4517, each with its own OID. A matching rule answers: "How do two values of this type compare — and by what criteria?" Equality, ordering, and substrings variants exist.

**Layer 3 — Attribute Types** bind together a syntax and a set of matching rules, giving the combination a name and OID. An attribute type definition ([[collection/sources/2026-05-02-rfc4512-txt|RFC 4512]]) says: "Values of this attribute must conform to syntax X; they compare equal by rule Y; they order by rule Z; they match substrings by rule W." The `cn` (commonName) attribute, for example, uses Directory String syntax with `caseIgnoreMatch` as its equality rule.

**Layer 4 — Object Classes** group attribute types into mandatory (`MUST`) and optional (`MAY`) sets, defining the shape of a directory entry. [[collection/concepts/ldap-object-classes|Object classes]] inherit from each other via `SUP` chains. An entry's object classes determine which attributes it may or must carry.

## Why the Separation Matters

The separation between layers is not just organizational — it has concrete consequences for how LDAP searches behave.

**Multiple matching rules per syntax.** Because matching rules are separate from syntaxes, the same syntax can have multiple applicable rules. Directory String has both `caseIgnoreMatch` and `caseExactMatch`. Attribute type definitions pick one as the default equality rule; the others remain available via [[collection/concepts/ldap-search-filters|extensible match filters]]. Without this separation, there would be no way to support both case-sensitive and case-insensitive string attributes in the same directory.

**Assertion syntax can differ from attribute syntax.** A substring matching rule uses the `Substring Assertion` syntax for its assertion value (the wildcard pattern), even though the attribute values use `Directory String`. The comparison semantics document this gap explicitly; clients that misunderstand it may construct filters that silently match nothing.

**Schema publication is self-describing.** RFC 4517 defines syntaxes for schema elements themselves (Attribute Type Description, Object Class Description, Matching Rule Description). This allows LDAP servers to publish their entire schema through the directory — in the `subschema` entry — using the same LDAP protocol operations as any other data. A client introspecting an unfamiliar server can read its schema without out-of-band documentation.

## The ASN.1 Correspondence

Each LDAP syntax in RFC 4517 maps explicitly to an ASN.1 type from the X.500 series (X.501, X.520, X.680). This mapping preserves semantic interoperability between LDAP and X.500 directories while acknowledging that the wire representations differ: LDAP uses human-readable LDAP-specific encodings (ABNF-defined) rather than BER.

The cost of this divergence is non-canonicality. LDAP-specific encodings are **not reversible to BER** in general: a round-trip through BER and back may not reproduce the original octets. Consequently, LDAP encodings must not be used where reversibility to DER is required — for example, verifying digital signatures over attribute values. Gateways between LDAP and X.500 must transcode per RFC 4518's Transcode step.

This is a design trade-off baked into LDAP from its origins as a "lightweight" simplification of X.500: prioritize human-readability and implementation simplicity at the cost of round-trip fidelity.

## Division of Labor in the RFC 4510 Series

The four-layer schema architecture is defined across multiple RFCs in the 2006 RFC 4510 series:

| Layer | Defined by | Author |
|-------|-----------|--------|
| Syntaxes + Matching Rules | [[collection/sources/2026-05-02-rfc4517-txt|RFC 4517]] | [[collection/entities/steven-legg|Steven Legg]] |
| Attribute Types + Object Classes | [[collection/sources/2026-05-02-rfc4512-txt\|RFC 4512]] | [[collection/entities/kurt-zeilenga|Kurt Zeilenga]] |
| User-facing schema (cn, sn, dc, etc.) | [[collection/sources/2026-05-02-rfc4519-txt\|RFC 4519]] (2006); originally [[collection/sources/2026-05-02-rfc2256-txt|RFC 2256]] (1997) | [[collection/entities/andrew-sciberras\|A. Sciberras]]; originally [[collection/entities/mark-wahl|Mark Wahl]] |
| DN string representation | RFC 4514 | Kurt Zeilenga |
| UUID syntax + matching rules + entryUUID attribute | [[collection/sources/2026-05-02-rfc4530-txt\|RFC 4530]] | [[collection/entities/kurt-zeilenga\|Kurt Zeilenga]] |

RFC 4530 illustrates an important pattern in LDAP schema extension: the same four-layer architecture (syntax → matching rules → attribute type → operational use) that underpins the core schema can be extended outside the RFC 4510 series, registering new primitives through IANA's LDAP parameters arc (`1.3.6.1.1.16`) rather than a private enterprise arc. RFC 4530 adds a new primitive type (UUID) at Layer 1, two matching rules at Layer 2, and a server-managed operational attribute at Layer 3 — without touching Layer 4 (object classes) at all. The [[collection/concepts/ldap-entry-uuid|`entryUUID`]] attribute solves the [[collection/concepts/distinguished-name|DN instability]] problem by anchoring entry identity below the naming layer.

RFC 4517 and RFC 4512 are tightly coupled: an attribute type definition in RFC 4512's ABNF (`AttributeTypeDescription`) references syntax OIDs and matching rule names that are specified in RFC 4517. Neither document is self-contained without the other.

## Matching Rules and Security

RFC 4517 includes an access-control security requirement that cuts across the layer model: implementations MUST compare security-sensitive fields at the **abstract value level**, not the encoding level. Two different LDAP-specific encodings that represent the same abstract value must produce the same access-control result. This requirement prevents encoding-based bypass attacks where an attacker constructs an encoding that is syntactically valid but produces a different comparison outcome than the canonical form.

The [[collection/concepts/ldap-matching-rules|matching rule]] for a field is therefore load-bearing for security: choosing the wrong matching rule, or bypassing matching rule comparison in favor of raw string comparison, can introduce access-control vulnerabilities. This is worth keeping in mind when configuring or extending [[collection/concepts/ldap-object-classes|object classes]] in directory deployments.

## Relationship to Existing Wiki Content

This four-layer architecture underlies everything else cataloged about LDAP:

- [[collection/concepts/ldap-search-filters|Search filters]] reference attribute types by name; attribute types determine which matching rules apply to filter evaluation
- [[collection/concepts/ldap-paged-results|Paged results]] and [[collection/sources/2026-05-02-rfc4529-txt|attribute selection by object class]] operate on entries whose structure is defined by object classes built on attribute types
- [[collection/concepts/sasl|SASL]] and [[collection/concepts/ldap-tls|TLS]] govern *who* can read/write attributes; the schema governs *what* those attributes contain and *how* they compare
- The `distinguishedNameMatch` rule (Layer 2) is what makes DN-based access control in [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513's authorization model]] semantically well-defined: DN equality is a matching rule, not a string comparison
- [[collection/concepts/ldap-entry-uuid|`entryUUID`]] (RFC 4530) demonstrates the four-layer model applied to a new primitive: UUID syntax at Layer 1, `uuidMatch`/`uuidOrderingMatch` at Layer 2, `entryUUID` operational attribute at Layer 3 — the [[collection/concepts/ldap-content-synchronization|Content Synchronization]] protocol relies on this stable identity anchor to distinguish renames from delete/re-add pairs
