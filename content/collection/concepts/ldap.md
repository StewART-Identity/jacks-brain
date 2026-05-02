---
title: "LDAP (Lightweight Directory Access Protocol)"
summary: "Open TCP/IP protocol for reading and updating directory services; LDAPv3 wire protocol is defined in RFC 4511 (2006), which obsoleted RFC 2251 (1997)."
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
  - tls
  - starttls
  - sasl
  - bind
  - search
  - security
  - ldap-controls
  - paged-results
  - object-class
  - ldap-schema
  - attribute-selection
  - syntaxes
  - matching-rules
  - result-codes
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc1487-txt]]"
  - "[[collection/sources/2026-05-02-rfc1777-txt]]"
  - "[[collection/sources/2026-05-02-rfc2251-txt]]"
  - "[[collection/sources/2026-05-02-rfc4510-txt]]"
  - "[[collection/sources/2026-05-02-rfc4511-txt]]"
  - "[[collection/sources/2026-05-02-rfc2254-txt]]"
  - "[[collection/sources/2026-05-02-rfc2696-txt]]"
  - "[[collection/sources/2026-05-02-rfc4529-txt]]"
  - "[[collection/sources/2026-05-02-rfc4513-txt]]"
  - "[[collection/sources/2026-05-02-rfc4517-txt]]"
---

LDAP (Lightweight Directory Access Protocol) is a TCP/IP protocol for reading and modifying directory services — hierarchical databases optimized for read-heavy workloads such as user accounts, group memberships, and organizational data. LDAPv3, defined in RFC 2251 (December 1997), is the version in current widespread use.

## Protocol Basics

LDAP operations include:
- **Bind** — authenticate to the server
- **Search** — query entries matching a filter within a subtree
- **Compare** — test whether an entry has a particular attribute value
- **Add / Delete / Modify** — update operations (requiring authentication)
- **Modify DN** — rename or move an entry

Search operations take a base DN, scope (base/one/sub), [[collection/concepts/ldap-search-filters|search filter]], and list of attributes to return. The attribute list supports three special descriptors: `*` (all user attributes), `+` (all operational attributes, RFC 3673), and `@classname` (all attributes permitted by a named [[collection/concepts/ldap-object-classes|object class]], [[collection/sources/2026-05-02-rfc4529-txt|RFC 4529]]). Filters are encoded on the wire using ASN.1 BER (ITU-T X.690) but expressed in human-readable form using the string syntax defined in [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254]].

LDAPv3 messages carry an optional `controls` field ([[collection/sources/2026-05-02-rfc4511-txt|RFC 4511]] §4.1.11) that allows extension-specific semantics to be attached to any operation. Each [[collection/concepts/ldap-controls|control]] carries a type OID, a `criticality` flag, and optional BER-encoded data. For example, [[collection/concepts/ldap-paged-results|paged results]] ([[collection/sources/2026-05-02-rfc2696-txt|RFC 2696]]) uses a control to let clients retrieve large result sets in pages rather than all at once.

## Role in Identity Infrastructure

LDAP is the protocol layer underneath much of enterprise identity infrastructure:
- **Active Directory** exposes an LDAP interface for directory queries (alongside Kerberos for authentication)
- **OpenLDAP** is the canonical open-source LDAP server
- Many SAML identity providers and OAuth authorization servers use an LDAP directory as their user store backend

## Version History

