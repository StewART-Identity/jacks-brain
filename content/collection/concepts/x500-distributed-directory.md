---
title: "X.500 Distributed Directory Model"
summary: "The X.500 architecture for distributing directory services across multiple DSAs via chaining, multicasting, and referrals within a DMD organizational framework."
type: concept
created: 2026-05-04
updated: 2026-05-04
subjects:
  - directory-services
tags:
  - x500
  - distributed-directory
  - dsa
  - dua
  - ldap-requester
  - ldap-responder
  - dap
  - dsp
  - chaining
  - multicasting
  - referral
  - dmd
  - addmd
  - prdmd
  - osi
  - directory-access-protocol
  - itu-t
  - x519
  - x518
  - 1988
  - 2016
confidence: high
sources:
  - "[[collection/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e]]"
  - "[[collection/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e]]"
---

The **X.500 distributed directory model** describes how [[collection/entities/itu-t|ITU-T]] X.500 deploys directory services across many systems and organizations to form "a single logical directory composed of many systems." This distributed architecture is a defining feature of the X.500 design and contrasts sharply with typical [[collection/concepts/ldap|LDAP]] deployment practice, where chaining and multicasting are rarely implemented.

## Agents: DUA and DSA

Two principal agent types participate in directory operations:

**Directory User Agent (DUA)** — An application-process representing a user (person or program). A DUA issues requests on behalf of its principal and presents results. DUAs may extend the directory service with local functions beyond what the protocol itself provides (caching, UI-layer search logic, result merging). In LDAP terms, every LDAP client library is a DUA.

**Directory System Agent (DSA)** — An OSI application process holding a portion of the [[collection/concepts/directory-information-tree|DIB]] and providing access to it. A DSA may answer requests from its own local database or interact with other DSAs to satisfy requests that span multiple servers. A DSA that holds no relevant data for a request has three options: chain the request, multicast it, or return a referral.

The [[collection/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e|2016 eighth edition]] added three LDAP-specific agent types, formally integrating [[collection/concepts/ldap|LDAP]] into the distributed model:

| Agent | Role |
|-------|------|
| **LDAP server** | Application process serving LDAP clients via the LDAP protocol; peer of DSA in the functional model |
| **LDAP requester** | A DSA capable of issuing LDAP requests and understanding LDAP responses |
| **LDAP responder** | A DSA capable of understanding and responding to LDAP requests |

A DSA can be simultaneously an LDAP responder and an LDAP requester, enabling topologies where X.500 DAP/DSP infrastructure and LDAP infrastructure interoperate. An LDAP client bound to an LDAP server, unlike a DUA, cannot have its requests served by a different server.

## Protocols

| Protocol | Parties | Purpose |
|----------|---------|---------|
| **DAP** (Directory Access Protocol) | DUA ↔ DSA | Client–server operations: read, search, modify, bind |
| **DSP** (Directory System Protocol) | DSA ↔ DSA | Server–server cooperation for distributed requests |

Both are OSI application protocols — application contexts composed of application service elements built on the Remote Operations Service (ROS) from X.219 — formally specified in X.519. Both use [[collection/concepts/asn1|ASN.1]] encoding. Two additional protocols govern replication and operational bindings: DISP (Directory Information Shadowing Protocol, X.525) for [[collection/concepts/x500-directory-replication|shadowing agreements]], and DOP (Directory Operational Binding Management Protocol) for administrative bindings between DSAs.

[[collection/concepts/ldap|LDAP]] (Lightweight DAP) replaced DAP with a TCP/IP-native protocol starting with RFC 1487 (1993). No LDAP equivalent of DSP exists — LDAP clients receive referrals and chase them independently rather than relying on server-to-server chaining.

## Distributed Operation Modes

When a DSA receives a request for information not in its local database, three strategies are available:

### Chaining

The DSA forwards the request to another DSA that can service it via DSP, collects the result, and returns it to the DUA as if it had answered locally. The DUA is unaware of the multi-server interaction.

```
DUA → DSA_A → DSA_B  (via DSP)
           ← result
      ← result
```

Chains may pass through multiple DSAs. The originating DSA bears responsibility for assembling partial results. Chaining offloads the client from needing to know the distributed topology — particularly valuable for clients that have no mechanism to follow referrals.

