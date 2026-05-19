---
title: "ROSE (Remote Operations Service Element)"
summary: "OSI application-layer protocol for request/response operations; the RPC framework underlying X.500 directory protocol operations."
type: concept
created: 2026-05-04
updated: 2026-05-04
subjects:
  - osi-protocols
tags:
  - rose
  - remote-operations
  - osi
  - x880
  - x882
  - x500
  - application-layer
  - rpc
  - asn1
  - itu-t
  - iso
  - invoke
  - return-result
  - return-error
  - operation-package
confidence: high
sources:
  - "[[reflect/sources/2026-05-04-t-rec-x-imp200-200612-i-msw-e]]"
---

**ROSE** (Remote Operations Service Element) is the OSI application-layer framework for request/response (RPC-style) interactions between applications. ROSE provides a structured mechanism for invoking operations, returning results, returning errors, and rejecting malformed PDUs — the full lifecycle of a synchronous remote operation call.

ROSE is defined in two companion recommendations:
- **X.880** (ISO/IEC 13712-1): Remote Operations — Concepts, model and notation
- **X.882** (ISO/IEC 13712-3): Remote Operations — OSI realizations (the actual ROSE protocol)

## Role in X.500 Directory Operations

ROSE is the operation-invocation layer that [[reflect/concepts/x500-distributed-directory|X.500 directory]] protocols use for all substantive requests. Once [[reflect/concepts/acse|ACSE]] has established an application association:

- A DUA (directory user agent) invokes a directory operation (e.g., `search`, `bind`, `modify`) by sending a ROSE Invoke PDU
- The DSA (directory system agent) responds with a ROSE ReturnResult PDU (success) or ReturnError PDU (failure)
- Malformed PDUs trigger a ROSE Reject PDU with a coded RejectProblem

Every X.500 directory operation — read, search, modify, bind, compare — is an instance of a ROSE operation. The X.500 [[reflect/concepts/asn1|ASN.1]] modules define operation objects using the `OPERATION` information object class, and ROSE transports them.

In [[reflect/concepts/ldap|LDAP]], the ROSE layer was eliminated: LDAP protocol messages (LDAPMessage) directly encode operation requests and responses without a separate operation-invocation protocol layer. The message ID, result code, and referral mechanism in LDAP correspond functionally to ROSE invoke IDs, return codes, and ROSE error values — but LDAP expresses them in a single flat encoding.

## ROSE PDU Types

| PDU | Meaning |
|---|---|
| Invoke | Operation invocation — carries invokeId, operationCode, and argument |
| ReturnResult | Successful operation response — carries invokeId and result |
| ReturnError | Failure response — carries invokeId, errorCode, and error parameter |
| Reject | Protocol error — carries invokeId and RejectProblem code |

The `invokeId` links each Invoke to its eventual ReturnResult/ReturnError, allowing concurrent outstanding operations over a single association.

## Information Object Class Framework

X.880 defines [[reflect/concepts/asn1|ASN.1]] information object classes (X.681 constructs) for typed operation definitions:

```asn1
OPERATION ::= CLASS {
    &ArgumentType    OPTIONAL,
    &ResultType      OPTIONAL,
    &Errors          ERROR OPTIONAL,
    &operationCode   Code UNIQUE,
    ...
} WITH SYNTAX { ... }
```

An X.500 operation such as `search` is an instance of the `OPERATION` class, specifying:
- `&ArgumentType`: the `SearchArgument` type
- `&ResultType`: the `SearchResult` type
- `&Errors`: the set of errors this operation can return
- `&operationCode`: the numeric or OID operation code

The `OPERATION-PACKAGE` class groups operations into consumer-invokes/supplier-invokes pairs, and `APPLICATION-CONTEXT` groups packages into a named application context. This typed hierarchy makes the protocol specification machine-checkable using ASN.1 information object constraints.

## Documented Defects (OSI Implementers' Guide)

The [[reflect/sources/2026-05-04-t-rec-x-imp200-200612-i-msw-e|OSI Implementers' Guide v1.1]] records significant corrections to X.880 and X.882, all resolved in Technical Corrigendum 1 (07/1995):

### ReturnResult Structure (X.880 Defect 1)
The `ReturnResult` type had an incorrectly nested structure that made proper ASN.1 encoding ambiguous. The corrected definition:

```asn1
ReturnResult {OPERATION:Operations} ::= SEQUENCE {
    invokeId    InvokeId
        (CONSTRAINED BY {-- outstanding operation --}
         ! RejectProblem : returnResult-unrecognisedInvocation)
        (CONSTRAINED BY {-- which returns a result --}
         ! RejectProblem: returnResult-resultResponseUnexpected),
    result  SEQUENCE {
        opcode  OPERATION.&operationCode({Operations})
            (CONSTRAINED BY {-- identified by invokeId --}
             ! RejectProblem : returnResult-unrecognisedInvocation),
        result  OPERATION.&ResultType({Operations}{@.opcode}
            ! RejectProblem : returnResult-mistypedResult)
    } OPTIONAL
} (CONSTRAINED BY {-- conforms to definition --}
   ! RejectProblem : general-mistypedPDU)
```

### Operation Parameterization Macros (X.880 Defects 1b–d)
The `recode`, `switch`, and `combine` parameterized operations in §10.11–10.13 were incorrectly specified. `recode` (which creates a variant of an operation with a different operation code) was missing the `ALWAYS RESPONDS`, `INVOKE PRIORITY`, and `RESULT-PRIORITY` fields. `switch` and `combine` (which manipulate OPERATION-PACKAGE objects) were corrected to properly enumerate all required fields.

### AllValues and Association-by-RTSE (X.882 Defects)
X.882's `AllValues` type — which aggregates all operations across an application context's operation packages — required two rounds of correction: first to properly apply the `combine` macro to the application context's `OperationsOf`, `InitiatorConsumerOf`, and `ResponderConsumerOf` sets, and second to resolve a compilation error requiring a placeholder `OPERATION-PACKAGE` information object.

The OID for `association-by-rtse` was also wrong: it was defined at `{joint-iso-itu-t association-realizations(10) ...}` rather than the correct `{joint-iso-itu-t remote-operations(4) association-realizations(10) ...}`.

## Relationship to X.500 and LDAP

The corrections to ROSE are significant for X.500 implementers because all X.500 protocol operations (X.511 Directory Abstract Service, X.519 Protocol Specifications) are defined as ROSE operations and packaged into ROSE operation packages. An implementation of X.500 DAP or DSP must correctly implement the ROSE PDU structure — including the corrected `ReturnResult` — to interoperate.

LDAP removes this dependency entirely: its `LDAPMessage` type directly encodes request/response pairs without a ROSE substrate. This simplification was one of LDAP's key design choices that made it deployable without an OSI protocol stack.
