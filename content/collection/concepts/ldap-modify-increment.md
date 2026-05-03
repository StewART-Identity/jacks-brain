---
title: "LDAP Modify-Increment Extension"
summary: "Adds an increment(3) operation type to LDAP ModifyRequest, atomically adding a delta to integer attributes without a read-modify-retry loop."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-modify
  - increment
  - provisioning
  - atomicity
  - uid-number
  - rfc4525
  - integer
  - supported-features
  - oid
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4525-txt]]"
  - "[[collection/sources/2026-05-02-rfc4511-txt]]"
  - "[[collection/sources/2026-05-02-rfc4527-txt]]"
  - "[[collection/sources/2026-05-02-rfc4528-txt]]"
---

The LDAP Modify-Increment Extension ([[collection/sources/2026-05-02-rfc4525-txt|RFC 4525]], June 2006) adds a fourth operation type — `increment (3)` — to the [[collection/concepts/ldap|LDAP]] `ModifyRequest`, enabling clients to atomically add a delta to all existing values of an integer attribute. It eliminates the read-modify-retry loop previously required to increment counters in directory entries.

## The Core Problem

Before RFC 4525, incrementing an attribute required three round trips with a TOCTOU window between the read and the write:

```
1. Search → read current uidNumber (e.g., 1042)
2. Modify → replace uidNumber with 1043
3. If another client modified between 1 and 2: start over
```

RFC 4525 collapses this to a single atomic operation.

## The increment(3) Operation Type

[[collection/sources/2026-05-02-rfc4511-txt|RFC 4511]] defines three `ModifyRequest` operation type values:

| Value | Operation |
|---|---|
| 0 | add |
| 1 | delete |
| 2 | replace |
| **3** | **increment** (RFC 4525) |

The `increment` change increments **all** existing values of the target attribute by the specified delta. Constraints:

- The modification MUST supply exactly one value (the delta); providing zero or multiple values is a `protocolError`
- The attribute MUST support incrementable values (e.g., INTEGER syntax); mismatched types MUST return `constraintViolation` or an appropriate error
- Servers not implementing the extension see the `3` enumeration as an unknown protocol value and return a protocol error

## Feature Discovery (OID 1.3.6.1.1.14)

Servers implementing Modify-Increment SHOULD publish `1.3.6.1.1.14` in the `supportedFeatures` attribute of the root DSE. Clients SHOULD check for this OID before using `increment`. The OID is in the IANA-assigned LDAP arc (`1.3.6.1.1`), consistent with the [[collection/concepts/ldap-read-entry-controls|Read Entry Controls]] (`1.3.6.1.1.13.x`) and [[collection/concepts/ldap-assertion-control|Assertion Control]] (`1.3.6.1.1.12`).

## Provisioning Use Case

The primary motivation in the RFC is provisioning — specifically managing a max-counter entry that tracks the highest assigned UID:

```ldif
dn: cn=max-assigned uidNumber,dc=example,dc=com
changetype: modify
increment: uidNumber
uidNumber: 1
-
```

This single Modify atomically increments `uidNumber` by 1 on the server, regardless of concurrent clients doing the same.

## Combination with Pre-Read, Post-Read, and Assertion Controls

RFC 4525 is designed to compose with other [[collection/concepts/ldap|LDAP]] controls:

**With [[collection/concepts/ldap-read-entry-controls|Post-Read Control]] ([[collection/sources/2026-05-02-rfc4527-txt|RFC 4527]])**: the increment and the read of the resulting value are atomic — the client learns the new assigned UID without a separate Search round trip.

**With [[collection/concepts/ldap-assertion-control|Assertion Control]] ([[collection/sources/2026-05-02-rfc4528-txt|RFC 4528]])**: the increment only executes if a precondition holds — yielding **test-and-increment** semantics. For example: "only increment if the counter is below a maximum bound."

**All three together**: a single atomic operation that conditionally increments the counter and returns the new value — covering what previously required a multi-step optimistic retry loop.

## LDIF Syntax

RFC 4525 extends the LDIF ABNF `<mod-spec>` production:

```
mod-spec =/ "increment:" FILL AttributeDescription SEP attrval-spec "-" SEP
```

The `increment:` change type is the LDIF representation; on the wire, it uses the `increment (3)` ModifyRequest enumeration.

## Extension Mechanism

Unlike the [[collection/concepts/ldap-controls|LDAP controls mechanism]] (which augments the `LDAPMessage` envelope) or the `ExtendedRequest`/`ExtendedResponse` pattern (which introduces entirely new operations), Modify-Increment extends the **operation type enumeration** inside an existing operation. It is a rare LDAP extension pattern: modifying the core operation vocabulary of a base protocol operation rather than wrapping it. Discovery relies on `supportedFeatures`, the same mechanism used by [[collection/sources/2026-05-02-rfc4526-txt|RFC 4526]] (Absolute True/False Filters).

For a cross-cutting analysis of how this fits among all five LDAP extension patterns, see [[collection/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]].
