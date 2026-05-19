---
title: "X.500 Directory Replication"
summary: "The X.500 replication model: shadowing agreements between shadow suppliers and consumers, multiple master, cache copies, and eventual-consistency semantics."
type: concept
created: 2026-05-04
updated: 2026-05-04
subjects:
  - directory-services
tags:
  - x500
  - x525
  - replication
  - shadowing
  - shadow-supplier
  - shadow-consumer
  - shadowing-agreement
  - multiple-master
  - cache
  - consistency
  - disp
  - dsa
  - itu-t
  - distributed-directory
confidence: high
sources:
  - "[[reflect/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e]]"
---

The X.500 directory replication model, normatively defined in X.525 and overviewed in the [[reflect/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e|2016 eighth-edition X.500 overview]], describes how copies of [[reflect/concepts/directory-information-tree|DIB]] information are maintained across multiple [[reflect/concepts/x500-distributed-directory|DSAs]] to improve performance and availability. Three forms of replicated information are defined with distinct consistency guarantees.

## Why Replication

Directory deployments replicate information for two general purposes:

**Service quality** — Moving directory information closer to particular users improves response time. Introducing redundant copies means a single DSA failure does not prevent all access to a portion of the DIT.

**System management** — Replication distributes operational information (knowledge) across DSAs and provides a recovery mechanism: if a DSA fails catastrophically, its information can be reconstructed from copies held elsewhere.

## Three Forms of Replicated Information

### Cache Copies

Copies obtained and maintained in ways *not* specified by the Directory Specifications. Cache copies:
- May become and remain permanently inconsistent with master information
- Are held at the discretion of the caching DSA, governed by whatever local policy it applies
- Are still subject to the access control policy of the original information

When responding to a query with cached information, a DSA notifies the requestor that copy information was used. A requestor with a critical need may signal that copy information is not acceptable; the DSA must then forward the request to the master DSA.

### Shadowed Copies

Copies obtained via the **Directory Information Shadowing Protocol (DISP)**, specified in X.525, under a formal **shadowing agreement** between two DSAs. Shadowed information:
- Is brought into consistency with the shadow supplier on a contracted schedule
- Is internally consistent at all times (the directory schema rules are maintained)
- Will ultimately converge with the master DSA's information (eventual consistency)

A shadow consumer may itself become a shadow supplier for that information, if the original shadowing agreement permits, creating replication chains.

A shadowing agreement specifies what information is replicated, typically comprising:
- Replicated entry information from within a DIT subtree
- Relevant operational information including [[reflect/concepts/x500-directory-access-control|ACI]] needed for full read access
- Optionally, subordinate knowledge information

The replicated subset can be filtered by:
- Object class criteria (only entries meeting specified object class conditions)
- Attribute selection within each entry
- Attribute value context within each attribute

### Multiple Master Implementations

More than one writeable instance of each entry within a given set. Each writeable copy is complete (holds all user attributes and DSA-shared operational attributes). Exactly one instance is designated the primary master, enabling scenarios where a single DSA must handle updates (e.g., incrementing a counter attribute). The mechanism for obtaining writeable copies and achieving post-modification consistency is outside the X.500 standard's scope.

## Shadow Supplier and Shadow Consumer

| Role | Responsibility |
|------|---------------|
| **Master DSA** | Holds the original entry information; target for all modification requests on that information |
| **Shadow supplier** | Contracted to provide shadowed information to a shadow consumer |
| **Shadow consumer** | Receives and holds shadowed information from a shadow supplier |

A DSA holding cached or shadowed information forwards all modification requests against that copy information to the master DSA. It also forwards requests that indicate copy information shall not be used.

## Consistency Model

The X.500 replication model provides **eventual consistency** for shadowed information: the shadow consumer's copies will ultimately match the master DSA's information, but no specific time constraint is defined. Transient inconsistencies are acceptable.

Cached information may remain permanently inconsistent — there is no protocol-specified schedule for refreshing cache copies.

At all times, replicated information must be *internally consistent*: schema rules are maintained so that each replicated entry is valid in isolation, and knowledge information (allowing the DIT to be distributed across DSAs) remains accurate. The directory defines schema and knowledge procedures to ensure this local consistency even in the presence of replication lag.

Users are always notified when a request is satisfied from copy (vs. master) information. They may then choose to request master-only access, trading latency and availability for timeliness.

## Three Views of Replication

**Directory user view** — Generally receives consistent information; notified when copy information satisfies a request; may request master-only access when needed.

**Administrative user view** — Manages DSA service; uses shadowing agreements as the primary tool for performance optimization and availability improvement.

**DSA view** — Treats master and shadowed information equivalently for interrogation; forwards modification requests and requests specifying no-copy to the master DSA. A DSA holding copies from multiple sources maintains them as separate views.

## Replication and Access Control

Access control information (ACI) must always be replicated alongside the entries it governs. When entries are replicated to another DSA, the corresponding ACI travels with them, ensuring the shadow consumer can enforce the same [[reflect/concepts/x500-directory-access-control|access control decisions]] as the master DSA.

## Relationship to LDAP Replication

[[reflect/concepts/ldap|LDAP]] has no standard replication protocol in the core specification series. The X.500 DISP shadowing protocol is an OSI application protocol with no direct LDAP equivalent. [[reflect/concepts/ldap-content-synchronization|LDAP Content Synchronization (RFC 4533, SyncRepl)]] is the closest LDAP analog — it provides change-notification-based replication between LDAP servers — but operates over the LDAP protocol rather than a separate shadowing protocol and is not interoperable with DISP.
