---
title: "X.500 Directory Management"
summary: "The formal OSI-based management framework for X.500 directories, covering DSA/DUA lifecycle, configuration, fault, performance, security, and accounting via CMIP."
type: concept
created: 2026-05-04
updated: 2026-05-04
subjects:
  - directory-services
  - osi-protocols
tags:
  - x500
  - x530
  - directory-management
  - dsa
  - dua
  - dmd
  - cmip
  - managed-objects
  - osi-management
  - configuration-management
  - fault-management
  - performance-management
  - security-management
  - accounting-management
  - tmn
  - layered-management
  - shadowing
  - hob
  - nhob
  - dse
  - itu-t
  - iso
confidence: high
sources:
  - "[[reflect/sources/2026-05-04-t-rec-x-530-200811-i-pdf-e]]"
---

**X.500 Directory Management** is the formal framework, defined in [[reflect/sources/2026-05-04-t-rec-x-530-200811-i-pdf-e|ITU-T X.530 (2008) | ISO/IEC 9594-10]], for administering X.500 [[reflect/concepts/x500-distributed-directory|Directory System Agents (DSAs)]] and Directory User Agents (DUAs) using [[reflect/concepts/osi-systems-management|OSI Systems Management]] services and protocols.

The management framework is built on a key architectural division: X.500 directories have two kinds of manageable information. **Static** information (schema rules, prescriptive ACI) lives in the [[reflect/concepts/directory-information-tree|DIB]] and is manageable via DAP. **Dynamic** information (counters, gauges, operational state) lives in a separate Management Information Base (MIB) and is manageable via [[reflect/concepts/osi-systems-management|CMIP]].

## Scope

X.530 defines management in three active segments (the fourth, DMD-level integrated management, was reserved "for further study"):

1. **DIT domain management** — Schema integrity, alias consistency, list pointer validation
2. **DSA management** — Configuration, fault, performance, security, accounting for a single DSA
3. **DUA management** — Configuration and access point selection for a single DUA

## Layered Management Model

X.530 adopts the **TMN five-layer model** (from ITU-T M.3010) for organizing management responsibilities:

| Layer | Name | Scope |
|-------|------|-------|
| 1 | Network Element Layer | Individual managed object instances (DSAs, DSEs, HOBs) |
| 2 | Network Element Management Layer | Per-class object managers |
| 3 | Network Management Layer | Functional area managers (configuration, fault, security, performance) |
| 4 | Service Management Layer | Customer-facing management: accounting, helpdesk, service contracts |
| 5 | Business Management Layer | Cross-provider coordination, billing, and settlement |

This layering means directory management is not just about server administration — it encompasses the full chain from individual entry management (Layer 1) through customer billing (Layer 5).

## Five Management Functional Areas

### Configuration Management

Maintains accurate knowledge of the directory's physical and logical structure:

- Enable/disable DSA processes; lock/unlock the directory
- Manage operational bindings — list HOBs and NHOBs, set association limits
- Redistribute DIB fragments; manage subschema subentries
- Register user credentials with DUAs; configure default service controls
- Set DSA scope of referral and chaining (DMD, country, or global)

### Fault Management

Detects, isolates, and corrects faults:

- Report Directory errors (nameError, attributeError, updateError) to the directory manager
- Detect and log connectivity failures and operation failures
- Support DSA backup and restore
- Anticipate faults through logged operation analysis
- Log chaining knowledge inconsistencies

### Performance Management

Collects and evaluates performance data:

- Count operation types per DSA: read, compare, list, search (base/one-level/subtree), add, remove, modify, modifyDN — both direct and chained
- Maintain association counters (active, accumulated, failed — inbound and outbound)
- Log shadow update statistics (shadow consumer names, update times)
- Set thresholds on counters; generate notifications on threshold crossings
- Provide per-DSA and per-entry statistics

### Security Management

Manages the directory security posture and creates an auditable record:

- Audit trail of all directory accesses, configurable by the security officer
- Log security violations with: event time, origin, operation, target, outcome
- Seven mandatory audit event codes: `inappropriateAuthentication`, `invalidCredentials`, `insufficientAccessRights`, `invalidSignature`, `protectionRequired`, `blockedCredentials`, `noInformation`
- Manage DSA credentials and peer entity authentication policy
- Access control policy for DSA system files (protecting the management infrastructure itself)

### Accounting Management

Generates usage data for billing and cost tracking:

- Time-of-usage records per customer
- Resource-consumption records for query-oriented billing (per operation) and data-supplier billing (per DIB contribution)
- Cost accounting functions for tracking service provision costs against revenue

## Managed Object Containment Hierarchy

