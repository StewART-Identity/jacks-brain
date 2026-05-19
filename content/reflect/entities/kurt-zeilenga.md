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
  - "[[reflect/sources/2026-05-02-rfc4510-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4511-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4512-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4514-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4518-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4529-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4517-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4519-txt]]"
  - "[[reflect/sources/2026-05-02-rfc3062-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4370-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4525-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4527-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4528-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4533-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4530-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4532-txt]]"
  - "[[reflect/sources/2026-05-02-rfc4526-txt]]"
---

Kurt D. Zeilenga is an engineer at the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]] and the primary author of the RFC 4510 series — the 2006 revision of the LDAPv3 Technical Specification that replaced the original December 1997 RFCs (2251–2256) originally driven by [[reflect/entities/netscape-communications|Netscape Communications]] engineers including [[reflect/entities/tim-howes|Tim Howes]].

## RFC Authorship

Zeilenga is sole or lead author on a substantial portion of the LDAPv3 specification:

| RFC | Title | Role |
|---|---|---|
| [[reflect/sources/2026-05-02-rfc3062-txt\|RFC 3062 (2001)]] | LDAP Password Modify Extended Operation | Author |
| RFC 3673 (2003) | LDAPv3: All Operational Attributes | Author |
| [[reflect/sources/2026-05-02-rfc4510-txt\|RFC 4510 (2006)]] | LDAP Technical Specification Road Map | Editor |
| [[reflect/sources/2026-05-02-rfc4511-txt\|RFC 4511 (2006)]] | LDAP: The Protocol | Significant contributor (technical review) |
| [[reflect/sources/2026-05-02-rfc4512-txt\|RFC 4512 (2006)]] | LDAP: Directory Information Models | Author |
| [[reflect/sources/2026-05-02-rfc4514-txt\|RFC 4514 (2006)]] | LDAP: String Representation of Distinguished Names | Editor |
| [[reflect/sources/2026-05-02-rfc4516-txt\|RFC 4516 (2006)]] | LDAP: Uniform Resource Locator | Acknowledged contributor (editors: Smith, Howes) |
| RFC 4517 (2006) | LDAP: Syntaxes and Matching Rules | Significant contributor |
| [[reflect/sources/2026-05-02-rfc4518-txt\|RFC 4518 (2006)]] | LDAP: Internationalized String Preparation | Author |
| RFC 4520 (2006) | IANA Considerations for LDAP | Author |
| [[reflect/sources/2026-05-02-rfc4527-txt\|RFC 4527 (2006)]] | LDAP Read Entry Controls | Author |
| [[reflect/sources/2026-05-02-rfc4528-txt\|RFC 4528 (2006)]] | LDAP Assertion Control | Author |
| RFC 4519 (2006) | LDAP: Schema for User Applications | Acknowledged contributor |
| RFC 4529 (2006) | Requesting Attributes by Object Class in LDAP | Author |
| [[reflect/sources/2026-05-02-rfc4530-txt\|RFC 4530 (2006)]] | LDAP entryUUID Operational Attribute | Author |
| [[reflect/sources/2026-05-02-rfc4525-txt\|RFC 4525 (2006)]] | LDAP Modify-Increment Extension | Author |
| [[reflect/sources/2026-05-02-rfc4526-txt\|RFC 4526 (2006)]] | LDAP Absolute True and False Filters | Author |
| [[reflect/sources/2026-05-02-rfc4532-txt\|RFC 4532 (2006)]] | LDAP "Who am I?" Operation | Author |
| [[reflect/sources/2026-05-02-rfc4533-txt\|RFC 4533 (2006)]] | LDAP Content Synchronization Operation | Co-author (with [[reflect/entities/jong-hyuk-choi\|Jong Hyuk Choi]], IBM) |

His email as listed in the RFCs: `Kurt@OpenLDAP.org`.

## Role in LDAPv3 Standardization

Where the original LDAPv3 RFCs (2251–2256) were a [[reflect/entities/netscape-communications|Netscape]]-led effort, the 2006 RFC 4510 series revision was largely driven by Zeilenga and the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]]. The 4510 series is normative — it obsoletes the 2251–2256 series.

