---
title: "TLS and StartTLS in LDAP"
summary: "How LDAP establishes transport-layer security: the StartTLS extended operation, server identity verification, ciphersuite requirements, and effects on authorization state."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - tls
  - starttls
  - security
  - authentication
  - server-identity
  - man-in-the-middle
  - certificate
  - rfc4513
  - rfc4346
  - ciphersuite
  - authorization-state
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4511-txt]]"
  - "[[collection/sources/2026-05-02-rfc4513-txt]]"
---

[[collection/concepts/ldap|LDAP]] sessions can be protected by Transport Layer Security (TLS, RFC 4346) in two ways: by connecting directly over TLS (historically port 636, "LDAPS"), or by upgrading an existing plaintext connection using the **StartTLS** extended operation. [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]] specifies StartTLS procedures for LDAP.

## The StartTLS Operation

StartTLS is an LDAP extended operation (OID `1.3.6.1.4.1.1466.20037`) defined in [[collection/sources/2026-05-02-rfc4511-txt|RFC 4511]] §4.14 that installs a TLS layer over an existing LDAP session. TLS provides confidentiality and data integrity; TLS authentication services are available to LDAP only in combination with [[collection/concepts/sasl|SASL EXTERNAL]].

**When StartTLS may be sent** — after session establishment, but NOT when:
- TLS is already established on the session
- A multi-stage SASL negotiation is in progress
- There are outstanding unresponded operation requests

Violations return `operationsError`. Race conditions mean servers may not always detect violations; clients MUST strictly observe these sequencing rules.

**Recommended order**: StartTLS SHOULD be performed before any Bind operation, so that credentials are protected by TLS in transit.

## Server Identity Verification

To prevent man-in-the-middle attacks, clients MUST verify the server's identity by comparing the reference identity (typically the hostname used to connect) against `subjectAltName` values in the server's certificate. The comparison rules depend on the identity type:

| Reference identity type | Certificate field | Matching rule |
|---|---|---|
| DNS name | `dNSName` subjectAltName | Case-insensitive; `*.example.com` wildcards match only the leftmost label; internationalized domain names converted to ACE format (RFC 3490) before comparison |
| IP address | `iPAddress` subjectAltName | Network byte order, octet-for-octet identity |
| Common Name (deprecated) | CN in subject's RDN | DNS name rules apply, but NO wildcard matching |

Matching against CN is supported for backward compatibility but deprecated — CAs are encouraged to provide `subjectAltName` values instead.

If identity verification fails:
- **User-facing clients** SHOULD notify the user and offer the option to continue or close
- **Automated clients** SHOULD close the transport connection and log the failure

Beyond certificate identity, clients may need local policy checks to confirm the server is authorized to provide the requested service.

## Ciphersuite Requirements

RFC 4513 sets a minimum ciphersuite floor:
- MUST support `TLS_RSA_WITH_3DES_EDE_CBC_SHA`
- SHOULD support `TLS_DHE_DSS_WITH_3DES_EDE_CBC_SHA` (for backward compatibility with earlier LDAP StartTLS specs)

Implementers should carefully evaluate ciphersuite strength against data sensitivity: some suites provide no confidentiality; brute-force resistance decreases as CPU speeds increase. A man-in-the-middle can also attempt to negotiate a weaker ciphersuite — both parties must independently verify the achieved security level and close the TLS layer if it is inadequate.

## Effect on Authorization State

Installing, changing, or closing a TLS layer may change the LDAP session's authorization state:

- **After TLS is installed**: Clients SHOULD discard server capabilities information obtained before TLS, since a MITM could have altered it. `supportedSASLMechanisms` in particular commonly differs after TLS — EXTERNAL and PLAIN are typically advertised only post-TLS
- **After TLS closure**: Unlike earlier RFC 2830, RFC 4513 does not require forcing the authorization state to anonymous on TLS closure — local policy governs the transition

## Interaction with SASL EXTERNAL

TLS and [[collection/concepts/sasl|SASL EXTERNAL]] work together: if a client presents a certificate during TLS negotiation, a subsequent SASL EXTERNAL Bind requests that the server derive the authorization identity from those TLS credentials:

- **Implicit assertion**: EXTERNAL Bind without credentials field — server derives authorization identity from TLS credentials per local policy
- **Explicit assertion**: EXTERNAL Bind with credentials field containing the asserted `authzId` — server verifies whether the TLS credentials permit the asserted identity

If no lower-layer credentials exist at the time of the EXTERNAL Bind, it MUST fail with `inappropriateAuthentication`.
