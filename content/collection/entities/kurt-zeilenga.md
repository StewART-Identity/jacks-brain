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
  - "[[collection/sources/2026-05-02-rfc4510-txt]]"
  - "[[collection/sources/2026-05-02-rfc4511-txt]]"
  - "[[collection/sources/2026-05-02-rfc4512-txt]]"
  - "[[collection/sources/2026-05-02-rfc4518-txt]]"
  - "[[collection/sources/2026-05-02-rfc4529-txt]]"
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
  - "[[collection/sources/2026-05-02-rfc4519-txt]]"
  - "[[collection/sources/2026-05-02-rfc3062-txt]]"
  - "[[collection/sources/2026-05-02-rfc4370-txt]]"
  - "[[collection/sources/2026-05-02-rfc4527-txt]]"
  - "[[collection/sources/2026-05-02-rfc4528-txt]]"
  - "[[collection/sources/2026-05-02-rfc4533-txt]]"
  - "[[collection/sources/2026-05-02-rfc4530-txt]]"
  - "[[collection/sources/2026-05-02-rfc4532-txt]]"
---

Kurt D. Zeilenga is an engineer at the [[collection/entities/openldap-foundation|OpenLDAP Foundation]] and the primary author of the RFC 4510 series — the 2006 revision of the LDAPv3 Technical Specification that replaced the original December 1997 RFCs (2251–2256) originally driven by [[collection/entities/netscape-communications|Netscape Communications]] engineers including [[collection/entities/tim-howes|Tim Howes]].

## RFC Authorship

Zeilenga is sole or lead author on a substantial portion of the LDAPv3 specification:

| RFC | Title | Role |
|---|---|---|
| [[collection/sources/2026-05-02-rfc3062-txt\|RFC 3062 (2001)]] | LDAP Password Modify Extended Operation | Author |
| RFC 3673 (2003) | LDAPv3: All Operational Attributes | Author |
| [[collection/sources/2026-05-02-rfc4510-txt\|RFC 4510 (2006)]] | LDAP Technical Specification Road Map | Editor |
| [[collection/sources/2026-05-02-rfc4511-txt\|RFC 4511 (2006)]] | LDAP: The Protocol | Significant contributor (technical review) |
| [[collection/sources/2026-05-02-rfc4512-txt\|RFC 4512 (2006)]] | LDAP: Directory Information Models | Author |
| [[collection/sources/2026-05-02-rfc4516-txt\|RFC 4516 (2006)]] | LDAP: Uniform Resource Locator | Acknowledged contributor (editors: Smith, Howes) |
| RFC 4517 (2006) | LDAP: Syntaxes and Matching Rules | Significant contributor |
| [[collection/sources/2026-05-02-rfc4518-txt\|RFC 4518 (2006)]] | LDAP: Internationalized String Preparation | Author |
| RFC 4520 (2006) | IANA Considerations for LDAP | Author |
| [[collection/sources/2026-05-02-rfc4527-txt\|RFC 4527 (2006)]] | LDAP Read Entry Controls | Author |
| [[collection/sources/2026-05-02-rfc4528-txt\|RFC 4528 (2006)]] | LDAP Assertion Control | Author |
| RFC 4519 (2006) | LDAP: Schema for User Applications | Acknowledged contributor |
| RFC 4529 (2006) | Requesting Attributes by Object Class in LDAP | Author |
| [[collection/sources/2026-05-02-rfc4530-txt\|RFC 4530 (2006)]] | LDAP entryUUID Operational Attribute | Author |
| [[collection/sources/2026-05-02-rfc4532-txt\|RFC 4532 (2006)]] | LDAP "Who am I?" Operation | Author |
| [[collection/sources/2026-05-02-rfc4533-txt\|RFC 4533 (2006)]] | LDAP Content Synchronization Operation | Co-author (with [[collection/entities/jong-hyuk-choi\|Jong Hyuk Choi]], IBM) |

His email as listed in the RFCs: `Kurt@OpenLDAP.org`.

## Role in LDAPv3 Standardization

