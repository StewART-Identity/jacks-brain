---
title: "LDAP Content Synchronization (SyncRepl)"
summary: "Protocol extension for maintaining synchronized copies of LDAP DIT fragments, supporting polling and persistent push change notification via syncCookie and entryUUID."
type: concept
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - content-synchronization
  - syncrep
  - replication
  - ldap-controls
  - sync-cookie
  - uuid
  - refreshonly
  - refreshandpersist
  - eventual-consistency
  - polling
  - push-notification
  - intermediate-response
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4533-txt]]"
---

**LDAP Content Synchronization** (colloquially *SyncRepl*) is an extension to the [[collection/concepts/ldap|LDAP]] Search operation that allows a client to maintain a synchronized copy of a fragment of the [[collection/concepts/directory-information-tree|Directory Information Tree]] (DIT). It is defined in [[collection/sources/2026-05-02-rfc4533-txt|RFC 4533]] (June 2006, Experimental) and implemented widely in LDAP servers including [[collection/entities/openldap-foundation|OpenLDAP]]'s `slapd` via the `syncprov` overlay.

## Problem Statement

Base [[collection/concepts/ldap|LDAP]] provides no efficient mechanism for a client to track changes to directory content over time. Repeated full-search polling retrieves the current state but doesn't tell the client *what changed*. RFC 4533 fills this gap by:

1. Communicating only *what changed* since the last synchronization (incremental updates)
2. Using stable per-entry identifiers (`entryUUID`) that survive rename and move operations
3. Supporting both periodic polling (`refreshOnly`) and persistent push notifications (`refreshAndPersist`)
4. Requiring no per-client state on the server (though servers may maintain it for efficiency)

## The syncCookie

The `syncCookie` is the session continuity token — an opaque OCTET STRING the server returns at the end of each synchronization stage. The client passes it back in the next request, and the server uses it to determine what has changed since that point. The cookie typically encodes a commit sequence number, change sequence number, or timestamp — but this encoding is server-specific and opaque to clients.

This design is stateless from the server's perspective: the server need not maintain a per-client record of what it has sent. The client's cookie carries sufficient state for the server to resume incremental synchronization.

## Sync Modes

### refreshOnly (Polling)

Each synchronization cycle is a discrete operation ending in `SearchResultDone` with a Sync Done Control providing a new `syncCookie`. The client issues a new request for each update check.

- **Initial poll**: no cookie; server returns all matching entries with state `add`
- **Update poll**: client sends last cookie; server returns only what changed since that state

### refreshAndPersist (Persistent Push)

A single persistent operation: the client issues one request and leaves it open indefinitely. The server completes a refresh stage (signaled by a Sync Info Message with `refreshDone = TRUE`), then continues sending real-time change notifications as the DIT changes.

This mode eliminates polling latency at the cost of maintaining a persistent connection and server-side search context.

## Entry Tracking with UUID

[[collection/concepts/distinguished-name|Distinguished Names]] are mutable — an entry can be renamed or moved. The Sync Operation uses `entryUUID` (a stable 128-bit UUID from RFC 4530) as the primary identifier for correlating synchronization messages. Clients MUST track entries by UUID, not DN.

When an entry moves within the DIT:
- Moves *into* synchronized content scope → client receives `add` state notification
- Moves *out of* scope → client receives `delete` state notification
- Remains in scope → client receives `modify` state notification (the DN change is not itself a sync event)

## Present Phase and Delete Phase

Content update polls can use one or both of two phases for communicating the fate of entries:

- **Present phase**: server sends `present` state markers for all *unchanged* entries. Client removes any local entry not marked present.
- **Delete phase**: server sends `delete` state markers only for entries that *left* content. Used when the deleted count ≤ unchanged count — it avoids enumerating all retained entries.

The `refreshDeletes` flag in the Sync Done Control indicates which phase was used. The `syncIdSet` Sync Info Message coalesces multiple UUID notifications into a single message, reducing protocol traffic.

## Sync State Values

| State | Meaning |
|---|---|
| `present (0)` | Entry exists and is unchanged |
| `add (1)` | Entry is new or has changed (full attributes returned) |
| `modify (2)` | Entry was modified within content (persist stage) |
| `delete (3)` | Entry has been removed from content |

## Eventual Convergence

RFC 4533 guarantees eventual convergence: after each synchronization stage, the client copy is either current or the client is told to do a full reload (`e-syncRefreshRequired` result code 4096). It does not guarantee transactional consistency — transient inconsistencies from concurrent server updates are possible and will be resolved by the next synchronization.

## Extensibility Mechanism

RFC 4533 employs three [[collection/concepts/ldap-controls|LDAP Controls]] (Sync Request, Sync State, Sync Done) plus an Intermediate Response Message (Sync Info Message) — the last being a mechanism defined in [[collection/sources/2026-05-02-rfc4511-txt|RFC 4511]] §4.13 for sending server-initiated responses within an operation. This combination — controls attached to a search operation that can persist indefinitely and emit intermediate messages — represents a more complex extension pattern than the simple request/response controls in RFC 2696 or RFC 2891. See [[collection/synthesis/ldap-replication-and-synchronization|LDAP Replication and Synchronization Approaches]] for the broader context.

## Standards Status

RFC 4533 is Experimental, not Standards Track. The IETF's LDUP working group adopted RFC 3928 (LDAP Client Update Protocol, LCUP) as its consensus synchronization mechanism. Despite this, RFC 4533's approach became the more widely implemented — OpenLDAP's `slapd` ships `syncprov` as a core overlay, and many LDAP consumers rely on SyncRepl for replication.