- **LDAPv1** — [[collection/sources/2026-05-02-rfc1487-txt|RFC 1487]] (July 1993), the inaugural LDAP specification, derived from the X.500 DAP; authored by [[collection/entities/wengyik-yeong|Yeong]], [[collection/entities/tim-howes|Howes]], and [[collection/entities/steve-kille|Kille]]
- **LDAPv2** — [[collection/sources/2026-05-02-rfc1777-txt|RFC 1777]] (March 1995); authentication limited to cleartext password or Kerberos v4; no Controls, no SASL, no Extended operations; string filter syntax in RFC 1960
- **LDAPv3** — RFC 2251–2256 (December 1997), adding SASL authentication, referrals, controls, and extensible matching; authored largely by [[collection/entities/netscape-communications|Netscape Communications]] engineers including [[collection/entities/tim-howes|Tim Howes]]; replaced by the [[collection/sources/2026-05-02-rfc4510-txt|RFC 4510]] series (June 2006), where [[collection/sources/2026-05-02-rfc4511-txt|RFC 4511]] (edited by [[collection/entities/jim-sermersheim|Jim Sermersheim]] of [[collection/entities/novell|Novell]]) is the authoritative protocol specification

## Authentication and Security

LDAP authentication uses the Bind operation, which supports two methods:

- **Simple authentication**: Three mechanisms — anonymous (empty name + empty password), unauthenticated (non-empty name + empty password, for tracing only), and name/password (credentials transmitted in cleartext, requiring TLS protection)
- **SASL authentication**: Pluggable framework (RFC 4422) supporting EXTERNAL, DIGEST-MD5, PLAIN, and others; [[collection/concepts/sasl|SASL]] allows negotiating optional data integrity and confidentiality layers

Transport security is established via the [[collection/concepts/ldap-tls|StartTLS]] extended operation (OID `1.3.6.1.4.1.1466.20037`), which upgrades a plaintext LDAP session to TLS in-flight. [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]] (June 2006) specifies all authentication methods, the StartTLS procedure, server identity verification, and the authorization state model.

Every LDAP session has an associated authorization state that starts anonymous. The Bind operation moves the session to an authenticated state; StartTLS establishment or closure may also affect authorization state. The authorization identity may differ from the authentication identity — SASL permits proxy scenarios where a server authenticates with its own credentials but acts on behalf of another identity.

## Schema: Syntaxes and Matching Rules

Every LDAP attribute has a **syntax** — a data type constraining the structure and format of its values — and optionally one or more **matching rules** defining how values are compared. [[collection/sources/2026-05-02-rfc4517-txt|RFC 4517]] (June 2006, edited by [[collection/entities/steven-legg|Steven Legg]]) defines 34 syntaxes and 32 matching rules for LDAP directories.

The key architectural point: syntaxes and matching rules are **separately defined**. The Directory String syntax permits UTF-8 text; whether that text compares case-sensitively (`caseExactMatch`) or case-insensitively (`caseIgnoreMatch`) is a separately specified matching rule. This allows multiple matching rules to apply to the same syntax.

Common syntaxes include [[collection/concepts/ldap-syntaxes|Directory String]], [[collection/concepts/distinguished-name|DN]], [[collection/concepts/ldap-syntaxes|Generalized Time]], Integer, Boolean, and OID. Each syntax has a unique dotted-decimal OID and an LDAP-specific encoding (usually human-readable ABNF) that differs from the BER encoding used by X.500.

[[collection/concepts/ldap-matching-rules|Matching rules]] operate in three modes — equality, ordering, and substrings — and string rules apply Unicode string preparation algorithms (RFC 4518) before comparison. The `distinguishedNameMatch` rule is particularly complex: it compares [[collection/concepts/distinguished-name|DNs]] structurally by RDN and AVA, recursively invoking each AVA attribute type's own equality rule.

## Authentication Caveat (Historical)

At the time of the LDAPv3 standardization in 1997, mandatory authentication mechanisms were not yet standardized. The IESG approved the protocol for read-only deployment and interoperability testing, explicitly discouraging update-capable deployments — a caution documented in [[collection/sources/2026-05-02-rfc2254-txt|RFC 2254's IESG note]]. This gap was resolved in 2006 by [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]], which established name/password-over-TLS as the mandatory-to-implement password mechanism and defined clear behavior for all authentication cases. [[collection/sources/2026-05-02-rfc4515-txt|RFC 4515]] acknowledged the closure by removing the IESG note.
