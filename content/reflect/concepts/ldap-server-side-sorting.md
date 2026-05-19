---
title: "LDAP Server-Side Sorting"
summary: "LDAPv3 control extension (RFC 2891) enabling clients to request search results sorted by the server according to specified attribute types and matching rules."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ldap-controls
  - server-side-sorting
  - search
  - sort-key-list
  - matching-rules
  - paged-results
  - directory-access
  - rfc2891
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2891-txt]]"
---

LDAP server-side sorting is a [[reflect/concepts/ldap-controls|LDAPv3 control]] extension defined in [[reflect/sources/2026-05-02-rfc2891-txt|RFC 2891]] (August 2000). It allows a client to attach a `SortKeyList` to a `SearchRequest`, instructing the server to return results in a specified attribute order rather than in whatever order the server naturally produces.

## Why Server-Side Sorting Exists

Directory servers return search results in an implementation-defined order — typically the sequence entries are encountered during an index scan or tree walk. Clients requiring consistent ordered output (alphabetical user listings, date-ordered records) would otherwise need to buffer and sort the entire result set locally. For large result sets or resource-constrained clients, local sorting may be impractical. RFC 2891 moves this responsibility to the server.

## The SortKeyList

The request control carries a `SortKeyList`: an ordered sequence of sort keys applied from highest to lowest precedence. Each key comprises:

- **`attributeType`** — the attribute to sort on (e.g., `cn`, `mail`, `uid`)
- **`orderingRule`** (optional) — a [[reflect/concepts/ldap-matching-rules|matching rule]] override; if absent, the attribute's defined ORDERING rule applies
- **`reverseOrder`** (boolean, default FALSE) — whether to invert the ordering for this key

An `attributeType` may appear only once in the list; duplicates trigger `unwillingToPerform` in the server's SortResult response.

## NULL Handling

Entries missing a sort key attribute are assigned a NULL value that sorts **after** all present values. With `reverseOrder = TRUE`, NULL entries sort **before** all others. This means absent-attribute entries always appear at the tail of ascending results and at the head of reversed results.

## Multi-Valued Attributes

When a sort key names a multi-valued attribute, the server SHOULD use the **least value** per the attribute's ORDERING rule as the representative sort value for that entry, when no other controls affect sort order.

## Interaction with Paged Results

When combined with [[reflect/concepts/ldap-paged-results|paged results]] ([[reflect/sources/2026-05-02-rfc2696-txt|RFC 2696]]), the server must sort the **entire** result set before returning any page. Sorting each page independently produces incorrect results. The sort key list must be identical across all search requests in the paged sequence, and the server SHOULD return a SortResult control on every `searchResultDone` in the sequence.

## Security Note

Server-side sorting can defeat administrative `sizeLimit` controls. A client can combine sorting with progressive filter updates to retrieve an entire directory in small, limit-compliant chunks. RFC 2891 identifies this as a risk to be mitigated by fine-grained access control on entries, not solely by size limits.

## See Also

- [[reflect/concepts/ldap-controls|LDAP Controls]] — the extension mechanism RFC 2891 uses
- [[reflect/concepts/ldap-matching-rules|LDAP Matching Rules]] — the ordering rules used for sort key comparison
- [[reflect/concepts/ldap-paged-results|LDAP Paged Results]] — the complementary pagination control; RFC 2891 §2.3 specifies their interaction
- [[reflect/sources/2026-05-02-rfc2891-txt|RFC 2891]] — the normative specification
