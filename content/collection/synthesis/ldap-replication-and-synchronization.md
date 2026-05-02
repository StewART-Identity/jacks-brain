---
title: "LDAP Replication and Synchronization Approaches"
summary: "Comparison of LDAP synchronization strategies — SyncRepl (RFC 4533), LCUP (RFC 3928), X.500 DISP — and the tension between standards process and real-world adoption."
type: synthesis
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
  - rfc4533
  - rfc3928
  - lcup
  - experimental
  - standards-track
  - ietf
  - openldap
  - ibm
  - x500
  - disp
  - eventual-consistency
  - protocol-design
confidence: medium
sources:
  - "[[collection/sources/2026-05-02-rfc4533-txt]]"
---

[[collection/concepts/ldap|LDAP]] has no built-in replication or synchronization mechanism — base [[collection/sources/2026-05-02-rfc4511-txt|RFC 4511]] defines operations for querying and modifying a directory, but nothing for keeping two directory copies in sync. This gap generated multiple competing proposals, culminating in an unusual situation: the IETF standards process produced one solution (RFC 3928, LCUP) while the implementation community converged on another ([[collection/sources/2026-05-02-rfc4533-txt|RFC 4533]], SyncRepl).

## The LDUP Working Group and RFC 3928

The IETF convened the LDUP (LDAP Duplication/Replication/Update Protocols) working group specifically to standardize LDAP synchronization. The group reached consensus on the **LDAP Client Update Protocol** (LCUP), published as RFC 3928 in October 2004. LCUP is on the standards track — it represents the formal IETF answer to the synchronization problem.

The [[collection/sources/2026-05-02-rfc4533-txt|RFC 4533]] IESG note is explicit: *"The IESG notes that this work was originally discussed in the LDUP working group. The group came to consensus on a different approach, documented in RFC 3928."* RFC 4533 was published anyway, as Experimental, indicating that [[collection/entities/kurt-zeilenga|Zeilenga]] ([[collection/entities/openldap-foundation|OpenLDAP Foundation]]) and [[collection/entities/jong-hyuk-choi|Choi]] ([[collection/entities/ibm-corporation|IBM Corporation]]) believed the alternative design had sufficient merit to warrant publication alongside the standards-track solution.

## Two Design Philosophies

The core difference between the approaches is how they handle the server's knowledge of past changes:

| Dimension | RFC 3928 (LCUP) | RFC 4533 (SyncRepl) |
|---|---|---|
| Standards status | Standards Track | Experimental |
| History requirement | Server maintains change log | Optional; state-based operation possible |
| Per-client state | Required on server | Optional |
| Session model | Client-defined LCUP session | syncCookie-based opaque state |
| Entry identity | DN-based | `entryUUID`-based (stable across renames) |
| Sync phases | Single pass | Present phase and/or delete phase |
| Persistent mode | No equivalent | `refreshAndPersist` (server pushes changes) |
| Adoption | Limited | Widespread (OpenLDAP `syncprov`) |

RFC 4533's state-based design is explicitly more forgiving of server resource constraints: a server with no change log can implement the Sync Operation by scanning current directory state and comparing against the `syncCookie`. This makes RFC 4533 easier to implement across heterogeneous LDAP servers. LCUP's dependency on server-maintained history is a stronger implementation requirement — it delivers more precise incremental updates but demands infrastructure not all servers maintain.

## The syncCookie as Design Center

