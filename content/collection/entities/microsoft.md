---
title: "Microsoft Corp."
summary: "Technology corporation; primary authors of RFC 2696 and RFC 2891 (LDAP controls) and developer of Active Directory, the dominant enterprise LDAP implementation."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - microsoft
  - active-directory
  - ldap
  - ldapv3
  - ietf
  - rfc
  - rfc2696
  - rfc2891
  - ldap-controls
  - server-side-sorting
  - paged-results
  - directory-access
confidence: high
---

Microsoft Corp. is a technology corporation headquartered in Redmond, WA. Microsoft engineers were the primary contributors to [[collection/sources/2026-05-02-rfc2696-txt|RFC 2696]] (LDAP Control Extension for Simple Paged Results, September 1999), with three of the four named authors from Microsoft's Redmond campus:

- **Chris Weider** — `cweider@microsoft.com`
- **Andy Herron** — `andyhe@microsoft.com`
- **Anoop Anantha** — `anoopa@microsoft.com`

The fourth author, [[collection/entities/tim-howes|Tim Howes]], represented [[collection/entities/netscape-communications|Netscape Communications Corp.]]

Anoop Anantha continued this collaboration, co-authoring **[[collection/sources/2026-05-02-rfc2891-txt|RFC 2891]]** (LDAP Control Extension for Server Side Sorting of Search Results, August 2000) alongside Howes (now at Loudcloud) and [[collection/entities/mark-wahl|Mark Wahl]] (now at Sun Microsystems). RFC 2891 defines the [[collection/concepts/ldap-server-side-sorting|server-side sorting]] control pair, extending the same `controls` mechanism as RFC 2696.

Microsoft is also the developer of **Active Directory**, the dominant enterprise [[collection/concepts/ldap|LDAP]] directory implementation. Both the paged results OID (`1.2.840.113556.1.4.319`) and the server-side sorting OIDs (`1.2.840.113556.1.4.473` and `1.2.840.113556.1.4.474`) fall within Microsoft's registered OID arc (`1.2.840.113556`), suggesting both extensions may have originated as proprietary Active Directory features before being submitted to the IETF. Windows 2000 (released February 2000) shipped Active Directory and would have provided the commercial impetus for standardizing these controls during the 1999–2000 period.