Zeilenga's work concentrated on schema and protocol extensions: Directory Information Models (4512), IANA registration procedures (4520), and protocol feature extensions including the `+` operational attributes selector (3673), the [[reflect/sources/2026-05-02-rfc4525-txt|Modify-Increment Extension]] (4525), read entry controls (4527), the [[reflect/sources/2026-05-02-rfc4529-txt|`@classname` attribute selection shorthand]] (4529), and the [[reflect/sources/2026-05-02-rfc4530-txt|`entryUUID` operational attribute]] (4530) — which introduced the UUID syntax and `uuidMatch` matching rules to address [[reflect/concepts/distinguished-name|DN]] instability. An earlier contribution — [[reflect/sources/2026-05-02-rfc3062-txt|RFC 3062]] (2001) — defined the [[reflect/concepts/ldap-password-modify|Password Modify Extended Operation]], addressing the password-change gap that SASL integration had created.

Note: RFC 4516 ([[reflect/concepts/ldap-url|LDAP URL format]]) is sometimes listed in attributions of Zeilenga's work, but the actual RFC was edited by [[reflect/entities/mark-smith|Mark Smith]] and [[reflect/entities/tim-howes|Tim Howes]]. Zeilenga is thanked in the acknowledgements for "valuable comments" alongside RL "Bob" Morgan, Mark Wahl, Jim Sermersheim, and Hallvard Furuseth.

Zeilenga is acknowledged in [[reflect/sources/2026-05-02-rfc4519-txt|RFC 4519]] (LDAP Schema for User Applications) alongside [[reflect/entities/steven-legg|Steven Legg]] for "significant contribution" to the revision — the update of [[reflect/sources/2026-05-02-rfc2256-txt|RFC 2256]] by [[reflect/entities/mark-wahl|Mark Wahl]] that carries the standard [[reflect/concepts/x500-user-schema|X.500 user schema]] forward into the 2006 series.

Zeilenga is also credited in the acknowledgements of [[reflect/sources/2026-05-02-rfc4370-txt|RFC 4370]] (LDAP Proxied Authorization Control) alongside [[reflect/entities/mark-smith|Mark Smith]], [[reflect/entities/mark-wahl|Mark Wahl]], [[reflect/entities/jim-sermersheim|Jim Sermersheim]], and [[reflect/entities/steven-legg|Steven Legg]] — reflecting his role as a reviewer across the broader LDAP standards community during the 2006 period.

[[reflect/sources/2026-05-02-rfc4533-txt|RFC 4533]] (Content Synchronization Operation) was co-authored with [[reflect/entities/jong-hyuk-choi|Jong Hyuk Choi]] of [[reflect/entities/ibm-corporation|IBM Corporation]]. Published Experimental in June 2006 — simultaneously with the RFC 4510 series — it defines [[reflect/concepts/ldap-content-synchronization|SyncRepl]], which became the de facto LDAP synchronization mechanism despite not being the IETF LDUP working group's consensus solution. The protocol OIDs are in the [[reflect/entities/openldap-foundation|OpenLDAP Foundation]]'s arc (`1.3.6.1.4.1.4203.1.9.1`), consistent with Zeilenga's use of that allocation for LDAP extension prototyping.

[[reflect/sources/2026-05-02-rfc4532-txt|RFC 4532]] defined the [[reflect/concepts/ldap-who-am-i|LDAP "Who am I?" extended operation]] — OID `1.3.6.1.4.1.4203.1.11.3`, in the same `.11` branch as the [[reflect/concepts/ldap-password-modify|Password Modify Extended Operation]] (`.11.1`). The operation provides a post-Bind mechanism for clients to query their current authorization identity, replacing RFC 3829's Bind-control approach which lacked Bind-layer security protection. The RFC acknowledges prior work on RFC 3829 by [[reflect/entities/rob-weltman|Rob Weltman]], [[reflect/entities/mark-smith|Mark Smith]], and [[reflect/entities/mark-wahl|Mark Wahl]].
