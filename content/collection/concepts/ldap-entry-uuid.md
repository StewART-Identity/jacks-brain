---
title: "LDAP entryUUID"
summary: "Server-assigned, immutable UUID operational attribute providing stable per-entry identity in LDAP, solving the DN instability problem for client-side tracking."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - uuid
  - entry-uuid
  - operational-attribute
  - stable-identity
  - distinguished-name
  - rfc4530
  - rfc4122
  - ldap-schema
  - directory-access
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4530-txt]]"
---

`entryUUID` is an operational attribute defined in [[collection/sources/2026-05-02-rfc4530-txt|RFC 4530]] (June 2006) that holds a server-assigned Universally Unique Identifier (UUID) for each entry in an LDAP directory. Its defining characteristic is immutability: where a [[collection/concepts/distinguished-name|Distinguished Name]] can change (through renames or deletions and re-creations), the `entryUUID` value assigned to an entry on creation never changes.

## Why entryUUID Exists: The DN Instability Problem

[[collection/concepts/ldap|LDAP]] entries are addressed by their [[collection/concepts/distinguished-name|Distinguished Name]] — a hierarchical path through the DIT. DNs are mutable by design: the Modify DN operation allows entries to be renamed or moved, and deleted entries leave their former DNs available for reassignment. A client that caches a DN to track a specific person or resource can silently start referring to a completely different entry after a rename or delete/re-add cycle.

`entryUUID` solves this by providing an identity anchor that survives:

- **Renames** (Modify DN) — the UUID does not change when an entry is moved or renamed
- **Attribute modifications** — the UUID is `NO-USER-MODIFICATION`; nothing a client or admin does to the entry affects it
- **Subtree moves** — the UUID stays the same even when an entire branch is relocated under a new parent

The only event that ends a UUID's identity is the deletion of the entry itself — and UUIDs are never reused.

## Schema Definition

The `entryUUID` attribute is defined with:

```
( 1.3.6.1.1.16.4 NAME 'entryUUID'
  DESC 'UUID of the entry'
  EQUALITY uuidMatch
  ORDERING uuidOrderingMatch
  SYNTAX 1.3.6.1.1.16.1
  SINGLE-VALUE
  NO-USER-MODIFICATION
  USAGE directoryOperation )
```

As a `directoryOperation` attribute, it is not returned in response to the `*` (all user attributes) selector — clients must request it explicitly, either by name (`entryUUID`) or via the `+` (all operational attributes) selector.

The UUID value is encoded as the standard dash-delimited ASCII string: `597ae2f6-16a6-1027-98f4-d28b5365dc14`. The associated `uuidMatch` [[collection/concepts/ldap-matching-rules|matching rule]] supports equality filters on this form directly.

## Generating UUIDs

Servers generate UUIDs in accordance with RFC 4122 §4, which defines several UUID variants:

- **Version 1** (time-based): encodes a timestamp and a MAC address — provides a natural ordering guarantee
- **Version 4** (random): 122 bits of randomness — most commonly implemented; no ordering guarantee
- **Version 3/5** (name-based, MD5/SHA-1): deterministic from a namespace and name

RFC 4530 does not mandate a specific UUID version — only uniqueness in space and time. In practice, most LDAP server implementations (including OpenLDAP's `slapd`) use randomly generated (version 4) UUIDs. Because version 4 UUIDs have no defined ordering, `uuidOrderingMatch` is defined for completeness but is not semantically meaningful in most deployments.

## Usage Patterns for Directory Clients

**Tracking entries across renames.** Store the `entryUUID` value alongside any cached DN. On reconnect or after detecting a change, search with a UUID equality filter:

```
(entryUUID=597ae2f6-16a6-1027-98f4-d28b5365dc14)
```

This will find the entry regardless of where it has been moved in the DIT.

**Detecting re-creations.** If a search by DN finds an entry whose `entryUUID` differs from the stored value, the entry at that DN is a different object from the one previously tracked — the old object was deleted and a new one created with the same DN.

**Synchronization and replication.** Replication systems like [[collection/concepts/ldap-content-synchronization|LDAP Content Synchronization (SyncRepl)]] use `entryUUID` as the stable key to correlate entries across a rename. The synchronization client can detect that an entry moved (same UUID, different DN) rather than being deleted and replaced (different UUID at the same DN).

## Privacy Note

RFC 4530 notes that UUIDs carry no descriptive information about the entry they identify — unlike a DN, which often encodes a person's name or organizational role. In contexts where the DN's content is sensitive, `entryUUID` can serve as an opaque, privacy-preserving reference identifier.

## Relationship to Other Schema Elements

- [[collection/concepts/distinguished-name|Distinguished Name]] — the mutable addressing mechanism that `entryUUID` complements
- [[collection/concepts/ldap-matching-rules|LDAP Matching Rules]] — `uuidMatch` (equality) and `uuidOrderingMatch` (ordering) are the two matching rules RFC 4530 defines for UUID comparison
- [[collection/concepts/ldap-syntaxes|LDAP Attribute Syntaxes]] — the UUID syntax (OID `1.3.6.1.1.16.1`) is a constrained form of Octet String, encoded as the RFC 4122 dash-delimited string in the LDAP protocol layer
- [[collection/concepts/ldap-content-synchronization|LDAP Content Synchronization]] — SyncRepl depends on `entryUUID` to distinguish entry moves from delete/re-add pairs
