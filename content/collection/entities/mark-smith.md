---
title: "Mark Smith"
summary: "IETF contributor who edited RFC 4515 (search filter syntax) and RFC 4516 (LDAP URLs) in the 2006 RFC 4510 series, affiliated with Pearl Crescent, LLC."
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
  - search-filters
  - ldap-url
  - directory-access
  - string-representation
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4515-txt]]"
  - "[[collection/sources/2026-05-02-rfc4516-txt]]"
---

Mark Smith is a software engineer and IETF contributor affiliated with Pearl Crescent, LLC in Saline, MI. He served as editor of two companion RFCs in the June 2006 [[collection/sources/2026-05-02-rfc4510-txt|RFC 4510]] series — the revision of the LDAPv3 Technical Specification — co-authoring both with [[collection/entities/tim-howes|Tim Howes]] of Opsware, Inc.:

- **[[collection/sources/2026-05-02-rfc4515-txt|RFC 4515]]** — LDAP: String Representation of Search Filters. Clarified that the filter string representation is UTF-8-encoded Unicode, introduced formal `valueencoding` ABNF productions to reduce reliance on descriptive text, and aligned the grammar with companion RFCs 4511, 4512, and 4517. Obsoletes [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254]] (December 1997).

- **[[collection/sources/2026-05-02-rfc4516-txt|RFC 4516]]** — LDAP: Uniform Resource Locator. Defines the `ldap://` URI scheme for encoding [[collection/concepts/ldap-url|LDAP search operations and referral targets]] as self-contained strings. Obsoletes RFC 2255 (December 1997).

RFC 4516 is the primary consumer of the string filter syntax standardized in RFC 4515 — the `<filter>` component of an LDAP URL uses the RFC 4515 string representation directly.
