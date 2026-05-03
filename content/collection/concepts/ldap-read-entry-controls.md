---
title: "LDAP Read Entry Controls"
summary: "Pre-Read and Post-Read controls that atomically capture a directory entry's state before or after an update, enabling audit and compare-and-swap patterns."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-controls
  - pre-read
  - post-read
  - atomicity
  - rfc4527
  - operational-attributes
  - compare-and-swap
  - audit
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4527-txt]]"
---

The LDAP Read Entry Controls, defined in [[collection/sources/2026-05-02-rfc4527-txt|RFC 4527]], are a pair of [[collection/concepts/ldap-controls|LDAP controls]] that allow a client to read the target entry of an update operation as an atomic part of that operation. The **Pre-Read** control returns the entry's state *before* the update; the **Post-Read** control returns it *after*.

## The Two Controls

| Control | OID | Applicable to | Returns |
|---|---|---|---|
| Pre-Read | `1.3.6.1.1.13.1` | Modify, Delete, ModifyDN | Entry state before update |
| Post-Read | `1.3.6.1.1.13.2` | Add, Modify, ModifyDN | Entry state after update |

Each request control carries a BER-encoded `AttributeSelection` specifying which attributes to return. Each response control carries a BER-encoded `SearchResultEntry`. If the update fails, no response control is returned.

The controls' OIDs sit in the IANA-assigned LDAP arc (`1.3.6.1.1`), and servers implementing them SHOULD publish those OIDs in `supportedControl` in the root DSE (per [[collection/sources/2026-05-02-rfc4512-txt|RFC 4512]]).

## Atomicity Guarantee

The defining property of both controls is atomicity: the update and the read execute as a single atomic action, isolated from concurrent updates. No intervening modification can occur between the snapshot and the write. This is stronger than a separate pre-read Search followed by a Modify — that sequence has a TOCTOU window; the Pre-Read control does not.

## Use Cases

**Pre-Read** is suited for:
- Auditing: capturing replaced or deleted attribute values from a Modify before they are overwritten
- Tombstoning: obtaining the entry's full state before it is deleted

**Post-Read** is suited for:
- Reading server-assigned operational attributes set during the write — most commonly [[collection/concepts/ldap-entry-uuid|`entryUUID`]] ([[collection/sources/2026-05-02-rfc4530-txt|RFC 4530]]) and `modifyTimestamp` ([[collection/sources/2026-05-02-rfc4512-txt|RFC 4512]]), which the server populates as a side effect of any successful update
- Confirming the resulting state of an entry after modification, without a separate round trip

## Combination with Assertion Control

The most powerful combination is Pre-Read + [[collection/concepts/ldap-assertion-control|Assertion Control]] ([[collection/sources/2026-05-02-rfc4528-txt|RFC 4528]]) + a Modify or Delete operation. Together they implement **atomic compare-and-swap** on a directory entry:

1. The Assertion Control gates execution: "only proceed if this filter currently evaluates to TRUE against the target entry"
2. The Pre-Read control captures the entry state that satisfied the assertion
3. The operation executes if and only if both conditions hold

This gives clients a primitive for optimistic concurrency control over directory data — without exposing a TOCTOU window between a separate read and write, and without requiring server-side transaction support beyond what RFC 4527 requires.

## Relationship to X.500 DAP

The Pre-Read and Post-Read controls are explicitly modeled after equivalent capabilities in the X.500 Directory Access Protocol (DAP, X.511). This is one of several points where the [[collection/concepts/ldap|LDAPv3]] extension suite converged with X.500 capabilities that were absent from the original 1997 core.
