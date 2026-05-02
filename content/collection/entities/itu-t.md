---
title: "ITU-T"
summary: "UN telecommunications standards body that developed the X.500 directory series — the normative source for LDAP's attribute types, object classes, and authentication framework."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - x500
  - standards-body
  - x501
  - x509
  - x520
  - x521
  - directory-access
  - ldap
  - iso
  - itu
  - pki
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc2256-txt]]"
---

The **International Telecommunication Union – Telecommunication Standardization Sector** (ITU-T), formerly the **CCITT**, is the United Nations body responsible for international telecommunications standards. In the context of this wiki, ITU-T is significant as the primary standardization vehicle for the **X.500 directory standard series** — the normative framework whose data model [[collection/concepts/ldap|LDAP]] inherits entirely.

## X.500 Directory Standards

The X.500 series is developed jointly by ITU-T and ISO (published in parallel as the ISO 9594 series). Key documents relevant to LDAP:

| ITU-T Rec. | ISO equiv. | Title |
|------------|------------|-------|
| X.500 | ISO 9594-1 | The Directory: Overview of concepts, models and services |
| X.501 | ISO 9594-2 | The Directory: Models |
| X.509 | ISO 9594-8 | The Directory: Authentication Framework |
| X.511 | ISO 9594-3 | The Directory: Abstract Service Definition |
| X.518 | ISO 9594-4 | The Directory: Procedures for Distributed Operation |
| X.519 | ISO 9594-5 | The Directory: Protocol Specifications |
| X.520 | ISO 9594-6 | The Directory: Selected Attribute Types |
| X.521 | ISO 9594-7 | The Directory: Selected Object Classes |

[[collection/sources/2026-05-02-rfc2256-txt|RFC 2256]] draws directly from X.501, X.509, X.520, and X.521 across the 1988, 1993, and 1996 editions to produce the standard user schema for LDAPv3.

## Relationship to LDAP

LDAP was designed as a lightweight, TCP/IP-friendly access protocol for X.500 directories. The relationship is asymmetric:

- **X.500** defines a comprehensive distributed directory system with a full OSI protocol stack (DAP — Directory Access Protocol)
- **LDAP** (originally "Lightweight DAP") retains X.500's data model — [[collection/concepts/distinguished-name|distinguished names]], [[collection/concepts/ldap-object-classes|object classes]], attribute types — while replacing the OSI stack with TCP/IP and simplifying the protocol

Because LDAP inherits X.500's data model wholesale, the attribute types and object classes in [[collection/sources/2026-05-02-rfc2256-txt|RFC 2256]] are literally sourced from ITU-T recommendation text. The `cn` (commonName), `sn` (surname), `o` (organizationName), and `ou` (organizationalUnitName) attribute definitions in every LDAP server worldwide trace to ITU-T X.520.

## X.509 and PKI

X.509 is separately significant beyond directory services as the foundation for TLS/SSL certificate chains, HTTPS, and enterprise PKI. The X.509 PKI attributes compiled in RFC 2256 (`userCertificate`, `cACertificate`, `certificateRevocationList`, etc.) carry the same OID arc (`2.5.4.*`) used in X.509 certificate structures globally. See [[collection/concepts/ldap-tls|LDAP TLS]] for how TLS (itself X.509-based) secures LDAP connections.

## QUIPU Implementation

The ISODE "QUIPU" X.500 implementation — the software suite behind [[collection/entities/isode-ltd|Isode Ltd.'s]] directory heritage — was an early and influential implementation of the X.500 series. RFC 2256 credits QUIPU as the basis for its syntax definitions, reflecting how the X.500 standards and their early implementations co-evolved.