### Referral

The DSA returns a **referral** — a pointer to an alternative access point where the DUA should re-issue the request. The client is responsible for following the referral.

```
DUA → DSA_A → "try DSA_B at <access-point>"
    ↓
    → DSA_B → result
```

Referrals are the mechanism LDAP largely adopted. LDAP servers that cannot satisfy a request return LDAP referral result codes (or search references during a search) pointing to other servers; the client must chase them. X.500 allows a DUA to express a preference for chaining over referrals via service controls; the Directory makes the final decision.

### Multicasting

The DSA broadcasts the request to two or more DSAs simultaneously, each receiving an identical copy. Results are combined before returning to the DUA.

```
DUA → DSA_A ⟶ DSA_B
           ↘ DSA_C
      ← combined result
```

Multicasting addresses searches spanning disjoint subtrees held by different DSAs. LDAP has no equivalent: an LDAP client searching across disjoint namespaces must issue multiple independent searches and merge results client-side.

### Hybrid Approaches

The three modes combine freely: a DSA may chain part of a request and return a referral for another part; a chained DSA may itself multicast. X.500 explicitly permits such hybrid interactions and illustrates them in the specification.

## Organizational Model

### Directory Management Domain (DMD)

A **DMD** is a set of one or more DSAs (and zero or more DUAs) operated under a single organization. The DMD is the organizational unit of X.500 governance:
- Defines its own internal operation policies independently
- May, at the organization's option, present itself as a single logical DSA to external parties
- Represents an administrative trust boundary at which DSP interactions cross organizational lines

### ADDMD and PRDMD

| Type | Full name | Operated by |
|------|-----------|-------------|
| **ADDMD** | Administration DMD | Telecommunications administration (public carrier) |
| **PRDMD** | Private DMD | Private organization (enterprise, university) |

ADDMDs were envisioned as the backbone of global X.500 deployment: telecoms carriers would interconnect their ADDMDs to form a global directory, with PRDMDs joining as organizational branches. This mirrors the [[collection/concepts/directory-information-tree|DIT]] structure — country-level entries (administered by ADDMDs) at the top, organization-level entries (PRDMDs) below.

In practice, global X.500 deployment never materialized in this carrier-backbone form. The internet's adoption of DNS for naming and LDAP for directory access displaced the ADDMD model. Many LDAP deployments consist of a single organization's DMD with no inter-organizational chaining at all.

## Service Controls and Qualification

Distributed requests are qualified with **service controls** that limit how far the Directory may recurse or chain:

- **Time limit** — maximum elapsed time before the server must stop and respond
- **Size limit** — maximum number of entries returned
- **Scope** — restricts how widely DSAs may chase references when chaining or multicasting
- **Interaction mode preference** — DUA can express a preference for chaining over referrals
- **Priority** — relative priority for queued requests

These controls directly inspired the `sizelimit`, `timelimit`, and `scope` parameters in LDAP search operations. LDAP preserved the service qualification concept while simplifying the mechanism to suit a non-chaining deployment model.

## Contrast with LDAP Deployment Practice

| Feature | X.500 design | LDAP practice |
|---------|-------------|---------------|
| Chaining | First-class server capability | Rarely implemented |
| Multicasting | Standard mechanism for disjoint searches | Not implemented |
| Referrals | Fallback alternative to chaining | Primary cross-server mechanism |
| ADDMD backbone | Global carrier-interconnected directory | Not realized; DNS fills the naming role |
| DSP | Formal normative server-to-server protocol | No LDAP equivalent |

The gap between X.500's distributed vision and LDAP's simpler deployment model is one of the defining architectural differences between the two systems. The [[collection/sources/2026-05-04-t-rec-x-500-201610-s-pdf-e|2016 eighth edition]] partially bridged this gap by formally defining LDAP requesters and responders as valid participants in chaining and referral topologies — but multicasting and DSP remain X.500-only. See [[collection/synthesis/x500-ldap-convergence|X.500 and LDAP: Divergence and the 2016 Reconvergence]] for the full historical arc, and [[collection/synthesis/x500-standards-maintenance-and-ldap-inheritance|X.500 Standards Maintenance]] for how the defect resolution process shaped shared infrastructure.
