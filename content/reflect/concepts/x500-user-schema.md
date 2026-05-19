---
title: "X.500 User Schema"
summary: "The standard set of attribute types and object classes from the ISO/ITU-T X.500 series used by LDAP for representing people, organizations, and locations in directory entries."
type: concept
created: 2026-05-02
updated: 2026-05-04
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - x500
  - ldap-schema
  - attribute-types
  - object-class
  - user-schema
  - white-pages
  - person
  - organization
  - cn
  - sn
  - distinguished-name
  - rfc2256
  - rfc4519
  - itu-t
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2256-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4519-txt]]"
  - "[[reflect/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e]]"
---

The **X.500 user schema** is the standard set of attribute types and [[reflect/concepts/ldap-object-classes|object classes]] from the ISO/[[reflect/entities/itu-t|ITU-T]] X.500 directory series that [[reflect/concepts/ldap|LDAP]] directory implementations are expected to recognize. It defines the shared vocabulary for "white pages" directories: how to represent people, organizations, locations, and groups. This vocabulary — `cn`, `sn`, `o`, `ou`, `person`, `organizationalPerson`, and others — is so widely adopted that it has become the default grammar of enterprise identity systems well beyond LDAP itself.

## Normative Definitions

The user schema was compiled for LDAP use in [[reflect/sources/2026-05-02-rfc2256-txt|RFC 2256]] (December 1997), authored by [[reflect/entities/mark-wahl|Mark Wahl]]. RFC 2256 summarizes attribute types from X.520 and X.501, object classes from X.521, and PKI attributes from X.509. In 2006, [[reflect/sources/2026-05-02-rfc4519-txt|RFC 4519]] superseded RFC 2256 as part of the [[reflect/synthesis/ldap-technical-specification-architecture|RFC 4510 modular reorganization]], carrying forward the same definitions with updates for modern practice.

The core attribute types and object classes drawn from X.520 and X.521 trace directly to the [[reflect/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e|1988 X.500 publication set]] — co-published at the CCITT Melbourne 1988 session alongside X.500 (overview), X.501 (models), X.509 (authentication), and X.511–X.521.

## The Schema vs. the Framework

A common confusion in LDAP: there are two distinct layers of "schema":

1. **Schema framework** — The mechanisms for defining attribute types and object classes: OID syntax, `AttributeTypeDescription` and `ObjectClassDescription` BNF grammars, the subschema entry. Defined in [[reflect/sources/2026-05-02-rfc2252-txt|RFC 2252]] (1997) → RFC 4512 (2006).
2. **User schema** — The actual definitions populating that framework: the standard attribute types (`cn`, `sn`, `telephoneNumber`, etc.) and object classes (`person`, `organization`, etc.). Defined in [[reflect/sources/2026-05-02-rfc2256-txt|RFC 2256]] (1997) → RFC 4519 (2006).

Both layers are necessary. The framework defines layer structure; the user schema populates it. This maps to the [[reflect/synthesis/ldap-schema-architecture|four-layer schema architecture]]: the framework provides layers 1–2 (syntaxes, matching rules) and the description grammars for layers 3–4; the user schema *populates* layers 3–4 with standard, interoperable definitions.

## Core Attribute Types

Two abstract supertypes form the structural base:

- **`name`** (2.5.4.41) — Abstract supertype for string naming attributes. Subclassed by `cn`, `sn`, `o`, `ou`, `c`, `l`, `st`, and others. Unlikely to appear directly in entries.
- **`distinguishedName`** (2.5.4.49) — Abstract base type for DN-valued attributes. Subclassed by `member`, `owner`, `seeAlso`, etc.

Common user-facing attributes:

| Attribute | Meaning | Notes |
|-----------|---------|-------|
| `cn` (commonName) | Person's full name, or object name | Most widely used naming attribute |
| `sn` (surname) | Family name | Required by `person` object class |
| `givenName` | First/given name | |
| `o` (organizationName) | Organization name | Required by `organization` object class |
| `ou` (organizationalUnitName) | Organizational unit name | Required by `organizationalUnit` object class |
| `c` (countryName) | Two-letter ISO 3166 country code | Required by `country`; SINGLE-VALUE |
| `l` (localityName) | City or geographic region | |
| `st` (stateOrProvinceName) | State or province name | |
| `street` | Physical address | |
| `telephoneNumber` | Phone number | |
| `description` | Human-readable description | |
| `title` | Organizational title | e.g., "Vice President" |
| `userPassword` | Password (Octet String, unencrypted) | Cleartext transfer strongly discouraged |

## Core Object Classes

The primary structural object class hierarchy for human and organizational entries:

**`person`** — Base class for human entries. MUST: `sn`, `cn`. MAY: `userPassword`, `telephoneNumber`, `seeAlso`, `description`.

**`organizationalPerson`** (SUP person) — Person within an organization. Adds address, phone, fax, and location attributes. The most common structural class for employee directory entries.

**`organization`** — An organization. MUST: `o`. MAY: wide set of contact and address attributes.

**`organizationalUnit`** — A unit within an organization. MUST: `ou`. MAY: same broad attribute set as `organization`.

**`country`** — A country. MUST: `c` (two-letter ISO 3166 code). MAY: `searchGuide`, `description`.

**`locality`** — A geographic region. MAY: `street`, `seeAlso`, `st`, `l`, `description`.

**`groupOfNames`** — Named collection of entries. MUST: `member` (DN), `cn`. MAY: `businessCategory`, `seeAlso`, `owner`, `ou`, `o`, `description`.

**`groupOfUniqueNames`** — Like `groupOfNames` but uses `uniqueMember` (DN + optional bit string UID) to avoid ambiguity when DNs are reused.

## PKI Object Classes

Several auxiliary classes support X.509 PKI integration:

- **`strongAuthenticationUser`** — MUST `userCertificate`. Added to entries holding an X.509 certificate.
- **`certificationAuthority`** — MUST `authorityRevocationList`, `certificateRevocationList`, `cACertificate`. MAY `crossCertificatePair`.
- **`certificationAuthority-V2`** (SUP certificationAuthority) — Adds `deltaRevocationList` support (new in X.500(96)).
- **`userSecurityInformation`** — MAY `supportedAlgorithms`.

All PKI certificate attributes must be stored and retrieved in binary form (`;binary` transfer option). For the full X.509 PKI framework — certification paths, certificate policies, CRL distribution points, and revocation — see [[reflect/concepts/x509-pki|X.509 PKI]].

## Stability and Wider Reuse

The X.500 user schema is one of the most reused schemas in identity and directory systems. Modern systems that don't use LDAP directly still commonly inherit its vocabulary:

- **Active Directory** uses `cn`, `sn`, `givenName`, `mail`, `telephoneNumber` as standard attributes, extending the X.500 base
- **SAML assertions** frequently carry claim equivalents of `cn` and `mail`
- **SCIM** (System for Cross-domain Identity Management) defines attribute names that parallel the X.500 user schema
- **vCard** (RFC 6350) parallels many of the same person-representation concepts in a different encoding

The attribute vocabulary from RFC 2256 / RFC 4519 is the underlying source of what practitioners think of as "standard" directory attributes, even when accessed through non-LDAP interfaces. Understanding it is prerequisite to understanding why enterprise identity systems converge on the same attribute names across different protocols and vendors.
