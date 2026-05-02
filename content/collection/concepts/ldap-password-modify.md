---
title: "LDAP Password Modify Extended Operation"
summary: "LDAPv3 extended operation (RFC 3062) for changing passwords when users may have non-DN identities or externally stored passwords."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - extended-operations
  - password-modify
  - sasl
  - tls
  - security
  - oid
  - authentication
  - password-management
  - openldap
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc3062-txt]]"
---

The LDAP Password Modify Extended Operation, defined in [[collection/sources/2026-05-02-rfc3062-txt|RFC 3062]] (February 2001), allows directory clients to update user passwords through a single LDAPv3 extended operation rather than through a standard Modify request. The operation is identified by OID `1.3.6.1.4.1.4203.1.11.1` (`passwdModifyOID`), registered in the [[collection/entities/openldap-foundation|OpenLDAP Foundation]]'s IANA-assigned private enterprise arc.

## Why a Separate Operation Is Needed

Standard LDAP update operations (Modify, ModifyDN) target attributes of a named directory entry. Password changes via Modify require:
1. The user has a directory entry identified by a DN
2. The password is stored as an attribute (e.g., `userPassword`) of that entry
3. The client has write access to that attribute

The integration of [[collection/concepts/sasl|SASL]] into LDAP (RFC 2829) broke this assumption. SASL mechanisms such as DIGEST-MD5 authenticate users by a plain username rather than a DN — the user may have no directory entry at all, and their password may be managed by the SASL service provider rather than stored as a directory attribute. In this model, a Modify operation has no valid target.

RFC 3062 solves this by defining an extended operation that operates at the identity layer rather than the directory-entry layer. The operation communicates a user identity (DN or non-DN), optional old password, and optional new password. Where and how the server stores the password is entirely implementation-defined.

## Protocol Details

The operation uses the LDAPv3 `ExtendedRequest` / `ExtendedResponse` mechanism from RFC 2251 §4.12:

| Field | Direction | Required | Description |
|---|---|---|---|
| `userIdentity` | Request | No | User whose password to change; defaults to current session user if absent |
| `oldPasswd` | Request | No | Current password; if present and wrong, request MUST be rejected |
| `newPasswd` | Request | No | Desired new password; if absent, server generates one |
| `genPasswd` | Response | Conditional | Server-generated password — MUST be returned if the server generated it |

The `userIdentity` string may be an LDAP DN or a non-DN identifier (e.g., a plain username as used in SASL). This is the key distinction from a standard Modify: the operation works on an *identity*, not a *directory entry*.

## Security Model

RFC 3062 imposes a hard precondition: **this operation MUST NOT be used without confidentiality protection**. [[collection/concepts/ldap-tls|StartTLS]] (RFC 2830) satisfying the requirement; the NULL cipher suite is explicitly prohibited. The operation provides no integrity or confidentiality of its own — it relies entirely on the transport security layer.

The operation also SHALL NOT be used anonymously. Servers SHOULD return `confidentialityRequired` if adequate security protections are not in place before accepting the request.

This creates a layered dependency: RFC 3062 → [[collection/concepts/ldap-tls|TLS/StartTLS]] → [[collection/concepts/sasl|SASL]] authentication model — the same layers that [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]] later formalized in the comprehensive LDAP security architecture.

## Extensibility Mechanism

The Password Modify operation uses the `ExtendedRequest` / `ExtendedResponse` mechanism — one of four distinct extensibility patterns in [[collection/concepts/ldap|LDAPv3]]:

1. **Controls** — augment existing operations (e.g., [[collection/concepts/ldap-paged-results|paged results]])
2. **ABNF grammar extension** — extend protocol argument syntax (e.g., [[collection/concepts/ldap-search-filters|search filter]] syntax)
3. **Feature OID** — gate grammar extensions behind `supportedFeatures` discovery
4. **Extended operations** — add entirely new operations identified by OID

Extended operations occupy a different design space from controls: controls attach additional semantics to an existing operation; extended operations replace an existing operation with a new one or introduce operations with no base-protocol analog. Password modification has no adequate analog in the base LDAPv3 operation set under the SASL identity model — hence the need for an extended operation rather than a control.

See [[collection/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]] for a cross-cutting analysis of these patterns across all cataloged RFCs.