Where the original LDAPv3 RFCs (2251–2256) were a [[collection/entities/netscape-communications|Netscape]]-led effort, the 2006 RFC 4510 series revision was largely driven by Zeilenga and the [[collection/entities/openldap-foundation|OpenLDAP Foundation]]. The 4510 series is normative — it obsoletes the 2251–2256 series.

Zeilenga's work concentrated on schema and protocol extensions: Directory Information Models (4512), IANA registration procedures (4520), and protocol feature extensions including the `+` operational attributes selector (3673), read entry controls (4527), the [[collection/sources/2026-05-02-rfc4529-txt|`@classname` attribute selection shorthand]] (4529), and the [[collection/sources/2026-05-02-rfc4530-txt|`entryUUID` operational attribute]] (4530) — which introduced the UUID syntax and `uuidMatch` matching rules to address [[collection/concepts/distinguished-name|DN]] instability. An earlier contribution — [[collection/sources/2026-05-02-rfc3062-txt|RFC 3062]] (2001) — defined the [[collection/concepts/ldap-password-modify|Password Modify Extended Operation]], addressing the password-change gap that SASL integration had created.

Note: RFC 4516 ([[collection/concepts/ldap-url|LDAP URL format]]) is sometimes listed in attributions of Zeilenga's work, but the actual RFC was edited by [[collection/entities/mark-smith|Mark Smith]] and [[collection/entities/tim-howes|Tim Howes]]. Zeilenga is thanked in the acknowledgements for "valuable comments" alongside RL "Bob" Morgan, Mark Wahl, Jim Sermersheim, and Hallvard Furuseth.

Zeilenga is acknowledged in [[collection/sources/2026-05-02-rfc4519-txt|RFC 4519]] (LDAP Schema for User Applications) alongside [[collection/entities/steven-legg|Steven Legg]] for "significant contribution" to the revision — the update of [[collection/sources/2026-05-02-rfc2256-txt|RFC 2256]] by [[collection/entities/mark-wahl|Mark Wahl]] that carries the standard [[collection/concepts/x500-user-schema|X.500 user schema]] forward into the 2006 series.

Zeilenga is also credited in the acknowledgements of [[collection/sources/2026-05-02-rfc4370-txt|RFC 4370]] (LDAP Proxied Authorization Control) alongside [[collection/entities/mark-smith|Mark Smith]], [[collection/entities/mark-wahl|Mark Wahl]], [[collection/entities/jim-sermersheim|Jim Sermersheim]], and [[collection/entities/steven-legg|Steven Legg]] — reflecting his role as a reviewer across the broader LDAP standards community during the 2006 period.

[[collection/sources/2026-05-02-rfc4533-txt|RFC 4533]] (Content Synchronization Operation) was co-authored with [[collection/entities/jong-hyuk-choi|Jong Hyuk Choi]] of [[collection/entities/ibm-corporation|IBM Corporation]]. Published Experimental in June 2006 — simultaneously with the RFC 4510 series — it defines [[collection/concepts/ldap-content-synchronization|SyncRepl]], which became the de facto LDAP synchronization mechanism despite not being the IETF LDUP working group's consensus solution. The protocol OIDs are in the [[collection/entities/openldap-foundation|OpenLDAP Foundation]]'s arc (`1.3.6.1.4.1.4203.1.9.1`), consistent with Zeilenga's use of that allocation for LDAP extension prototyping.

[[collection/sources/2026-05-02-rfc4532-txt|RFC 4532]] defined the [[collection/concepts/ldap-who-am-i|LDAP "Who am I?" extended operation]] — OID `1.3.6.1.4.1.4203.1.11.3`, in the same `.11` branch as the [[collection/concepts/ldap-password-modify|Password Modify Extended Operation]] (`.11.1`). The operation provides a post-Bind mechanism for clients to query their current authorization identity, replacing RFC 3829's Bind-control approach which lacked Bind-layer security protection. The RFC acknowledges prior work on RFC 3829 by [[collection/entities/rob-weltman|Rob Weltman]], [[collection/entities/mark-smith|Mark Smith]], and [[collection/entities/mark-wahl|Mark Wahl]].
