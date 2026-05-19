---
title: "LDAP Matching Rules"
summary: "LDAP's comparison semantics layer: matching rules define how attribute values are compared against assertion values in Search and Compare, separate from the syntax that constrains value structure."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-schema
  - matching-rules
  - search
  - equality
  - ordering
  - substrings
  - unicode
  - string-preparation
  - distinguished-name
  - rfc4517
  - rfc4518
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2252-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4517-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4518-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4530-txt]]"
---

**Matching rules** define comparison semantics for [[reflect/concepts/ldap|LDAP]] directory operations. They are deliberately separate from [[reflect/concepts/ldap-syntaxes|syntaxes]]: a syntax constrains what attribute values are legal; a matching rule defines how those values compare against an assertion value in Search filters, Compare operations, and Modify operations (to identify values to delete and to prevent duplicate values). Matching rules were originally defined in [[reflect/sources/2026-05-02-rfc2252-txt|RFC 2252]] (1997) and updated by [[reflect/sources/2026-05-02-rfc4517-txt|RFC 4517]] (2006), which added string preparation algorithms (RFC 4518) and several new rules.

## Why Separate from Syntax?

Separating comparison from representation allows multiple matching rules to apply to the same syntax. Directory String attributes can be compared using `caseIgnoreMatch` (case-insensitive), `caseExactMatch` (case-sensitive), `caseIgnoreOrderingMatch` (alphabetical ordering), or `caseIgnoreSubstringsMatch` (wildcard search). Each rule is independently registered with its own OID and can be referenced independently in attribute type definitions and [[reflect/concepts/ldap-search-filters|extensible match filters]].

A matching rule's assertion value syntax may also differ from the attribute value syntax. Substring matching rules use the `Substring Assertion` syntax for the assertion (the wildcard pattern) while the attribute values use `Directory String` or similar.

## Three Matching Rule Types

**Equality** (`EQUALITY`) — Evaluates to TRUE if the attribute value matches the assertion value. Used in equality filters `(attr=value)` and Compare operations.

**Ordering** (`ORDERING`) — Evaluates to TRUE if the attribute value is "less than" the assertion value. Used in ordering filters `(attr<=value)`, `(attr>=value)`.

**Substrings** (`SUBSTR`) — Evaluates to TRUE if the assertion pattern (with `*` wildcards for initial, any, final positions) matches within the attribute value.

## String Preparation (RFC 4518)

String-based matching rules apply **string preparation algorithms** before comparing, as defined in [[reflect/sources/2026-05-02-rfc4518-txt|RFC 4518]] and described in detail on the [[reflect/concepts/ldap-string-preparation|LDAP String Preparation]] concept page. The steps, in order, are:

1. **Transcode** — convert from LDAP-specific encoding to Unicode
2. **Map** — apply character mapping (case folding for case-ignore rules; no-op for case-exact rules)
3. **Normalize** — Unicode normalization (NFKC)
4. **Prohibit** — reject prohibited code points
5. **Check bidi** — bidirectional characters are ignored (no normative effect in RFC 4518)
6. **Insignificant Character Handling** — strip/normalize whitespace (space handling) or digits depending on the rule type

Steps 1–5 are identical across all string rules. Step 2 (Map) and Step 6 (Insignificant Character Handling) vary by rule: case-ignore rules fold case; case-exact rules do not. numericString rules remove all spaces; telephoneNumber rules remove all spaces and hyphen variants.

## Key Equality Rules

| Rule | OID | Syntax | Notes |
|------|-----|--------|-------|
| `caseIgnoreMatch` | 2.5.13.2 | Directory String | Case-insensitive; most common string rule |
| `caseExactMatch` | 2.5.13.5 | Directory String | Case-sensitive |
| `distinguishedNameMatch` | 2.5.13.1 | DN | Structural RDN/AVA comparison (see below) |
| `generalizedTimeMatch` | 2.5.13.27 | Generalized Time | UTC-normalized equality |
| `objectIdentifierMatch` | 2.5.13.0 | OID | Numeric or descriptor form |
| `integerMatch` | 2.5.13.14 | Integer | Integer value equality |
| `octetStringMatch` | 2.5.13.17 | Octet String | Byte-for-byte equality |
| `booleanMatch` | 2.5.13.13 | Boolean | TRUE/FALSE |
| `telephoneNumberMatch` | 2.5.13.20 | Telephone Number | Insignificant chars removed |
| `caseIgnoreIA5Match` | 1.3.6.1.4.1.1466.109.114.2 | IA5 String | Case-insensitive ASCII |
| `numericStringMatch` | 2.5.13.8 | Numeric String | Spaces stripped |
| `uniqueMemberMatch` | 2.5.13.23 | Name And Optional UID | DN + optional bit string |
| `bitStringMatch` | 2.5.13.16 | Bit String | Bitwise equality |
| `uuidMatch` | 1.3.6.1.1.16.2 | UUID | UUID equality; assertion uses dash-delimited UUID string form (RFC 4530) |

