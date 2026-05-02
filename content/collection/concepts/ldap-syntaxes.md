---
title: "LDAP Attribute Syntaxes"
summary: "LDAP's data-type layer: syntaxes constrain attribute value structure and encoding; each maps to an ASN.1 type from X.500 but uses human-readable LDAP-specific encodings on the wire."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-schema
  - syntaxes
  - data-types
  - asn1
  - abnf
  - directory-string
  - distinguished-name
  - generalized-time
  - utf-8
  - oid
  - rfc4517
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
---

Every attribute stored in an [[collection/concepts/ldap|LDAP]] directory has a **syntax** — a data type that constrains the structure and format of its values and determines how those values are encoded in the LDAP protocol. Syntaxes are defined in [[collection/sources/2026-05-02-rfc4517-txt|RFC 4517]] and are distinct from [[collection/concepts/ldap-matching-rules|matching rules]], which define comparison semantics. A syntax defines *what values are legal*; matching rules define *how values compare*.

## What a Syntax Specifies

Each syntax defines three things:

1. **LDAP-specific encoding** — how attribute values are represented on the wire in LDAP protocol (RFC 4511). Expressed as ABNF in RFC 4517. Designed to be human-readable wherever possible.
2. **Corresponding ASN.1 type** — the X.500/ASN.1 type the syntax corresponds to, preserving semantic interoperability with X.500 directories that use BER encoding.
3. **OID** — a unique object identifier (e.g., `1.3.6.1.4.1.1466.115.121.1.15` for Directory String). Short descriptive names are not defined for syntaxes; the OID is the normative identifier.

## The Non-Canonical Encoding Caveat

LDAP-specific encodings are **not canonical**. A round-trip through BER (LDAP → BER → LDAP) does not necessarily reproduce the original octets. Two consequences:

- LDAP encodings must not be used where reversibility to DER is required — in particular, when verifying digital signatures, use DER directly.
- Security-sensitive access control fields must be compared at the abstract value level, not by comparing raw encodings. Implementations must ensure matching rule comparisons operate on the underlying abstract value regardless of the encoding path used.

Gateways between LDAP and X.500 must transcode Directory String values per the Transcode step in RFC 4518's string preparation algorithms.

## Key Syntaxes

**Directory String** (`1.3.6.1.4.1.1466.115.121.1.15`) — The most common syntax. UTF-8 encoded string of one or more UCS characters (non-empty). Servers and clients must accept arbitrary UCS code points including non-ASCII. A 64-character Directory String may be more than 64 octets due to UTF-8 variable-length encoding. Corresponds to the `DirectoryString` parameterized ASN.1 type from X.520.

**DN** (`1.3.6.1.4.1.1466.115.121.1.12`) — A distinguished name identifying an LDAP entry, encoded using the RFC 4514 string representation (e.g., `UID=jsmith,DC=example,DC=net`). Note that BER-encoded DNs round-tripped through LDAP encoding are not necessarily reversible, because the chosen string type for DirectoryString components is not preserved in the LDAP encoding.

**Generalized Time** (`1.3.6.1.4.1.1466.115.121.1.24`) — ISO 8601-based datetime. Format: `YYYYMMDDHHmmssZ`. The `Z` suffix (UTC) is strongly preferred over differential timezone offsets. Used for operational attributes like `createTimestamp` and `modifyTimestamp`. Fraction of second, minute, or hour is supported. UTC Time (deprecated predecessor, OID `.53`) uses a two-digit year and lacks some precision.

**Integer** (`1.3.6.1.4.1.1466.115.121.1.27`) — Whole number of unlimited magnitude, represented as an optionally-signed decimal digit string.

**OID** (`1.3.6.1.4.1.1466.115.121.1.38`) — Object identifier; encoded in dotted-decimal form (`1.2.3.4`) or descriptor form (`cn`). Many LDAP OIDs have IANA-registered descriptors (RFC 4520).

**Boolean** (`1.3.6.1.4.1.1466.115.121.1.7`) — Encoded as literal `TRUE` or `FALSE`.

**Octet String** (`1.3.6.1.4.1.1466.115.121.1.40`) — Arbitrary byte sequence; not generally human-readable.

**JPEG** (`1.3.6.1.4.1.1466.115.121.1.28`) — JFIF-encoded image; one of the few binary (non-human-readable) LDAP syntaxes.

**Printable String** (`1.3.6.1.4.1.1466.115.121.1.44`) — Latin alphanumeric plus selected punctuation (space, `'`, `(`, `)`, `+`, `,`, `-`, `.`, `=`, `/`, `:`, `?`). Notably excludes `"` and `@`.

**Country String** (`1.3.6.1.4.1.1466.115.121.1.11`) — Exactly two printable characters; ISO 3166 country codes.

## Schema-Description Syntaxes

Beyond attribute value types, RFC 4517 defines syntaxes for schema elements themselves — the definitions stored in the `subschema` entry that allow LDAP servers to publish their schema over the protocol:

- **Attribute Type Description** — encodes attribute type definitions (like `createTimestamp`)
- **Object Class Description** — encodes [[collection/concepts/ldap-object-classes|object class]] definitions
- **Matching Rule Description** — encodes matching rule definitions
- **LDAP Syntax Description** — self-referential: the description of an LDAP syntax is itself a value of this syntax

These schema-description syntaxes allow schema discovery over the LDAP protocol, enabling clients to introspect server capabilities without out-of-band documentation.

## Suggested Upper Bounds

A syntax may carry a suggested maximum length by appending `{N}` to the OID in an attribute type definition (e.g., `1.3.6.1.4.1.1466.115.121.1.15{64}`). This bound is advisory — the server may allow longer values — and is not part of the syntax's OID.

## Relationship to Matching Rules and Attribute Types

Syntaxes and [[collection/concepts/ldap-matching-rules|matching rules]] are independently defined and registered. An attribute type definition specifies:
- The syntax its values must conform to
- Optionally, which matching rules apply: EQUALITY, ORDERING, SUBSTR

Multiple matching rules may apply to the same syntax (e.g., both `caseIgnoreMatch` and `caseExactMatch` apply to Directory String). A matching rule's assertion value syntax may also differ from the attribute value syntax it applies to — for example, the `Substring Assertion` syntax is used as the assertion syntax for substring matching rules whose attribute values use Directory String.
