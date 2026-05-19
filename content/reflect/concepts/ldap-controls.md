---
title: "LDAP Controls"
summary: "Extension mechanism that attaches typed, optionally-critical semantics to any LDAP operation via the LDAPMessage controls field."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-controls
  - extensibility
  - oid
  - criticality
  - protocol
  - rfc4511
  - ber
  - request-controls
  - response-controls
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2251-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4511-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2891-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4370-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4527-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4528-txt]]"
---

LDAP controls are an extensibility mechanism first introduced in [[reflect/sources/2026-05-02-rfc2251-txt|RFC 2251]] (December 1997) and carried forward in [[reflect/sources/2026-05-02-rfc4511-txt|RFC 4511]] §4.1.11. They allow additional semantics and arguments to be attached to any [[reflect/concepts/ldap|LDAP]] operation. Controls travel in the `controls` field of the `LDAPMessage` envelope and affect only the message they are attached to.

## Wire Format

```
Controls ::= SEQUENCE OF control Control

Control ::= SEQUENCE {
    controlType   LDAPOID,
    criticality   BOOLEAN DEFAULT FALSE,
    controlValue  OCTET STRING OPTIONAL
}
```

Each control carries:
- **`controlType`**: A dotted-decimal OID uniquely identifying the control
- **`criticality`**: Boolean flag governing server behavior when the control is unrecognized
- **`controlValue`**: Optional BER-encoded extension-specific data (absent if the control carries no value)

## The Criticality Flag

The `criticality` field is the key to graceful degradation:

- **`criticality = TRUE`** (critical): If the server does not recognize the control, determines it is inappropriate for the operation, or is otherwise unwilling to apply it, the server MUST NOT perform the operation and MUST return result code `unavailableCriticalExtension` (12)
- **`criticality = FALSE`** (non-critical): If the server cannot process the control, it MUST ignore the control and proceed normally
- **Response controls and UnbindRequest**: The criticality field SHOULD be FALSE and MUST be ignored by the receiver

This design enables controlled feature negotiation: attaching a non-critical control to a request lets servers that understand it apply the enhanced semantics while servers that do not proceed unchanged. Critical controls enforce an all-or-nothing guarantee — either the enhanced semantics apply in full, or the operation fails cleanly with a defined result code.

## Request vs. Response Controls

Controls sent by clients are *request controls*; those sent by servers are *response controls*. A response control solicited by a request control often shares the same `controlType` OID. Servers list the `controlType` values of recognized request controls in the `supportedControl` attribute of the root DSE.

## Control Combinations

Controls SHOULD NOT be combined unless the combination's semantics are specified. When a combination with undefined or unknown semantics is encountered, the operation fails with `protocolError`. Non-critical controls may be dropped to arrive at a valid combination.

The order of controls in the SEQUENCE is normally ignored. If a server cannot ignore order, the message is considered not well-formed and the operation also fails with `protocolError`.

## Discovery and Specification Requirements

Any specification defining a new control must provide:
- The OID assigned to the `controlType`
- Guidance on what `criticality` value to use
- Whether `controlValue` is present and, if so, its format
- The semantics of the control
- Optionally, semantics for combining it with other controls

Servers advertise the `controlType` OIDs of recognized request controls in the `supportedControl` root DSE attribute. Clients SHOULD check `supportedControl` before relying on critical controls.

## Examples in This Wiki

The controls mechanism is used by several extensions:

- **[[reflect/concepts/ldap-paged-results|Paged Results]]** ([[reflect/sources/2026-05-02-rfc2696-txt|RFC 2696]]): A `SimplePagedResultsControl` (OID `1.2.840.113556.1.4.319`) on Search requests, carrying a page size and server-issued continuation cookie
- **[[reflect/concepts/ldap-server-side-sorting|Server-Side Sorting]]** ([[reflect/sources/2026-05-02-rfc2891-txt|RFC 2891]]): A `SortKeyList` request control (OID `1.2.840.113556.1.4.473`) specifying attribute types and matching rules by which the server should order results, paired with a `SortResult` response control (OID `1.2.840.113556.1.4.474`) reporting sort success or failure
- **[[reflect/concepts/ldap-proxy-authorization|Proxy Authorization]]** ([[reflect/sources/2026-05-02-rfc4370-txt|RFC 4370]]): A mandatory-critical control (OID `2.16.840.1.113730.3.4.18`) that requests a single operation execute under a specified authorization identity, enabling per-operation identity substitution for proxy servers and middleware; the only cataloged control that mandates `criticality = TRUE`
- **[[reflect/concepts/ldap-read-entry-controls|Read Entry Controls]]** ([[reflect/sources/2026-05-02-rfc4527-txt|RFC 4527]]): A Pre-Read control (OID `1.3.6.1.1.13.1`) and Post-Read control (OID `1.3.6.1.1.13.2`) that atomically return the target entry's state before or after an update; when combined with the Assertion Control, enables compare-and-swap semantics on directory entries
- **[[reflect/concepts/ldap-assertion-control|Assertion Control]]** ([[reflect/sources/2026-05-02-rfc4528-txt|RFC 4528]]): A filter-based precondition control (OID `1.3.6.1.1.12`) that blocks any operation unless a specified `Filter` evaluates to TRUE against the target entry; enables atomic "test and set" / "test and clear" patterns; returns `assertionFailed` (122) on failure

RFC 4511 itself does not define any specific controls — it only specifies the controls mechanism. Controls are defined in separate documents.

## Place in the Extensibility Architecture

The controls mechanism is one of four extensibility patterns in [[reflect/concepts/ldap|LDAPv3]]. For a comparison of all four — ABNF extensions, controls, `supportedFeatures` OIDs, and Extended operations — see [[reflect/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]].
