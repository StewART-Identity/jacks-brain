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
  - ldapv3
  - netscape
  - opsware
  - ietf
  - rfc
  - rfc4510
  - search-filters
  - ldap-url
  - directory-access
  - distinguished-name
  - rfc2253
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc2251-txt]]"
  - "[[collection/sources/2026-05-02-rfc2252-txt]]"
  - "[[collection/sources/2026-05-02-rfc2253-txt]]"
  - "[[collection/sources/2026-05-02-rfc2254-txt]]"
  - "[[collection/sources/2026-05-02-rfc2696-txt]]"
  - "[[collection/sources/2026-05-02-rfc4515-txt]]"
  - "[[collection/sources/2026-05-02-rfc4516-txt]]"
---

Tim Howes was a software engineer and central contributor to the [[collection/concepts/ldap|LDAP]] standards effort across nearly a decade of IETF work. He is listed as co-author on RFC 2251 (LDAPv3 core protocol), **[[collection/sources/2026-05-02-rfc2252-txt|RFC 2252]]** (attribute syntax definitions), and **[[collection/sources/2026-05-02-rfc2253-txt|RFC 2253]]** (December 1997 — UTF-8 string representation of [[collection/concepts/distinguished-name|Distinguished Names]], co-authored with [[collection/entities/mark-wahl|M. Wahl]] and [[collection/entities/steve-kille|S. Kille]]). He is sole author of [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254]] (December 1997 — string representation of [[collection/concepts/ldap-search-filters|LDAP search filters]]) and its companion RFC 2255 (December 1997 — LDAP URL format), and co-author of RFC 2696 ([[collection/sources/2026-05-02-rfc2696-txt|LDAP Control Extension for Simple Paged Results]], September 1999) alongside [[collection/entities/microsoft|Microsoft Corp.]] engineers.

At the time of the December 1997 RFC publications, Howes was based at [[collection/entities/netscape-communications|Netscape Communications Corp.]]'s Mountain View, CA office (501 E. Middlefield Road). His email address on record was `howes@netscape.com`.

By June 2006 he had moved to Opsware, Inc. (Sunnyvale, CA, 599 N. Mathilda Ave.), where he co-authored two RFC 4510-series documents alongside editor [[collection/entities/mark-smith|Mark Smith]] of Pearl Crescent, LLC:

- **[[collection/sources/2026-05-02-rfc4515-txt|RFC 4515]]** — LDAP: String Representation of Search Filters. The RFC 4510-series replacement for his original RFC 2254, clarifying the UTF-8 encoding requirement and refining the ABNF grammar.
- **[[collection/sources/2026-05-02-rfc4516-txt|RFC 4516]]** — LDAP: Uniform Resource Locator. The RFC 4510-series replacement for his original RFC 2255, defining the [[collection/concepts/ldap-url|`ldap://` URI scheme]] for encoding LDAP search operations and referral targets.

His email on record for the 2006 publications was `howes@opsware.com`. The pairing of RFC 4515 and RFC 4516 authorship reflects the documents' close relationship: the filter string syntax RFC 4515 defines is embedded directly in the LDAP URL format RFC 4516 specifies.