[[collection/concepts/ldap-content-synchronization|RFC 4533's syncCookie]] is the key design decision that separates it from history-dependent approaches. The cookie is opaque — the server defines its contents; the client just reflects it. This means:

1. The server can embed any state representation it finds natural (CSN, timestamp, log sequence number)
2. The server is not committed to a particular history retention policy
3. If the server's state has advanced beyond what the cookie covers (truncated history), it returns `e-syncRefreshRequired` — a clean failure mode that triggers a full reload

Compare this to history-dependent approaches: if the server's change log is truncated or the client has been offline too long, the server may not be able to construct a correct incremental update, leaving the synchronization in an uncertain state. RFC 4533 surfaces this uncertainty explicitly.

## RFC 4533's Extension Pattern

RFC 4533 uses a richer combination of LDAP extension mechanisms than any previously cataloged RFC:

1. **Three [[collection/concepts/ldap-controls|LDAP Controls]]**: Sync Request (on the SearchRequest), Sync State (on each SearchResultEntry/Reference), Sync Done (on SearchResultDone)
2. **Intermediate Response Messages**: the Sync Info Message uses the RFC 4511 Intermediate Response mechanism — server-initiated messages mid-operation
3. **New result code**: `e-syncRefreshRequired` (4096) is a new LDAP result code specific to this operation
4. **Persistent operation**: in `refreshAndPersist` mode, a single LDAP operation remains active indefinitely, continuously consuming a server-side search context

This goes beyond the controls-only extensions cataloged in [[collection/synthesis/ldap-protocol-extensibility|LDAPv3 Extensibility]], which primarily augment individual request-response cycles. SyncRepl extends the operation *lifecycle* — turning a normally stateless search into a long-lived session.

## Historical Precedents

RFC 4533 acknowledges several precursor proposals in its acknowledgements:

- **Persistent Search (PSEARCH)** — an informal proposal for a persistent LDAP search that notifies clients of changes; never standardized but widely implemented (notably in Netscape/Red Hat Directory Server)
- **Triggered Search (TSEARCH)** — a related LDAPv3 triggered-search control proposal
- **Microsoft DIRSYNC** — a proprietary Microsoft LDAP control for Active Directory synchronization; documented in an Internet-Draft but never submitted to the IETF as an RFC
- **X.500 DISP** — the [[collection/entities/itu-t|ITU-T]]'s Directory Information Shadowing Protocol (X.525), a heavyweight X.500 shadowing protocol for master-slave replication between directory servers

RFC 4533 positions itself as a lightweight alternative to DISP's complexity while addressing the shortcomings of PSEARCH (which provided notifications but not a full synchronization convergence guarantee).

## Standards Process vs. Adoption Reality

The RFC 4533 / RFC 3928 divergence is a case study in the gap between IETF consensus and implementation reality. RFC 3928 (LCUP) was the working group's consensus solution — a more precisely specified protocol with server-maintained history. RFC 4533 (SyncRepl) was an alternative approach co-authored by the [[collection/entities/openldap-foundation|OpenLDAP Foundation]] and [[collection/entities/ibm-corporation|IBM]], published Experimental over the LDUP working group's objection.

[[collection/entities/openldap-foundation|OpenLDAP]]'s `slapd` shipped `syncprov` (the SyncRepl provider overlay) as a production feature, making RFC 4533 the de facto synchronization mechanism for the dominant open-source LDAP server. RFC 3928 (LCUP) has seen little implementation adoption. This mirrors a broader pattern in protocol standardization: a widely deployed implementation can establish a de facto standard that the standards process never ratified.

The pattern is visible elsewhere in [[collection/concepts/ldap|LDAP]] history: [[collection/entities/netscape-communications|Netscape]]'s Persistent Search proposal was widely implemented before it was ever standardized (and ultimately never was); Microsoft's DIRSYNC control is used in production Active Directory environments without IETF standardization. The controls mechanism's openness — any OID holder can define a control — facilitates exactly this kind of parallel-track development.

## OID Provenance

All RFC 4533 protocol OIDs fall under the [[collection/entities/openldap-foundation|OpenLDAP Foundation]]'s IANA-assigned private enterprise arc (`1.3.6.1.4.1.4203.1.9.1`). This is consistent with [[collection/entities/kurt-zeilenga|Zeilenga]]'s pattern of using the foundation's OID allocation as a prototyping space for LDAP extensions — also visible in the Password Modify OID (`1.3.6.1.4.1.4203.1.11.1`) and the attribute selection feature OID (`1.3.6.1.4.1.4203.1.5.2`). IBM's co-authorship did not extend to OID ownership.

The contrast with [[collection/entities/microsoft|Microsoft]] (RFC 2696, RFC 2891) and [[collection/entities/netscape-communications|Netscape]] (RFC 4370) is sharp: those vendors standardized extensions around OIDs already registered in their own arcs, encoding their proprietary ownership of the original design. OpenLDAP's open-source posture means its OID arc served a different function — the foundation of a commons rather than an assertion of proprietary origin.
