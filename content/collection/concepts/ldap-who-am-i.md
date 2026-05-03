---
title: "LDAP \"Who am I?\" Operation"
summary: "Extended operation (RFC 4532) that returns the server's authorization identity for the current session — post-Bind and security-layer-protected, unlike the earlier RFC 3829 Bind controls."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - extended-operations
  - authorization-identity
  - authzid
  - whoami
  - rfc4532
  - security
  - proxy-authorization
  - bind
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4532-txt]]"
---

The LDAP "Who am I?" operation ([[collection/sources/2026-05-02-rfc4532-txt|RFC 4532]], June 2006) is an [[collection/concepts/ldap|LDAP]] extended operation that lets a client ask the server what authorization identity it is currently associating with the session. Named after the Unix `whoami(1)` command — which displays the effective user ID — it provides the same answer at the directory layer.

## Why It Exists

When a client authenticates via Bind, the server maps supplied credentials to an *authorization identity* — an `authzId` (defined in [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]]) that governs what the client may do on that session. This mapping is not always transparent:

- [[collection/concepts/sasl|SASL]] authentication can produce an `authzId` that differs from the authentication identity
- Server-side policy may map the Bind DN to a normalized or canonical identity
- [[collection/concepts/ldap-proxy-authorization|Proxy authorization]] can substitute a different identity for individual operations

Clients performing auditing, access-control verification, or troubleshooting need to know exactly what authorization identity the server has resolved.

**Why not use RFC 3829?** The prior mechanism (RFC 3829) used Bind request and response controls to communicate the authorization identity. The problem: Bind controls are not protected by the security layers the Bind operation establishes. A response control returned *during* the Bind exchange is visible before the Bind-established TLS or SASL context is active. The "Who am I?" operation is sent *after* a completed Bind, fully inside the established security context.

## Wire Format

OID: `1.3.6.1.4.1.4203.1.11.3` — in the [[collection/entities/openldap-foundation|OpenLDAP Foundation]]'s IANA-assigned OID arc, the same `.11` branch as the [[collection/concepts/ldap-password-modify|Password Modify Extended Operation]] at `.11.1`.

- **Request**: An `ExtendedRequest` with the whoami OID as `requestName` and no `requestValue`.
- **Response**: An `ExtendedResponse` with no `responseName` and a `response` field:
  - Empty — session is anonymous
  - `dn:<DN>` — a [[collection/concepts/distinguished-name|distinguished name]] is the primary authorization identity
  - `u:<userid>` — a non-DN user identifier is the primary authorization identity

## When to Use It

- **Post-Bind verification**: After authenticating, confirm the server resolved the identity as expected before committing to further operations.
- **SASL proxy identity check**: When using SASL with an authorization identity (`authzId`) distinct from the authentication identity, verify the server accepted and correctly applied the substitution.
- **Proxy identity resolution**: Combined with the [[collection/concepts/ldap-proxy-authorization|Proxy Authorization Control]] ([[collection/sources/2026-05-02-rfc4370-txt|RFC 4370]]), probe what authzId the server would associate with a specific assumed proxy identity. Returns `authorizationDenied` (result code 123) if the client lacks proxy rights for the asserted identity.
- **Pre-Bind state check**: The operation can be sent before a Bind to confirm the session is anonymous.

## Constraints

Clients MUST NOT send this request while a Bind is in progress — including between rounds of a multi-stage SASL Bind. The server returns `operationsError` for requests received during an active Bind.

## Relationship to Other Concepts

The "Who am I?" operation plugs into [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]]'s authorization state model: sessions begin anonymous, the Bind operation moves them to an authenticated state, and the authorization identity governs access. The operation provides a read-back mechanism for that state.

The [[collection/concepts/ldap-proxy-authorization|Proxy Authorization Control]] is a complementary operation that temporarily changes the authorization identity for a single operation. The "Who am I?" operation reports the current identity; the Proxy Authorization Control substitutes it per-operation.

As an Extended Operation, "Who am I?" follows the same extensibility pattern as the [[collection/concepts/ldap-password-modify|Password Modify Extended Operation]] (RFC 3062) — new operations identified by OID when the required operation cannot be expressed through existing protocol primitives. For a comparison of all LDAPv3 extensibility mechanisms, see [[collection/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]].
