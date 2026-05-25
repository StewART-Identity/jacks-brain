---
title: "SASL (Simple Authentication and Security Layer)"
summary: "Protocol framework (RFC 4422) for plugging interchangeable authentication mechanisms into application protocols such as LDAP, IMAP, and SMTP."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - sasl
  - authentication
  - ldap
  - security
  - rfc4422
  - external
  - digest-md5
  - plain
  - anonymous
  - authorization-identity
  - challenge-response
  - saslprep
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc4513-txt]]"
quiz:
  - q: "What is SASL designed to separate, and why does that separation matter?"
    a: "SASL separates the protocol integration profile (how a specific application protocol like LDAP initiates and conducts SASL exchanges) from the mechanism (the actual authentication algorithm). This means a protocol that integrates SASL acquires all current and future SASL mechanisms for free, without embedding mechanism-specific logic."
    added: 2026-05-25
  - q: "What is the distinction between authentication identity and authorization identity in SASL?"
    a: "Authentication identity is the entity whose credentials are verified (proving who they are). Authorization identity is the entity whose access privileges apply to the session. They may differ — for example, a proxy server might authenticate with its own credentials but request the access privileges of a user it's proxying."
    added: 2026-05-25
  - q: "What is a SASL downgrade attack, and how can clients detect it?"
    a: "A man-in-the-middle modifies the supportedSASLMechanisms attribute before data integrity is installed, downgrading the advertised list to weak mechanisms. Clients should retrieve this attribute again after installing data integrity and compare; if the protected list contains stronger mechanisms than the unprotected one, the unprotected list was tampered with."
    added: 2026-05-25
---

SASL (Simple Authentication and Security Layer), defined in RFC 4422 (June 2006), is a framework that allows application protocols to use interchangeable authentication mechanisms without embedding mechanism-specific logic into each protocol. SASL separates the *protocol integration profile* (how a specific protocol initiates and conducts SASL exchanges) from the *mechanism* (the actual authentication algorithm). A protocol that integrates SASL acquires all current and future SASL mechanisms for free.

## How SASL Works

A SASL exchange is a sequence of server challenges and client responses, each carrying mechanism-specific binary tokens. The protocol layer treats these tokens as opaque; only the mechanism implementation interprets them:

1. **Mechanism selection**: Client proposes a mechanism from the server's advertised list
2. **Exchange**: One or more challenge/response rounds; the protocol layer forwards opaque tokens
3. **Outcome**: Success (with optional final server data), or failure

Some mechanisms define the client to send data first (initial response); others begin with a server challenge. SASL specifies how protocols accommodate both patterns.

## Authentication vs. Authorization Identity

SASL introduces an important distinction:

- **Authentication identity**: The entity whose credentials are verified (the party proving who they are)
- **Authorization identity**: The entity whose access privileges apply (the party whose permissions govern the session)

These may differ. A proxy server might authenticate with its own credentials but request the access privileges of the user it proxies. In [[reflect/concepts/ldap|LDAP]], the SASL `authzId` takes one of two forms:
- `dn:<DN>` — a distinguished name, matched via `distinguishedNameMatch` matching rules
- `u:<userid>` — a free-form user identifier, normalized via SASLprep (RFC 4013) before octet-wise comparison

A `uAuthzId` SHOULD NOT be assumed globally unique. `dnAuthzId` values need not refer to an existing directory entry.

The SASL `authzId` applies for the *entire session* from Bind onward. For per-operation authorization identity substitution — specifying a different identity for each individual LDAP operation without re-binding — see the [[reflect/concepts/ldap-proxy-authorization|LDAP Proxy Authorization Control]] ([[reflect/sources/2026-05-02-rfc4370-txt|RFC 4370]]).

## Security Layers

Beyond authentication, SASL mechanisms may negotiate *security layers* providing data integrity and/or confidentiality. In LDAP, SASL layers stack on top of any TLS layer, regardless of negotiation order. SASL layers take effect after the final successful Bind response's first octet and persist through subsequent failed or non-SASL Binds.

## Key SASL Mechanisms in LDAP

| Mechanism | Description | Notes |
|---|---|---|
| EXTERNAL | Use credentials from lower layer (e.g., TLS certificate) | Requires TLS client certificate or other lower-layer credential |
| DIGEST-MD5 | Challenge/response MD5 hash; password not sent in cleartext | Formerly mandatory-to-implement per RFC 2829; now historical per RFC 4513 |
| PLAIN | Plaintext username and password | Functionally equivalent to simple name/password Bind; requires TLS |
| ANONYMOUS | Explicit anonymous authentication | Rarely used in LDAP which has native anonymous Bind |

Per [[reflect/sources/2026-05-02-rfc4513-txt|RFC 4513]], the mandatory-to-implement password-based mechanism is now **name/password Bind protected by TLS** — replacing DIGEST-MD5, which was required by the earlier RFC 2829. DIGEST-MD5 is useful because it never transmits the password to the server (only a hash), but offline dictionary attack vulnerability limits its value.

## SASL in LDAP

[[reflect/concepts/ldap|LDAP]]'s SASL service name is `ldap`. SASL authentication uses the Bind operation's `sasl` authentication choice. Servers advertise supported mechanisms in the `supportedSASLMechanisms` root DSE attribute and SHOULD allow all clients — including anonymous ones — to read it both before and after the SASL exchange, enabling downgrade-attack detection.

**Downgrade attack**: A man-in-the-middle can modify `supportedSASLMechanisms` before data integrity is installed, downgrading the advertised list to weak mechanisms. Clients should retrieve this attribute again after installing data integrity and compare the lists — if the integrity-protected list contains stronger mechanisms than the unprotected one, assume the unprotected list was tampered with.

See [[reflect/sources/2026-05-02-rfc4513-txt|RFC 4513]] for the complete LDAP-SASL protocol profile, and [[reflect/concepts/ldap-tls|TLS and StartTLS in LDAP]] for how SASL EXTERNAL and TLS interact.
