---
title: "LDAP Assertion Control"
summary: "An LDAP control (OID 1.3.6.1.1.12) making any operation conditional on a Filter assertion, enabling atomic test-and-set semantics on directory entries."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-controls
  - assertion
  - conditional-operations
  - test-and-set
  - atomicity
  - rfc4528
  - filters
  - ber
  - result-codes
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc4528-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4511-txt]]"
---

The LDAP Assertion Control ([[reflect/sources/2026-05-02-rfc4528-txt|RFC 4528]], June 2006) is an [[reflect/concepts/ldap-controls|LDAP control]] that makes any [[reflect/concepts/ldap|LDAP]] operation conditional on the evaluation of a [[reflect/concepts/ldap-search-filters|Filter]] against the target entry. The `controlType` OID is `1.3.6.1.1.12`. The `controlValue` carries a BER-encoded `Filter` — the same ASN.1 type used in Search requests per RFC 4511 §4.5.1.

## How It Works

The server evaluates the filter against the target entry of the operation before processing the request:

- **Filter = TRUE** → operation proceeds normally
- **Filter = FALSE or Undefined** → operation is not performed; server returns `assertionFailed` (result code 122)

The treatment of Undefined identically to FALSE is intentional: if the assertion cannot be fully evaluated, the operation is blocked rather than silently proceeding.

## Atomic Test-and-Modify Pattern

For Compare and all update operations (Add, Delete, Modify, ModifyDN), the assertion evaluation and the operation itself MUST execute as a single atomic action. This enables "test and set" and "test and clear" patterns:

```
Modify(
  dn: "uid=alice,ou=people,dc=example,dc=com",
  changes: [replace: status = "inactive"],
  controls: [Assertion(filter: "(status=active)")]
)
```

This operation only modifies the entry if `status` currently equals `active` — with no window between the test and the write for another client to intervene. Without atomicity, a separate Read → Modify round trip would introduce a TOCTOU (time-of-check/time-of-use) race.

## Applicable and Inapplicable Operations

**Applicable** (interrogation and update operations): Add, Compare, Delete, Modify, ModifyDN, Search

**Not applicable**: Abandon, Bind, Unbind, StartTLS

For Search, the assertion applies to the `baseObject` field and is evaluated *after* the base entry is found but *before* the subtree search begins. If the assertion fails, no entries or continuation references are returned — the failure is indistinguishable to the client from the base not existing (except for the `assertionFailed` result code).

## Result Code: assertionFailed (122)

RFC 4528 registers a dedicated LDAP result code, `assertionFailed` (122). Clients can distinguish assertion failures from other error categories (access-denied, schema violations, etc.) by inspecting this specific code.

## Security Properties

The control inherits the transport security of the underlying connection — see [[reflect/concepts/ldap-tls|LDAP TLS]] for TLS layer protection. Beyond transport, three properties warrant attention:

1. **Probing risk**: a client with write permission but limited read permission can use assertion failures to infer attribute values, potentially bypassing access controls on read operations. Servers SHOULD apply access controls to assertion evaluation, not just to the guarded operation.
2. **Complexity cost**: complex filters may be expensive; servers SHOULD apply evaluation resource limits.
3. **Filter confidentiality**: assertion filters travel in the control value and may expose sensitive data; TLS protects them in transit.

## Discovery

Servers SHOULD publish OID `1.3.6.1.1.12` in the `supportedControl` attribute of the root DSE (per [[reflect/sources/2026-05-02-rfc4512-txt|RFC 4512]]). A server MAY omit the advertisement and only grant access to authorized clients.

## Place in the Control Landscape

The Assertion Control is one of several controls in this wiki that augment [[reflect/concepts/ldap|LDAP]] operations:

- [[reflect/concepts/ldap-paged-results|Paged Results]] (RFC 2696): controls result-set chunking on Search
- [[reflect/concepts/ldap-server-side-sorting|Server-Side Sorting]] (RFC 2891): orders Search results server-side
- [[reflect/concepts/ldap-proxy-authorization|Proxy Authorization]] (RFC 4370): substitutes authorization identity per-operation

The Assertion Control is the only one of these that gates whether an operation executes at all, rather than modifying how it executes.

A particularly useful three-way combination: Assertion Control + [[reflect/concepts/ldap-modify-increment|Modify-Increment]] ([[reflect/sources/2026-05-02-rfc4525-txt|RFC 4525]]) + [[reflect/concepts/ldap-read-entry-controls|Post-Read Control]] ([[reflect/sources/2026-05-02-rfc4527-txt|RFC 4527]]) enables **atomic test-and-increment**: conditionally increment a counter only if it is below a bound, and return the resulting value — all in one round trip with no TOCTOU window.

For a broader analysis of how controls fit into the LDAPv3 extensibility architecture, see [[reflect/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]].
