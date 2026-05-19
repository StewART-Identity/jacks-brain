---
title: "LDAP Paged Results"
summary: "LDAPv3 control mechanism for retrieving search results in pages, using an opaque server-issued cookie to resume queries."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - paged-results
  - ldap-controls
  - search
  - pagination
  - cookie
  - resource-management
  - directory-access
  - x500
  - security
confidence: high
sources:
  - "[[reflect/sources/2026-05-02-rfc2696-txt]]"
---

LDAP paged results is a [[reflect/concepts/ldap|LDAPv3]] control extension (OID `1.2.840.113556.1.4.319`) defined in [[reflect/sources/2026-05-02-rfc2696-txt|RFC 2696]] that allows clients to retrieve large result sets in discrete pages rather than receiving all matching entries at once. This is practically essential when querying large directories — for example, enumerating all user accounts in Active Directory — from resource-constrained clients or across low-bandwidth links.

## How It Works

The mechanism uses a **cookie-based resumption** pattern:

1. The client adds a `pagedResultsControl` to the `SearchRequest` specifying a page size and an empty cookie.
2. The server returns up to `pageSize` entries and a `searchResultDone` carrying the control back with an opaque cookie.
3. The client reissues the identical search (same filter, base DN, scope, attributes) with the received cookie.
4. This repeats until the server returns an empty cookie, signaling the result set is exhausted.

The cookie is opaque — its internal format is server-defined and may encode a cursor, session state, or any other resumption data. Clients must treat it as a black box.

## Key Behaviors

- **Page size** is a client request, not a guarantee; the server may return fewer entries per response.
- **Total estimate**: The server may populate the `size` field in its response with an estimated total entry count; servers that cannot estimate set it to `0`.
- **Abandonment**: A client can terminate early by sending `pagedResultsControl(0, lastCookie)`.
- **Aging**: Servers may age out stale paged searches and return `unwillingToPerform` if the client attempts to resume.
- **Consistency**: Not guaranteed across pages — directory modifications between requests can cause entries to appear twice or be skipped.

## Practical Use in Identity Infrastructure

In identity management contexts, LDAP paged results is the standard mechanism for bulk directory reads:
- Syncing all users from Active Directory into a SCIM endpoint or HR system
- Reading full group membership lists for provisioning workflows
- Enumerating accounts during access reviews or reporting

Without paging, a single `SearchRequest` against a large directory may be rejected if the server enforces a `sizeLimit`. Most LDAP client libraries expose paged results as a first-class API, and Active Directory effectively requires it for queries returning more than 1,000 entries.

## X.500 Mapping

For LDAPv3 servers fronting X.500 (93) directories, the control maps directly onto the `PagedResultsRequest` defined in X.511: `size` → `pageSize`, `cookie` → `queryReference`. X.500's `PagedResultsRequest` also defines `sortKeys` and `reverse` fields — both are excluded from the RFC 2696 mapping. RFC 2696 intentionally covers only the simple (non-sort-aware) case; [[reflect/concepts/ldap-server-side-sorting|server-side sorting]] handles ordered paging.

## Security Consideration: Result Count Disclosure

Because the server's `size` estimate reveals the total match count *before* any entries are returned, a client can determine how many entries satisfy a given filter without ever receiving the entries themselves. Servers implementing per-entry access control must decide whether the aggregate count may be disclosed even when individual entries are withheld — RFC 2696 flags this as requiring special server-side handling.

## See Also

- [[reflect/concepts/ldap-search-filters|LDAP search filters]] — govern *what* entries match the query; paged results governs *how many* are returned per round trip
- [[reflect/concepts/ldap-server-side-sorting|LDAP Server-Side Sorting]] — RFC 2891 extends paged results with a sort order guarantee; the server must sort the entire result set before paginating
- [[reflect/concepts/ldap|LDAP]] — the underlying protocol
- [[reflect/sources/2026-05-02-rfc2696-txt|RFC 2696]] — the normative specification for paged results
- [[reflect/sources/2026-05-02-rfc2891-txt|RFC 2891]] — specifies how server-side sorting and paged results interact
