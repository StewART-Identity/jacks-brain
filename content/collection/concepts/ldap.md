---
title: "LDAP (Lightweight Directory Access Protocol)"
summary: "Open TCP/IP protocol for reading and updating directory services, standardized as LDAPv3 in RFC 2251 (December 1997)."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - directory-access
  - tcp-ip
  - asn1
  - ber
  - rfc
  - authentication
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc2254-txt]]"
---

LDAP (Lightweight Directory Access Protocol) is a TCP/IP protocol for reading and modifying directory services — hierarchical databases optimized for read-heavy workloads such as user accounts, group memberships, and organizational data. LDAPv3, defined in RFC 2251 (December 1997), is the version in current widespread use.

## Protocol Basics

LDAP operations include:
- **Bind** — authenticate to the server
- **Search** — query entries matching a filter within a subtree
- **Compare** — test whether an entry has a particular attribute value
- **Add / Delete / Modify** — update operations (requiring authentication)
- **Modify DN** — rename or move an entry

Search operations take a base DN, scope (base/one/sub), [[collection/concepts/ldap-search-filters|search filter]], and list of attributes to return. Filters are encoded on the wire using ASN.1 BER (ITU-T X.690) but expressed in human-readable form using the string syntax defined in [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254]].

## Role in Identity Infrastructure

LDAP is the protocol layer underneath much of enterprise identity infrastructure:
- **Active Directory** exposes an LDAP interface for directory queries (alongside Kerberos for authentication)
- **OpenLDAP** is the canonical open-source LDAP server
- Many SAML identity providers and OAuth authorization servers use an LDAP directory as their user store backend

## Version History

- **LDAPv1** — RFC 1487 (1993), derived from the X.500 DAP
- **LDAPv2** — RFC 1777; string filter syntax in RFC 1960
- **LDAPv3** — RFC 2251–2256 (December 1997), adding SASL authentication, referrals, controls, and extensible matching; authored largely by [[collection/entities/netscape-communications|Netscape Communications]] engineers including [[collection/entities/tim-howes|Tim Howes]]

## Authentication Caveat

At the time of the LDAPv3 standardization, mandatory authentication mechanisms were not yet standardized. The IESG approved the protocol for read-only deployment and interoperability testing, explicitly discouraging update-capable deployments — a caution documented in [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254's IESG note]].
