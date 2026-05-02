---
title: "Kurt Zeilenga"
summary: "OpenLDAP Foundation engineer and primary author of the RFC 4510 series, the 2006 revision of the LDAPv3 Technical Specification."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - openldap
  - ietf
  - rfc
  - directory-access
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4511-txt]]"
  - "[[collection/sources/2026-05-02-rfc4529-txt]]"
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
  - "[[collection/sources/2026-05-02-rfc3062-txt]]"
---

Kurt D. Zeilenga is an engineer at the [[collection/entities/openldap-foundation|OpenLDAP Foundation]] and the primary author of the RFC 4510 series — the 2006 revision of the LDAPv3 Technical Specification that replaced the original December 1997 RFCs (2251–2256) originally driven by [[collection/entities/netscape-communications|Netscape Communications]] engineers including [[collection/entities/tim-howes|Tim Howes]].

## RFC Authorship

Zeilenga is sole or lead author on a substantial portion of the LDAPv3 specification:

| RFC | Title | Role |
|---|---|---|
| [[collection/sources/2026-05-02-rfc3062-txt\|RFC 3062 (2001)]] | LDAP Password Modify Extended Operation | Author |
| RFC 3673 (2003) | LDAPv3: All Operational Attributes | Author |
| RFC 4510 (2006) | LDAP Technical Specification Road Map | Editor |
| [[collection/sources/2026-05-02-rfc4511-txt\|RFC 4511 (2006)]] | LDAP: The Protocol | Significant contributor (technical review) |
| RFC 4512 (2006) | LDAP: Directory Information Models | Author |
| RFC 4516 (2006) | LDAP: Uniform Resource Locator | Co-editor |
| RFC 4517 (2006) | LDAP: Syntaxes and Matching Rules | Significant contributor |
| RFC 4518 (2006) | LDAP: Internationalized String Preparation | Author |
| RFC 4520 (2006) | IANA Considerations for LDAP | Author |
| RFC 4527 (2006) | LDAP Read Entry Controls | Author |
| RFC 4529 (2006) | Requesting Attributes by Object Class in LDAP | Author |

His email as listed in the RFCs: `Kurt@OpenLDAP.org`.

## Role in LDAPv3 Standardization

Where the original LDAPv3 RFCs (2251–2256) were a [[collection/entities/netscape-communications|Netscape]]-led effort, the 2006 RFC 4510 series revision was largely driven by Zeilenga and the [[collection/entities/openldap-foundation|OpenLDAP Foundation]]. The 4510 series is normative — it obsoletes the 2251–2256 series.

Zeilenga's work concentrated on schema and protocol extensions: Directory Information Models (4512), LDAP URLs (4516), IANA registration procedures (4520), and protocol feature extensions including the `+` operational attributes selector (3673), read entry controls (4527), and the [[collection/sources/2026-05-02-rfc4529-txt|`@classname` attribute selection shorthand]] (4529). An earlier contribution — [[collection/sources/2026-05-02-rfc3062-txt|RFC 3062]] (2001) — defined the [[collection/concepts/ldap-password-modify|Password Modify Extended Operation]], addressing the password-change gap that SASL integration had created.
