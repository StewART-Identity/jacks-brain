---
title: "LDAP Object Classes"
summary: "Schema constructs defining mandatory and optional attributes of LDAP directory entries; SUP inheritance chains allow reuse across class hierarchies."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - object-class
  - ldap-schema
  - directory-access
  - must-may
  - sup-inheritance
  - rfc4512
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4512-txt]]"
  - "[[collection/sources/2026-05-02-rfc4529-txt]]"
---

In [[collection/concepts/ldap|LDAP]], every directory entry belongs to one or more object classes. Object classes are schema constructs defined in [[collection/sources/2026-05-02-rfc4512-txt|RFC 4512]] that govern what attributes an entry may carry. They are the fundamental unit of schema organization in the [[collection/concepts/directory-information-tree|directory information model]].

## Object Class Structure

Each object class definition specifies:

| Field | Meaning |
|---|---|
| OID / short name | Identifier — e.g., `country`, `organizationalPerson` |
| `SUP` | Superclass (enables single inheritance) |
| `MUST` | Attributes entries of this class must have |
| `MAY` | Attributes entries of this class may optionally have |
| Class type | `STRUCTURAL`, `AUXILIARY`, or `ABSTRACT` |

An entry's total allowed attribute set is the union of all `MUST` and `MAY` attributes across all object classes it belongs to, including all inherited attributes via `SUP` chains.

**Example** — the `country` object class (RFC 4519):
- `MUST`: `objectClass`, `c` (two-letter country code)
- `MAY`: `searchGuide`, `description`

## Three Class Types

- **STRUCTURAL**: Defines what the entry *is*. Every entry must have exactly one structural object class chain (root: `top`).
- **AUXILIARY**: Adds extra attributes without changing structural identity. An entry can have multiple auxiliary classes.
- **ABSTRACT**: Cannot be instantiated directly — usable only as a superclass. `top` is the canonical abstract class.

## SUP Inheritance

Object class hierarchies form single-inheritance trees. A class with `SUP otherClass` automatically inherits the parent's `MUST` and `MAY` attributes. For example, `organizationalPerson` (`SUP person`) inherits `person`'s required attributes `cn` and `sn` — so an `organizationalPerson` entry must carry both even though only `person` declares them.

## Relevance to Attribute Selection

[[collection/sources/2026-05-02-rfc4529-txt|RFC 4529]] directly leverages the `MUST`/`MAY`/`SUP` semantics: the `@classname` shorthand in an LDAP search attribute list expands to every attribute the named object class permits (directly or via `SUP`). Object class definitions thus become the authoritative expansion map for what `@country` or `@organization` will return. See also [[collection/concepts/ldap-search-filters|LDAP search filters]] for how entries are selected before attribute projection applies.

## Standard User Object Classes

The object classes most commonly encountered in practice — `person`, `organizationalPerson`, `organization`, `organizationalUnit`, `country`, `locality`, `groupOfNames`, `groupOfUniqueNames`, and PKI auxiliary classes like `certificationAuthority` — are defined in [[collection/sources/2026-05-02-rfc2256-txt|RFC 2256]] (1997) and its 2006 successor RFC 4519. These form the [[collection/concepts/x500-user-schema|X.500 user schema]]: the standard vocabulary for representing people, organizations, and locations in any LDAP directory. The definitions originate from the ISO/[[collection/entities/itu-t|ITU-T]] X.500 series (X.520, X.521) and were compiled for LDAPv3 use by [[collection/entities/mark-wahl|Mark Wahl]].
