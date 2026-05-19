---
title: "IBM Corporation"
summary: "Multinational technology company; employer of RFC 4533 co-author Jong Hyuk Choi; developer of IBM Tivoli Directory Server."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ibm
  - rfc
  - content-synchronization
  - directory-services
  - tivoli
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc4533-txt]]"
---

IBM Corporation is a multinational technology company with extensive directory services products, including **IBM Tivoli Directory Server** (an enterprise LDAP server implementation). IBM's organizational presence in LDAP standards work is represented in this wiki by [[reflect/entities/jong-hyuk-choi|Jong Hyuk Choi]], who co-authored [[reflect/sources/2026-05-02-rfc4533-txt|RFC 4533]] (June 2006) with [[reflect/entities/kurt-zeilenga|Kurt Zeilenga]] of the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]].

## LDAP Standards Contributions

IBM's documented contribution to [[reflect/concepts/ldap|LDAP]] standards in this wiki is RFC 4533's [[reflect/concepts/ldap-content-synchronization|Content Synchronization Operation]] (SyncRepl). The collaboration between IBM and the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]] is notable: RFC 4533 carries Experimental status — the LDUP working group had adopted a different approach (RFC 3928, LDAP Client Update Protocol) — suggesting IBM and OpenLDAP were advancing an alternative implementation direction alongside the standards track effort.

The protocol elements in RFC 4533 use OIDs from the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]]'s arc (`1.3.6.1.4.1.4203.1.9.1`), not IBM's, reflecting that the design and OID allocation were led by Zeilenga, with IBM as a co-authoring implementation partner.

## Comparison to Other Vendor Contributions

| Vendor | LDAP Standards Role | OID Arc Used |
|---|---|---|
| [[reflect/entities/netscape-communications\|Netscape Communications]] | Original LDAPv3 core (RFC 2251–2256); Proxy Authorization Control | `2.16.840.1.113730` (Netscape) |
| [[reflect/entities/microsoft\|Microsoft]] | Paged Results (RFC 2696); Server-Side Sorting (RFC 2891) | `1.2.840.113556` (Microsoft) |
| IBM | Content Synchronization (RFC 4533) co-author | `1.3.6.1.4.1.4203` (OpenLDAP) |
| [[reflect/entities/openldap-foundation\|OpenLDAP Foundation]] | RFC 4510 series revision; Password Modify (RFC 3062); Attribute Selection (RFC 4529); RFC 4533 | `1.3.6.1.4.1.4203` (OpenLDAP) |

Unlike Microsoft and Netscape, whose LDAP standards contributions are directly tied to OIDs in their own arcs, IBM's contribution to RFC 4533 leverages the OpenLDAP OID arc — a structural marker of OpenLDAP's primacy in the protocol design even where IBM co-authored.