## Key Ordering Rules

| Rule | OID | Behavior |
|------|-----|----------|
| `caseIgnoreOrderingMatch` | 2.5.13.3 | Code-point collation, case-folded |
| `caseExactOrderingMatch` | 2.5.13.6 | Code-point collation, case-sensitive |
| `generalizedTimeOrderingMatch` | 2.5.13.28 | Chronological (UTC-normalized) |
| `integerOrderingMatch` | 2.5.13.15 | Numeric ordering |
| `octetStringOrderingMatch` | 2.5.13.18 | Bit-by-bit lexicographic |
| `numericStringOrderingMatch` | 2.5.13.9 | Code-point order, spaces stripped |
| `uuidOrderingMatch` | 1.3.6.1.1.16.3 | Octet-string ordering on UUID; not meaningful for randomly generated (v4) UUIDs (RFC 4530) |

## Key Substrings Rules

| Rule | OID | Notes |
|------|-----|-------|
| `caseIgnoreSubstringsMatch` | 2.5.13.4 | Case-insensitive wildcard on Directory String |
| `caseExactSubstringsMatch` | 2.5.13.7 | Case-sensitive wildcard |
| `caseIgnoreListSubstringsMatch` | 2.5.13.12 | Wildcards across concatenated Postal Address lines |
| `telephoneNumberSubstringsMatch` | 2.5.13.21 | Phone number with insignificant chars removed |

## distinguishedNameMatch in Detail

The `distinguishedNameMatch` rule performs a structural comparison between two DNs — it does not compare raw string encodings:

- Same number of RDNs (relative distinguished names)
- Corresponding RDNs (by position) have the same number of AVAs (attribute value assertions)
- Each AVA of one RDN matches an AVA of the other by attribute type; order of AVAs within an RDN is insignificant
- AVA values are compared using the **equality matching rule of the AVA's attribute type** — making DN comparison recursive

If any AVA comparison evaluates to Undefined and no comparison is FALSE, the overall result is Undefined.

## First-Component Matching Rules

Three special rules compare an assertion value against only the first component of a structured attribute syntax:

- `objectIdentifierFirstComponentMatch` (2.5.13.30) — for SEQUENCE types with a mandatory first OID (e.g., attribute type descriptions, object class descriptions, matching rule descriptions)
- `directoryStringFirstComponentMatch` (2.5.13.31) — for SEQUENCE types with a mandatory first Directory String
- `integerFirstComponentMatch` (2.5.13.29) — for SEQUENCE types with a mandatory first INTEGER (e.g., DIT structure rule descriptions)

These rules support lookup of [[reflect/concepts/ldap-object-classes|object class]] and attribute type descriptions by OID or name, which is the natural key for schema elements stored in the `subschema` entry.

## Extensible Match Filter

[[reflect/concepts/ldap-search-filters|LDAP search filters]] support an `extensibleMatch` filter that allows clients to explicitly specify a matching rule OID rather than relying on the attribute type's declared default rule. RFC 4517 matching rules SHOULD be usable in extensibleMatch filters where the rule's assertion syntax matches the attribute's value syntax. Servers SHOULD publish rule applicability in the `matchingRuleUse` attribute of the `subschema` entry.

## Security Consideration

RFC 4517 includes an important caveat: when interpreting security-sensitive fields — particularly fields used to grant or deny access — implementations MUST compare on the underlying abstract value, not the particular encoding. Different encodings of the same value must not produce different access-control outcomes.