[[reflect/concepts/osi-systems-management|OSI Systems Management]] organizes managed objects in a containment tree. The X.530 hierarchy is:

```
DMD
├── DSA
│   ├── DSE (one per DIT entry in the DSA's naming context)
│   ├── Known DSA (one per peer DSA)
│   │   └── UL Connection Endpoint (one per active association)
│   ├── Known DUA (one per connected DUA)
│   │   └── UL Connection Endpoint
│   ├── HOB (Hierarchical Operational Binding)
│   ├── NHOB (Non-Specific Hierarchical Operational Binding)
│   └── Shadowing Agreement
└── Directory Customer
    └── Directory Service
        └── Directory User
```

A separate DUA subtree exists for managing DUAs from the DUA's own perspective (rather than from the DSA's perspective as a Known DUA).

### DSA Managed Object Highlights

The `dSA` managed object class is the central management point for [[reflect/concepts/x500-distributed-directory|DSA]] administration. Its package exposes:

- **State attributes**: operational state, administrative state (get-replace via CMIP)
- **Error counters**: security errors, name errors, service errors, alias problems, loops detected, invalid references, unable-to-proceed, out-of-scope, no-such-object, time/size/admin limit exceeded
- **Operation counters**: per operation type (read, compare, search base/one-level/subtree, list, add, remove, modifyEntry, modifyDN) for both direct and chained operations
- **Association limits**: max concurrent DAP/DSP/DOP/DISP associations; association timeouts
- **Chaining policy**: `prohibitChaining` flag; scope of referral/chaining (DMD/country/global)
- **Authentication policies**: peer entity, request, and result authentication types

### DSE Managed Object

One `dseMO` instance corresponds to each DSA-specific entry in the DSA's naming context. It exposes the entry's knowledge information — specific knowledge (cross-references, subordinate references), non-specific knowledge (NSSRs), supplier/consumer knowledge for [[reflect/concepts/x500-directory-replication|replication]], access point, DSE type, and timestamps.

### Shadowing Agreement Managed Object

Tracks [[reflect/concepts/x500-directory-replication|replication agreements]] managed by a DSA:
- Agreement ID/version, operational state, shadow subject (unit of replication), update mode and schedule
- Supplier vs. consumer role, master access point, secondary shadow access points
- Last and next update time
- Notifications for DOP errors, DOP completion, shadow update success, and shadow errors
- `updateShadow` action to force an out-of-band DISP update sequence

### Operational Binding Managed Objects

- **HOB** (`hOBMO`) — Manages hierarchical operational bindings; tracks agreement ID, version, state, peer access point, role (superior/subordinate)
- **NHOB** (`nHOBMO`) — Manages non-specific hierarchical operational bindings; same structure as HOB

Both generate DOP error and DOP complete notifications via their packages.

## Provision of Management Services

X.530 uses a combination of protocols to satisfy management requirements:

| Protocol | Management use |
|----------|---------------|
| **DAP** | Maintain user attributes; manage static operational attributes (prescriptiveACI, dITStructureRules) |
| **DOP** | Update knowledge references; establish and terminate operational bindings |
| **DISP** | Propagate shadow information and knowledge references to shadow consumers |
| **CMIP/CMIS** | DSA operational state, performance counters, event notifications, configuration changes |

The interface between a DSA and its collocated CMIS agent is explicitly not standardized by X.530 — it is a local implementation detail.

## Directory Service Managed Object

The `directoryService` managed object represents the service presented to a particular Directory customer. Two conditional packages customize what the DSA will accept:

**Directory Information Service** — Specifies allowed and disallowed operation/attribute/matching-rule combinations; restricts which distinguished names may appear as base objects in requests (preventing, for example, country-level subtree scans).

**Directory Control Service** — Sets maximum result count and maximum time for results, overriding DSA-level defaults for this specific customer's service.

## Contrast with LDAP

[[reflect/concepts/ldap|LDAP]] deployments have no equivalent standardized management layer. Each LDAP server vendor provides proprietary tools: CLI utilities, web consoles, vendor-specific extended operations, or SNMP MIBs with no interoperability. The absence of a standard like X.530 for LDAP means:

- No standard event notification model for LDAP server faults or state changes
- No standard managed object hierarchy covering associations, replication agreements, and operational bindings
- No standard audit trail definition
- No standard layered management model mapping operational metrics to service and business concerns

This management gap is one of the most significant structural differences between the full X.500 architecture and its LDAP successor. See [[reflect/synthesis/x500-directory-management-vs-ldap-administration|X.500 Management vs. LDAP Administration]] for the full analysis, and [[reflect/concepts/osi-systems-management|OSI Systems Management]] for the CMIP/CMIS framework underlying X.530's approach.
