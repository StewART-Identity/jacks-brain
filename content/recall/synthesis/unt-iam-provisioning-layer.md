---
title: "UNT IAM: The Provisioning Layer and the Authentication Layer"
type: synthesis
created: 2026-04-18
updated: 2026-04-18
tags:
  - iam
  - unt-system
  - architecture
  - scripting
  - provisioning
  - identity
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
  - "[[recall/sources/2026-04-19-2026-04-18-contract]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
  - "[[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]"
  - "[[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]"
  - "[[recall/sources/2026-04-19-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

The five sources now in this wiki describe [[recall/entities/unt-system]]'s IAM from two distinct vantage points: the **authentication layer** (Entra ID, Duo, Conditional Access — the subject of all previous sources) and the **provisioning layer** (the Python scripting infrastructure described in the [[recall/sources/2026-04-18-2026-04-18-contract|IAM Modules Integration Contract]]). Reading them together reveals a coherent hybrid architecture and a set of design principles that appear independently at both layers.

## The Two Layers

| Layer | Technology | What It Does | Primary Sources |
|-------|-----------|-------------|----------------|
| **Provisioning** | eDirectory, AD, Oracle, `iam-modules` Python library | Creates, modifies, deactivates, and syncs identity records | CONTRACT |
| **Authentication** | [[recall/entities/microsoft-entra-id]], [[recall/entities/cisco-duo]], Conditional Access | Verifies identity at sign-in; enforces MFA and access policies | All prior sources |

These layers interact but are governed differently. The provisioning layer is operated through shell scripts running as `iamadm` on `iam-script-gab`. The authentication layer is configured through Entra ID portals and PowerShell by the same IAM team. The two surfaces rarely appear in the same document — the CONTRACT addresses the provisioning layer almost exclusively, while the Rollout Plan, Multi-Tenant Proposal, and Case Study address the authentication layer.

## The Same Population, Two System Views

The CONTRACT states the scripting infrastructure serves 72,000+ users. The January 2026 migration case study reports 72,274 affected accounts. These are the same user population seen from two different angles: provisioning (creating and managing accounts) and authentication (signing those accounts in). This is not a coincidence — it reflects that the IAM team owns both surfaces of the same identity lifecycle.

## Safety-First: A Cross-Layer Design Principle

The most striking commonality between the two layers is a shared commitment to safe-by-default operation, expressed differently at each level:

| Level | Mechanism | Default Safe State | Opt-In to Risk |
|-------|-----------|-------------------|----------------|
| Scripting (provisioning layer) | [[recall/concepts/dry-run-by-default]] | No changes made | `--commit` flag |
| Cloud identity (authentication layer) | [[recall/concepts/iam-testing-methodology]] | No production change | Pass Part 0 gate in staging tenant |

Both are architectural responses to the same underlying risk: identity operations at scale are hard to undo. Disabling 72,000 accounts, sending 72,000 password expiration notices, or removing 90,000 group memberships — these are symmetric failure modes. The scripting layer prevents them by defaulting to dry-run; the cloud layer prevents them by requiring staging validation.

Neither document references the other — they were written for different audiences and purposes — but the design philosophy is identical.

## Hybrid Directory Architecture

The CONTRACT makes visible a directory topology that the authentication-layer sources never fully describe. [[recall/entities/unt-system]] runs at least four simultaneous LDAP/directory systems:

1. **[[recall/entities/edirectory]]** (NetIQ, on-premises) — primary identity store; the provisioning layer writes here first
2. **Active Directory** (four domains: `ad.unt.edu`, `unt.ad.unt.edu`, `hsc.ad.unt.edu`, `students.ad.unt.edu`) — downstream of eDirectory; synced via scripts and Entra Connect
3. **Entra ID** (`myunt.onmicrosoft.com`) — cloud authentication; synced from AD via Entra Connect; also managed via Graph API
4. **Oracle databases** (HRPD and LSPD — PeopleSoft HR and LS) — source-of-truth for employee/student data that drives provisioning decisions

The scripting layer ([[recall/entities/iam-modules]]) spans all four: it connects to eDirectory, all four AD domains, the AD Global Catalog, both Oracle databases, and Entra ID via the Microsoft Graph API. No single other source in this wiki captures this breadth.

## Entra ID as Both Target and Tool

The authentication-layer sources treat Entra ID as the system being configured — the thing you change policies in. The CONTRACT reveals a second role: Entra ID is also a system being programmatically managed by provisioning scripts via the `GraphAPIClient`. Group membership changes, attribute synchronization, and account lifecycle operations can all flow through `graph_client.py` using the `ENTRA_*` credentials in `.env`.

This dual role has an architectural implication: some Entra ID state is managed through the portal (authentication policies, Conditional Access) and some is managed through scripts (group membership, attribute values). A change made in the portal can be overwritten by the next script run, and vice versa. This is a latent coordination risk not addressed by either the CONTRACT or the authentication-layer sources.

## The Provisioning Layer as Dependency for the Authentication Layer

The January 2026 migration affected 72,274 user accounts, requiring custom PowerShell remediation to clean up orphaned EAM registrations. That remediation was a manual, one-time operation. Going forward, the [[recall/concepts/orphaned-authentication-registrations]] pattern means any future removal of an External Authentication Method (like Duo EAM) will require a similar cleanup — and the cleanup would need to touch every affected user object in eDirectory or AD, not just Entra ID.

The provisioning scripting infrastructure is the natural home for that kind of fleet-wide remediation. The [[recall/concepts/iam-scripting-architecture]] pattern — a `lib/` function called from a script with dry-run-by-default behavior — is exactly the right model for "iterate over 72,000 user objects and remove a stale attribute." The two layers are not just parallel; they are complementary tools for different classes of IAM operation.

## Sequencing Dependency: Provisioning Before Authentication

The Rollout Plan's Part 2 has a critical sequencing constraint: the Duo EAM must be provisioned in Conditional Access before the CA policy enforces, or users are blocked. This provisioning step — setting up the EAM configuration — is an authentication-layer operation. But the downstream effect (users being able to authenticate) depends on the provisioning-layer state being correct (users exist in the right groups, have the right attributes).

The same sequencing logic applies to group-based Conditional Access policies: if `ECS-DUO-Users` group membership is managed by a provisioning script, then a bug in that script (or a failed dry-run that was never committed) can silently exclude users from the authentication policy target. The two layers share a dependency graph even when their operators think of them as independent.

## What Each Layer Lacks

The two layers are designed by the same team but have different maturity in process formalization:

- The **authentication layer** now has a formal testing methodology with scope classifications, staging environments, approval workflows, and documented sign-offs (the IAM Testing Methodology, instantiated in the Rollout Plan's Part 0).
- The **provisioning layer** has the dry-run-by-default pattern and a checklist for script migration, but no equivalent of the Part 0 staging process for testing large-scale provisioning operations before execution.

There is no equivalent of `myunttest.onmicrosoft.com` for scripting — no staging eDirectory or staging AD where `python invoke_deactivateterminations.py --commit` can be run safely against a copy of production data. The dry-run output must stand in for that validation.

## Related Pages

- [[recall/entities/iam-modules]]
- [[recall/entities/edirectory]]
- [[recall/entities/unt-system]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/concepts/dry-run-by-default]]
- [[recall/concepts/iam-scripting-architecture]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
