---
title: "LDAP Proxy Authorization Control"
summary: "Per-operation authorization identity substitution for LDAP: allows a client to run a single operation as a specified identity without re-authenticating."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-controls
  - proxy-authorization
  - authorization-identity
  - oid
  - rfc4370
  - security
  - criticality
  - per-operation
  - sasl
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc4370-txt]]"
---

The LDAP Proxy Authorization Control ([[reflect/sources/2026-05-02-rfc4370-txt|RFC 4370]], February 2006) is an [[reflect/concepts/ldap-controls|LDAP control]] that lets a client request a single directory operation execute under a specified authorization identity — not the identity currently associated with the connection. It is the per-operation counterpart to the session-level authorization identity substitution available via [[reflect/concepts/sasl|SASL]].

## Session-Level vs. Per-Operation Substitution

SASL Bind (as specified in [[reflect/sources/2026-05-02-rfc4513-txt|RFC 4513]]) accepts an optional `authzId` that applies to the entire session — once set, all operations on that connection execute under the proxy identity until the next Bind. The Proxy Authorization Control provides finer granularity: each control-bearing operation specifies its own identity, leaving other operations on the same connection under the connection's normal authorization state.

This design benefits clients that multiplex many users over a single connection. An application server or LDAP proxy handling requests on behalf of hundreds of end users can attach the appropriate identity per operation without maintaining one connection per user.

## Wire Encoding

The control OID is `2.16.840.1.113730.3.4.18`, registered in [[reflect/entities/netscape-communications|Netscape Communications Corp.'s]] OID arc. The `controlValue` carries an `authzId`:

- `dn:<dn>` — a [[reflect/concepts/distinguished-name|distinguished name]]
- `u:<userid>` — a non-DN user identifier
- Empty — anonymous association

## Mandatory Criticality

The criticality flag on the Proxy Authorization Control MUST be present and MUST be TRUE. This is atypical: most [[reflect/concepts/ldap-controls|controls]] either default criticality to FALSE or make it optional. The strict requirement exists because a silently dropped authorization control is a security failure — the operation would proceed under the wrong identity without the client being aware.

With criticality TRUE, a server that cannot process the control MUST reject the entire operation rather than proceed. The only permissible failure mode is an explicit `protocolError` (if the control is absent or has criticality FALSE) or `proxyAuthzFailure` (result code 123, if the client lacks proxy rights for the requested identity). The all-or-nothing guarantee is essential for security-sensitive proxy use cases.

## Access Control and Result Code 123

RFC 4370 specifies the wire format and failure code but not the authorization policy — server policy governs who may proxy as whom. If the client is permitted to assume the requested identity, the operation proceeds as if submitted directly by that identity. If not, the server returns result code `123` (`proxyAuthzFailure`), an IANA-assigned code specific to this control.

Proxy rights may be granted at varying granularity within a directory tree. A client with proxy rights at the root of a search tree may lack rights for specific subtrees; the server evaluates proxy rights per entry, silently omitting entries where rights are absent rather than failing the entire operation. This means a proxied search may return fewer results than the same search executed directly by the target identity.

## Security Implications

The control extends the LDAP authorization model from session scope to operation scope. As with SASL `authzId`, anonymous connections SHOULD NOT be permitted to assume other identities via this control.

Authorization identity strings may be confidential; [[reflect/concepts/ldap-tls|TLS]] should protect the channel when this is a concern. The control operates within the layered security model described in [[reflect/synthesis/ldap-authentication-security-architecture|LDAP Security Architecture: Authentication Gap to RFC 4513]]: it substitutes the authorization identity for a single operation without touching the authentication identity. The authenticated principal remains auditable; the proxy identity governs only what access is permitted for that specific operation.

## Placement in the Extensibility Architecture

RFC 4370 is a controls-mechanism extension, following the same pattern as [[reflect/concepts/ldap-paged-results|Paged Results]] (RFC 2696) and [[reflect/concepts/ldap-server-side-sorting|Server-Side Sorting]] (RFC 2891). What distinguishes it is the mandatory-critical requirement — the first among cataloged controls to mandate `criticality = TRUE` — and its focus on security policy rather than result shaping.

See [[reflect/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility: Controls, Features, and Companion RFCs]] for a comparison of all four LDAPv3 extension patterns.
