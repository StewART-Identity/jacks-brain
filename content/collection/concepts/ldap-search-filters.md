---
title: "LDAP Search Filters"
summary: "Boolean predicate expressions selecting directory entries in LDAP queries; string syntax defined by RFC 4515 (obsoleting RFC 2254)."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - search-filters
  - abnf
  - extensible-matching
  - substring
  - boolean-logic
  - rfc2254
  - rfc4510
  - utf-8
  - directory-access
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4511-txt]]"
  - "[[collection/sources/2026-05-02-rfc2254-txt]]"
  - "[[collection/sources/2026-05-02-rfc4515-txt]]"
---

LDAP search filters are boolean predicate expressions that select entries from an [[collection/concepts/ldap|LDAP]] directory. A filter is applied to a subtree of the directory tree and returns only entries whose attributes satisfy the predicate. On the wire, filters are ASN.1 BER-encoded per the LDAPv3 ASN.1 definition in RFC 4511; in human-readable contexts they use the string syntax specified in [[collection/sources/2026-05-02-rfc4515-txt|RFC 4515]] (June 2006), which obsoletes the earlier [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254]] (December 1997).

## Filter Types

| Type | Example | Meaning |
|---|---|---|
| Equality | `(cn=Alice)` | Attribute equals value exactly |
| Presence | `(mail=*)` | Attribute exists on the entry |
| Substring | `(cn=A*ce)` | Wildcard: initial, any, final components |
| Approximate | `(cn~=Alic)` | Fuzzy/phonetic match |
| Greater-or-equal | `(age>=21)` | Lexicographic ordering |
| Less-or-equal | `(age<=65)` | Lexicographic ordering |
| Extensible | `(cn:1.2.3:=Alice)` | Custom matching rule specified by OID |

## Boolean Composition

Filters compose with `&` (AND), `|` (OR), and `!` (NOT) in prefix notation:

```
(&(objectClass=Person)(|(sn=Jensen)(cn=Babs J*)))
```

This matches Person entries where either `sn=Jensen` or `cn` begins with "Babs J".

## Extensible Matching

LDAPv3 introduced extensible match filters, absent from LDAPv2. They allow:
- A **matching rule OID** to govern comparison semantics (e.g., locale-sensitive ordering)
- The **`:dn` flag** to include DN component attributes in the match evaluation

```
(sn:dn:2.4.6.8.10:=Barney Rubble)
```

This evaluates matching rule `2.4.6.8.10` against `sn`, treating DN-component attributes as if they were entry attributes.

## Character Escaping

Five characters must be backslash-hex-escaped (`\xx`) in filter values: `*` (0x2a), `(` (0x28), `)` (0x29), `\` (0x5c), and NUL (0x00). Any byte may optionally be escaped, supporting arbitrary binary values and non-ASCII UTF-8 characters:

```
(sn=Lu\c4\8di\c4\87)   # UTF-8 encoded non-ASCII characters
(bin=\00\00\00\04)      # four-byte binary value
```

## Presence vs. Substring Ambiguity

The grammar allows both `present` and `substring` productions to yield `attr=*`, but the RFC resolves the ambiguity: `attr=*` with no other components is always interpreted as a presence filter, not a substring match.

## Reuse Beyond Search

The `Filter` ASN.1 type defined in RFC 4511 §4.5.1 is reused by [[collection/concepts/ldap-assertion-control|RFC 4528's Assertion Control]] as the control's value. Any valid search filter can serve as an assertion condition — equality, presence, substring, extensible match, and boolean compositions — applied to the target entry of any LDAP operation (not just Search). This reuse gives the Assertion Control the full expressiveness of LDAP's query language as a precondition mechanism.
