---
title: "Distinguished Name (DN)"
summary: "Hierarchical unique identifier for an LDAP/X.500 directory entry, built from a sequence of Relative Distinguished Names (RDNs) encoding attribute–value pairs."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - distinguished-name
  - dn
  - rdn
  - x500
  - x501
  - utf-8
  - string-representation
  - asn1
  - ber
  - naming
  - directory-access
  - rfc2253
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc2253-txt]]"
  - "[[collection/sources/2026-05-02-rfc4512-txt]]"
  - "[[collection/sources/2026-05-02-rfc4530-txt]]"
---

A Distinguished Name (DN) is the primary key to an entry in an X.500 or [[collection/concepts/ldap|LDAP]] directory. Every entry has exactly one DN, which encodes its full path through the Directory Information Tree (DIT) from the root to the entry itself. DNs are defined in X.501 and serve as the canonical way to identify and address directory entries across all LDAP operations — searches, binds, modifications, and attribute references.

## Structure

A DN is a sequence of **Relative Distinguished Names** (RDNs), defined in ASN.1 as:

```
DistinguishedName ::= RDNSequence
RDNSequence       ::= SEQUENCE OF RelativeDistinguishedName
RelativeDistinguishedName ::= SET SIZE (1..MAX) OF AttributeTypeAndValue
AttributeTypeAndValue ::= SEQUENCE { type AttributeType, value AttributeValue }
```

Each RDN identifies one level of the DIT hierarchy. In the common case, an RDN contains a single AttributeTypeAndValue (AVA) pair — for example, `CN=Alice`. Multi-valued RDNs (containing two or more AVAs) are structurally permitted and are used when a single attribute cannot uniquely identify an entry at a given level.

## String Representation

X.500 encodes DNs in ASN.1 BER. LDAP transfers DNs as UTF-8 strings, using the format defined in RFC 2253 (December 1997) and its 2006 successor RFC 4514. The string encoding rules:

- RDNs are listed from **most specific to most general** (last ASN.1 component first), separated by commas
- Multi-valued RDNs use `+` to separate AVAs
- Each AVA is encoded as `type=value`
- Attribute type names use short descriptors where registered (CN, O, OU, C, DC, UID, ST, L, STREET); otherwise the dotted-decimal OID
- Values are UTF-8 strings with special characters escaped using `\` (backslash prefix for `,`, `+`, `"`, `\`, `<`, `>`, `;`; `\XX` hex encoding for non-printable bytes)
- Values with no string representation are encoded as `#` + hex BER

Example DNs in string form:

```
CN=Steve Kille,O=Isode Limited,C=GB
OU=Sales+CN=J. Smith,O=Widget Inc.,C=US
CN=L. Eagle,O=Sue\, Grabbit and Runn,C=GB
UID=jsmith,DC=example,DC=net
```

## Common Attribute Types in RDNs

| Short Name | Full Attribute Type | Typical Use |
|------------|---------------------|-------------|
| CN | commonName | Person or object name |
| O | organizationName | Organization |
| OU | organizationalUnitName | Department or unit |
| C | countryName | Country (ISO 3166 two-letter) |
| DC | domainComponent | DNS domain label |
| UID | userid | User account identifier |
| ST | stateOrProvinceName | State or province |
| L | localityName | City or locality |

## DN as LDAP Attribute Syntax

The DN syntax (`1.3.6.1.4.1.1466.115.121.1.12`) is one of the core [[collection/concepts/ldap-syntaxes|LDAP attribute syntaxes]]. Attributes like `member`, `seeAlso`, and `manager` have this syntax — their values are DN strings. The `distinguishedNameMatch` matching rule compares DN values structurally: it decomposes each DN into its RDN sequence and applies each AVA attribute type's own equality rule, making it properly case-insensitive for string-typed components.

## Non-Reversibility and Security

The LDAP string encoding of a DN is **not a reversible transformation** to DER. A `commonName` attribute value of `Sam` produces the string `CN=Sam` regardless of whether the underlying ASN.1 encoding used PrintableString or TeletexString — the string form discards that distinction. Applications that require the DER form of a DN (especially for X.509 certificate verification, where signature validation depends on exact DER-encoding) MUST NOT use the LDAP string representation as an intermediate step. They should use the `#hex` BER encoding form instead.

This is a recurring interoperability concern when LDAP directories and PKI systems interact — see [[collection/synthesis/ldap-authentication-security-architecture|LDAP Security Architecture]] for context on the broader authentication model.

## DN Instability and Stable Entry Identity

A DN is a mutable address, not a permanent identifier. The Modify DN operation allows entries to be renamed or moved to a new location in the DIT, and deleted entries leave their former DNs available for reassignment to entirely new objects. This means a client that caches a DN to track a specific person or resource can silently start referring to a different entry after a rename or delete/re-add cycle.

[[collection/concepts/ldap-entry-uuid|`entryUUID`]], defined in [[collection/sources/2026-05-02-rfc4530-txt|RFC 4530]], addresses this directly. It is a server-assigned, immutable operational attribute that holds a UUID (RFC 4122) permanently identifying each entry from creation through any number of renames. The UUID survives Modify DN operations unchanged and is `NO-USER-MODIFICATION` — nothing a client does can alter it. A client that stores both the DN and the `entryUUID` value can detect renames (same UUID, different DN), re-creations (same DN, different UUID), and stable entries (same UUID and DN) with certainty.

## Relationship to RFC 4514

RFC 2253 (December 1997, by [[collection/entities/mark-wahl|Wahl]], [[collection/entities/steve-kille|Kille]], and [[collection/entities/tim-howes|Howes]]) established the DN string format used in LDAPv3. It was superseded by RFC 4514 (June 2006) as part of the [[collection/synthesis/ldap-technical-specification-architecture|RFC 4510 modular reorganization]]. RFC 4514 tightened the grammar and clarified UTF-8 handling but preserved the same core encoding scheme. The [[collection/sources/2026-05-02-rfc2253-txt|RFC 2253 source page]] has details on the original specification.
