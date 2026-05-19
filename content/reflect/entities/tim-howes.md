---
title: "Tim Howes"
summary: "LDAP co-inventor and Netscape engineer who authored key LDAPv3 specification RFCs and co-authored RFC 4515 and RFC 4516 in the 2006 revision."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv2
  - ldapv3
  - netscape
  - loudcloud
  - opsware
  - university-of-michigan
  - ietf
  - rfc
  - rfc1777
  - rfc2891
  - rfc4510
  - search-filters
  - ldap-url
  - server-side-sorting
  - directory-access
  - distinguished-name
  - rfc2253
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc1487-txt]]"
  - "[[reflect/sources/2026-05-02-rfc1777-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2251-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2252-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2253-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2254-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2255-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2696-txt]]"
  - "[[reflect/sources/2026-05-02-rfc2891-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4515-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4516-txt]]"
---

Tim Howes was a software engineer and central contributor to the [[reflect/concepts/ldap|LDAP]] standards effort across nearly a decade of IETF work, spanning both the LDAPv2 and LDAPv3 generations.

## LDAPv2 (1993–1995): University of Michigan

Howes's earliest LDAP work was conducted from the University of Michigan, where he was based at ITD Research Systems (535 W William St., Ann Arbor, MI 48103-4943; phone: +1 313 747-4454; email: `tim@umich.edu`). He co-authored **[[reflect/sources/2026-05-02-rfc1487-txt|RFC 1487]]** (July 1993, LDAPv1) and its successor **[[reflect/sources/2026-05-02-rfc1777-txt|RFC 1777]]** (March 1995, LDAPv2) alongside [[reflect/entities/wengyik-yeong|Wengyik Yeong]] (PSI Inc.) and [[reflect/entities/steve-kille|Steve Kille]] (ISODE Consortium). The University of Michigan was an early center of LDAP development, where the reference implementation was also produced.

## LDAPv3 (1997): Netscape Communications

By the time of the December 1997 RFC publications, Howes had moved to [[reflect/entities/netscape-communications|Netscape Communications Corp.]]'s Mountain View, CA office (501 E. Middlefield Road; email: `howes@netscape.com`). He is listed as co-author on RFC 2251 (LDAPv3 core protocol), **[[reflect/sources/2026-05-02-rfc2252-txt|RFC 2252]]** (attribute syntax definitions), and **[[reflect/sources/2026-05-02-rfc2253-txt|RFC 2253]]** (UTF-8 string representation of [[reflect/concepts/distinguished-name|Distinguished Names]], co-authored with [[reflect/entities/mark-wahl|M. Wahl]] and [[reflect/entities/steve-kille|S. Kille]]). He is sole author of [[reflect/sources/2026-05-02-rfc2254-txt|RFC 2254]] (December 1997 — string representation of [[reflect/concepts/ldap-search-filters|LDAP search filters]]) and co-author (with [[reflect/entities/mark-smith|Mark Smith]]) of [[reflect/sources/2026-05-02-rfc2255-txt|RFC 2255]] (December 1997 — [[reflect/concepts/ldap-url|LDAP URL format]]), and co-author of RFC 2696 ([[reflect/sources/2026-05-02-rfc2696-txt|LDAP Control Extension for Simple Paged Results]], September 1999) alongside [[reflect/entities/microsoft|Microsoft Corp.]] engineers.

By June 2006 he had moved to Opsware, Inc. (Sunnyvale, CA, 599 N. Mathilda Ave.), where he co-authored two RFC 4510-series documents alongside editor [[reflect/entities/mark-smith|Mark Smith]] of Pearl Crescent, LLC:

- **[[reflect/sources/2026-05-02-rfc4515-txt|RFC 4515]]** — LDAP: String Representation of Search Filters. The RFC 4510-series replacement for his original RFC 2254, clarifying the UTF-8 encoding requirement and refining the ABNF grammar.
- **[[reflect/sources/2026-05-02-rfc4516-txt|RFC 4516]]** — LDAP: Uniform Resource Locator. The RFC 4510-series replacement for his original RFC 2255, defining the [[reflect/concepts/ldap-url|`ldap://` URI scheme]] for encoding LDAP search operations and referral targets.

His email on record for the 2006 publications was `howes@opsware.com`. The pairing of RFC 4515 and RFC 4516 authorship reflects the documents' close relationship: the filter string syntax RFC 4515 defines is embedded directly in the LDAP URL format RFC 4516 specifies.

## Loudcloud Interlude (2000)

Between Netscape and Opsware, Howes was affiliated with Loudcloud, Inc. (615 Tasman Dr., Sunnyvale, CA; `howes@loudcloud.com`). In August 2000 he co-authored **[[reflect/sources/2026-05-02-rfc2891-txt|RFC 2891]]** (LDAP Control Extension for Server Side Sorting of Search Results) alongside [[reflect/entities/mark-wahl|Mark Wahl]] (now at Sun Microsystems) and Anoop Anantha ([[reflect/entities/microsoft|Microsoft Corp.]]). RFC 2891 defines a paired [[reflect/concepts/ldap-server-side-sorting|server-side sorting]] control — a `SortKeyList` request control (OID `1.2.840.113556.1.4.473`) and a `SortResult` response control (OID `1.2.840.113556.1.4.474`) — extending the same controls mechanism he had leveraged in RFC 2696. Anantha was also a co-author of RFC 2696, making RFC 2891 a continuation of that cross-company collaboration.
