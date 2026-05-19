---
title: "Mark Smith"
summary: "IETF contributor who co-authored RFC 2255 (1997 LDAP URLs) at Netscape and later edited RFC 4515 and RFC 4516 in the 2006 RFC 4510 series."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ietf
  - rfc
  - rfc4510
  - rfc2255
  - rfc3829
  - search-filters
  - ldap-url
  - authorization-identity
  - directory-access
  - string-representation
  - netscape
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2255-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4515-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4516-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4370-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4532-txt]]"
---

Mark Smith is a software engineer and IETF contributor who participated in both the original 1997 LDAPv3 standardization effort and the 2006 RFC 4510 revision.

## 1997: Netscape Communications

Smith was affiliated with [[reflect/entities/netscape-communications|Netscape Communications Corp.]] (501 E. Middlefield Rd., Mountain View, CA) at the time of the December 1997 LDAPv3 publications. He co-authored [[reflect/sources/2026-05-02-rfc2255-txt|RFC 2255]] — the original [[reflect/concepts/ldap-url|LDAP URL format]] — alongside [[reflect/entities/tim-howes|Tim Howes]], also of Netscape. RFC 2255 was part of the cluster of December 1997 RFCs that standardized LDAPv3.

## 2006: Pearl Crescent

By June 2006 Smith was affiliated with Pearl Crescent, LLC (Saline, MI), where he served as editor of two companion RFCs in the [[reflect/sources/2026-05-02-rfc4510-txt|RFC 4510]] series — the revision of the LDAPv3 Technical Specification — co-authoring both with [[reflect/entities/tim-howes|Tim Howes]] of Opsware, Inc.:

- **[[reflect/sources/2026-05-02-rfc4515-txt|RFC 4515]]** — LDAP: String Representation of Search Filters. Clarified that the filter string representation is UTF-8-encoded Unicode, introduced formal `valueencoding` ABNF productions to reduce reliance on descriptive text, and aligned the grammar with companion RFCs 4511, 4512, and 4517. Obsoletes [[reflect/sources/2026-05-02-rfc2254-txt|RFC 2254]] (December 1997).

- **[[reflect/sources/2026-05-02-rfc4516-txt|RFC 4516]]** — LDAP: Uniform Resource Locator. Defines the `ldap://` URI scheme for encoding [[reflect/concepts/ldap-url|LDAP search operations and referral targets]] as self-contained strings. Obsoletes RFC 2255 (December 1997).

RFC 4516 is the primary consumer of the string filter syntax standardized in RFC 4515 — the `<filter>` component of an LDAP URL uses the RFC 4515 string representation directly.

Smith is also credited in the acknowledgements of [[reflect/sources/2026-05-02-rfc4370-txt|RFC 4370]] (LDAP Proxied Authorization Control, February 2006) as "formerly of Netscape Communications Corp." — consistent with his trajectory away from Netscape and into Pearl Crescent by the time of the RFC 4510 series. His reviewer credit alongside [[reflect/entities/kurt-zeilenga|Zeilenga]], [[reflect/entities/mark-wahl|Mark Wahl]], [[reflect/entities/jim-sermersheim|Jim Sermersheim]], and [[reflect/entities/steven-legg|Steven Legg]] reflects his continued involvement in the LDAP community beyond his primary editing role.

Smith also co-authored RFC 3829 (July 2004, with [[reflect/entities/rob-weltman|Rob Weltman]] and [[reflect/entities/mark-wahl|Mark Wahl]]) — the Authorization Identity Request and Response Controls, which used Bind controls to return the authorization identity. [[reflect/sources/2026-05-02-rfc4532-txt|RFC 4532]] (2006) acknowledges this prior work and is intended to replace RFC 3829's mechanism with a post-Bind extended operation protected by Bind-established security layers.
