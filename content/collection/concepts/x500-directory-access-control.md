---
title: "X.500 Directory Access Control"
summary: "The three X.500 access control schemes — basic, simplified, and rule-based — governing authentication, authorization, and mandatory access control in the Directory."
type: concept
created: 2026-05-04
updated: 2026-05-04
subjects:
  - directory-services
tags:
  - x500
  - x501
  - access-control
  - aci
  - authentication
  - authorization
  - basic-access-control
  - simplified-access-control
  - rule-based-access-control
  - clearance
  - security-label
  - mac
  - dsa
  - dua
  - itu-t
confidence: high
sources:
  - "[[collection/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e]]"
---

The [[collection/entities/itu-t|ITU-T]] X.500 Directory defines its access control model normatively in X.501 (Models). The [[collection/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e|2016 eighth edition overview]] describes three access control schemes governing access to the [[collection/concepts/directory-information-tree|DIB]]. These schemes address who may access what information and under what conditions — operating at the level of individual entries, entry components, and attribute values within the [[collection/concepts/x500-distributed-directory|distributed directory]].

## Authentication and Access Control

Two aspects of directory security policy govern access:

**Authentication procedures** verify and propagate the identity of DSAs, directory users, and the origin of information received at an access point. General authentication procedures are defined in X.511. The directory supports:
- Simple authentication: password-based, with optional one-way function protection and password policy enforcement
- Strong authentication: public-key based, using [[collection/concepts/x509-pki|X.509 certificates]]; the directory acts as repository of users' public keys (the original motivation for X.509's creation alongside the 1988 X.500 specification)

**Access control schemes** determine, given a verified identity, what operations and information are permitted.

## Three Access Control Schemes

### Basic Access Control

The original scheme, defined in X.501. For every Directory operation, one or more decision points arise; each decision involves:

- **The component being accessed** — possibly a complete compound entry, or a specific attribute or attribute value
- **The user requesting the operation** — the verified identity from the authentication phase
- **The specific right required** — the right necessary to complete a portion of the operation (read, write, compare, add, delete, browse, etc.)
- **The security policy** — Access Control Information (ACI) specifying the rules governing that component

ACI is specified for areas of the DIT and may span DSA boundaries. When multiple DSAs hold an area, each holds the relevant portion of the ACI. Replication of entries also replicates the associated ACI — see [[collection/concepts/x500-directory-replication]].

### Simplified Access Control

A subset of basic access control, providing reduced capability for simpler deployments. It covers the same decision points but with a more limited specification language for ACI. Administrative authorities choosing simplified access control accept the limitations in exchange for reduced configuration complexity.

### Rule-Based Access Control

A mandatory access control (MAC) model. Each decision involves:

- **A clearance** associated with the requesting user
- **Security labels** associated with the information being accessed
- **Policy rules** mapping clearance–label relationships to access/deny decisions

Rule-based access control can be used:
- In conjunction with simplified access control
- In conjunction with basic access control
- Independently (without either of the other schemes)

The clearance/label model allows the directory to enforce security classifications (e.g., a user with Secret clearance may access Secret-labeled entries but not Top Secret-labeled entries) at the directory service level, without requiring application-layer security logic.

## Access Control Information (ACI)

ACI is the specification of access control rules for an area of the DIT. It covers:
- DIT structure (which entries exist and how they are named)
- Directory user information (the content of entries)
- Directory operational information, including the ACI itself

Administrative authorities define ACI for their portion of the DIT. The enforcement of access rights encompasses controlling access to DIT structure, directory user information, and operational information (including the ACI itself) — enabling the directory to protect its own access control definitions.

## Relationship to LDAP Access Control

[[collection/concepts/ldap|LDAP]] does not define a standard access control model — access control for LDAP servers is implementation-specific. No IETF standard corresponds to X.501's normative access control specification. Vendor implementations (OpenLDAP's ACL system, Active Directory's DACL/SACL model) were informed by the X.500 basic access control concepts but are not derived from or interoperable with the X.501 schemes.

The rule-based clearance/label model corresponds conceptually to MAC systems like SELinux or MLS database access control, but no LDAP protocol-level equivalent exists. LDAP deployments requiring MAC typically implement it at the application layer or within the directory server's proprietary access control system, outside any IETF standard.
