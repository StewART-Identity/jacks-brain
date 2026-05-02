---
title: "OpenLDAP Foundation"
summary: "Non-profit organization maintaining the open-source OpenLDAP LDAP server and sponsoring key 2006 LDAPv3 standardization work."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - openldap
  - ldap
  - ldapv3
  - open-source
  - ietf
  - rfc
  - directory-access
  - oid
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4510-txt]]"
  - "[[collection/sources/2026-05-02-rfc4512-txt]]"
  - "[[collection/sources/2026-05-02-rfc4529-txt]]"
  - "[[collection/sources/2026-05-02-rfc3062-txt]]"
---

The OpenLDAP Foundation is a non-profit organization that maintains OpenLDAP — the canonical open-source implementation of the [[collection/concepts/ldap|Lightweight Directory Access Protocol]]. It is the organizational home of [[collection/entities/kurt-zeilenga|Kurt Zeilenga]], primary author of the RFC 4510 series.

## OpenLDAP Project

OpenLDAP provides `slapd` (Stand-Alone LDAP Daemon) and the accompanying `libldap` client library — widely used as the reference LDAP server on Unix-like systems and as the backend directory for Linux authentication stacks. Where [[collection/entities/microsoft|Microsoft]]'s Active Directory dominates enterprise deployments, OpenLDAP is the dominant open-source alternative.

## Standards Contributions

The foundation holds an IANA-assigned private enterprise OID arc (`1.3.6.1.4.1.4203`) and uses it to assign OIDs for LDAP extensions submitted to the IETF. For example:

- OID `1.3.6.1.4.1.4203.1.11.1` — the `passwdModifyOID` for the [[collection/concepts/ldap-password-modify|Password Modify Extended Operation]] ([[collection/sources/2026-05-02-rfc3062-txt|RFC 3062]], 2001)
- OID `1.3.6.1.4.1.4203.1.5.2` — the `supportedFeatures` value published by servers implementing [[collection/sources/2026-05-02-rfc4529-txt|RFC 4529]]'s `@classname` attribute selection extension

The foundation's prominent role in the 2006 RFC 4510 series represents a shift in LDAP standardization leadership: the original 1997 effort (RFCs 2251–2256) was [[collection/entities/netscape-communications|Netscape]]-led; the 2006 revision that superseded it was driven largely by Zeilenga and OpenLDAP.
