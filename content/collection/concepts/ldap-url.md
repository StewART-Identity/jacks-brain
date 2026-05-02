---
title: "LDAP URL"
summary: "ldap:// URI scheme encoding an LDAP search operation or referral target as a self-contained string; defined by RFC 4516 (2006)."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - url
  - uri
  - ldap-url
  - search
  - referral
  - dn
  - percent-encoding
  - abnf
  - rfc4510
  - directory-access
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4516-txt]]"
---

An LDAP URL is a URI in the `ldap://` scheme that encodes a complete [[collection/concepts/ldap|LDAP]] search operation — or a referral target — as a single, self-contained string. The format is defined by [[collection/sources/2026-05-02-rfc4516-txt|RFC 4516]] (June 2006, part of the [[collection/sources/2026-05-02-rfc4510-txt|RFC 4510]] series), which obsoletes RFC 2255.

## Structure

An LDAP URL has this structure:

```
ldap://[host[:port]][/dn[?[attributes][?[scope][?[filter][?extensions]]]]]
```

Each `?` separates one component from the next. All components after the host/port are optional; trailing `?` delimiters may be omitted if all subsequent components are also absent.

### Component summary

| Component | Example | Notes |
|-----------|---------|-------|
| `host` | `ldap.example.com` | Hostname or IP; IPv6 addresses allowed (RFC 3986) |
| `port` | `389` | Default: TCP 389 |
| `dn` | `o=Example,c=US` | Base DN in RFC 4514 string form; default: `""` (zero-length) |
| `attributes` | `cn,mail` | Comma-separated; `*` means all user attributes; default: all |
| `scope` | `sub` | `base` (default), `one`, or `sub` |
| `filter` | `(cn=Alice)` | RFC 4515 string form; default: `(objectClass=*)` |
| `extensions` | `!e-bindname=...` | Critical (`!` prefix) or non-critical; comma-separated |

## Two Uses: Search and Referral

**Search**: A client resolves the URL by opening an LDAP session to the specified host, performing the described search, and consuming the results. If no host is given, the client must use prior knowledge to choose a server.

**Referral**: When an LDAP server cannot satisfy an operation, it returns a referral — a set of LDAP URLs pointing to other servers. The client re-submits the operation to the servers named in the referral URLs. In this context, the URL describes where to direct the operation, not necessarily a search to execute verbatim (the RFC notes that not all LDAP search parameters can be expressed in URL form).

## Percent-Encoding

Characters outside the RFC 3986 `<reserved>` and `<unreserved>` sets must be percent-encoded (`%xx`). This creates a layering that can be surprising in practice:

- The `?` character MUST be percent-encoded (`%3f`) when it appears inside a DN, filter, or other component value (it functions as the component delimiter at the top level)
- The `,` character MUST be percent-encoded when it appears inside an extension value (`<exvalue>`)
- LDAP filter escaping (`\xx` for binary values) and URL percent-encoding stack: the `\` in a filter value must itself be encoded as `%5c` in the URL

Example — a filter `(four-octet=\00\00\00\04)` becomes `(four-octet=%5c00%5c00%5c00%5c04)` in a URL.

## Extension Mechanism

The `<extensions>` component provides forward extensibility through OID-identified type=value pairs. Extensions implement a criticality contract matching [[collection/concepts/ldap-controls|LDAP controls]]:

- **Critical extension** (prefixed `!`): if unimplemented, the client MUST NOT process the URL
- **Non-critical extension** (no prefix): if unimplemented, the client MUST ignore it

No extensions are defined in RFC 4516. The mechanism exists for future specifications to extend URL semantics without breaking older clients (as long as extensions are non-critical).

## Relationship to Other LDAP String Representations

LDAP URLs compose three separate string representations defined in companion RFCs:

| Embedded representation | Governing RFC | Used for |
|------------------------|---------------|---------|
| Distinguished Name string | RFC 4514 | `<dn>` component |
| Search filter string | [[collection/sources/2026-05-02-rfc4515-txt\|RFC 4515]] | `<filter>` component |
| Attribute selector | [[collection/sources/2026-05-02-rfc4511-txt\|RFC 4511]] §4.5.1 | `<attributes>` component |

None of these representations appear on the LDAP wire — they are developer-facing encodings only. The filter string in particular was originally defined specifically to support URL embedding.

## Security Considerations

Because LDAP URLs are often resolved automatically (in referrals, link-following, or programmatic contexts), RFC 4516 specifically warns:

- Clients SHOULD have a configurable policy governing which servers they connect to and what security mechanisms they use
- Without explicit policy, clients should use **anonymous** LDAP sessions rather than sending credentials
- Reusable passwords (simple bind) are particularly dangerous in URL-driven flows and SHOULD NOT be used unless explicitly permitted
- For referral-driven update operations, strong authentication methods SHOULD be used

See [[collection/sources/2026-05-02-rfc4513-txt|RFC 4513]] for authentication guidance.
