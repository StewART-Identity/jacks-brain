---
title: "Active Directory (UNT System)"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - tool
  - directory
  - ldap
  - identity
  - unt-system
  - on-premises
  - windows
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

Microsoft Active Directory as deployed at [[recall/entities/unt-system]], consisting of four distinct domains serving different populations. AD sits downstream of [[recall/entities/edirectory]] in the provisioning flow: identity records are mastered in eDirectory, then replicated or synced into AD, which in turn feeds [[recall/entities/microsoft-entra-id]] via Entra Connect.

## Domains

| Domain FQDN | Purpose | Service Account |
|-------------|---------|-----------------|
| `ad.unt.edu` | Forest root; Global Catalog host | `CN=IAMScriptAD,OU=IAM,OU=Services,DC=ad,DC=unt,DC=edu` |
| `unt.ad.unt.edu` | UNT staff/faculty | `CN=IAMScriptUNT,OU=IAM,OU=Services,DC=unt,DC=ad,DC=unt,DC=edu` |
| `hsc.ad.unt.edu` | Health Science Center | `CN=IAMScriptHSC,OU=IAM,OU=Services,DC=hsc,DC=ad,DC=unt,DC=edu` |
| `students.ad.unt.edu` | Student accounts | `CN=IAMScriptSTU,OU=IAM,OU=Services,DC=students,DC=ad,DC=unt,DC=edu` |

None of the service accounts require Domain Admin, Enterprise Admin, or any other built-in admin group membership. Access is delegated at the attribute and object-class level only ([[recall/concepts/iam-scripting-architecture]] service account model).

## Global Catalog

The Global Catalog (GC) provides forest-wide read-only searches across all domains on port 3269, hosted on `dcpd-ad-pri-01.ad.unt.edu`. The [[recall/entities/iam-modules]] library exposes this as `connect_to_gc(config, logger)` via the `ADGlobalCatalogClient`. No write delegation is required on the GC.

## Attributes Written by IAM Scripts

### Forest Root (`ad.unt.edu`) — IAMScriptAD

| Attribute | Object Type | Operation | Scripts |
|-----------|-------------|-----------|---------|
| `member` | Group | Add/Delete | deactivate_terminateduser, reactivate_terminateduser |

### UNT Domain — IAMScriptUNT

| Attribute | Object Type | Operation | Scripts |
|-----------|-------------|-----------|---------|
| `description` | User | Replace | deactivate_terminateduser, reactivate_terminateduser |
| `employeeNumber` | User | Replace | repair_useridmassns |
| `extensionAttribute15` | User, Group | Add/Replace | copy_entrauser, sync_adonpremobject, set_entraextattribute |
| `gidNumber` | User, Group | Replace | sync_usergidnumber |
| `member` | Group | Add/Delete | deactivate_terminateduser, reactivate_terminateduser, manage_vpngroupmembers |
| `userAccountControl` | User | Replace | deactivate_terminateduser, reactivate_terminateduser |

### HSC Domain — IAMScriptHSC

Same attribute set as UNT domain: `description`, `employeeNumber`, `extensionAttribute15`, `gidNumber`, `member`, `userAccountControl`.

### STUDENTS Domain — IAMScriptSTU

Same attribute set as HSC domain. Note: STUDENTS domain is **skipped by default** in deactivate_terminateduser and reactivate_terminateduser; the `--students` flag must be passed explicitly.

## Connection via iam-modules

The [[recall/entities/iam-modules]] library provides two connection paths:

- **Per-domain DC**: `connect_to_ad(config, domain, logger)` — domain is one of `'ad'`, `'hsc'`, `'students'`, `'unt'`; TLS with certificate validation disabled for internal CAs
- **Global Catalog**: `connect_to_gc(config, logger)` — port 3269, forest-wide read-only
- **Higher-level clients**: `ADDomainControllerClient.from_config(config, domain, logger)` and `ADGlobalCatalogClient.from_config(config, logger)`

All connections use `raise_exceptions=True` — LDAP write failures raise `LDAPException` rather than returning a result code. See [[recall/sources/2026-04-18-2026-04-18-contract]] for the correct `try/except` pattern.

## Role in UNT IAM Architecture

AD sits in the middle of [[recall/entities/unt-system]]'s identity stack:

1. **[[recall/entities/edirectory]]** — source of truth for provisioning; scripts write here first
2. **Active Directory** (this page) — downstream sync target; also directly managed by provisioning scripts for group membership and account controls
3. **[[recall/entities/microsoft-entra-id]]** — cloud authentication layer; synced from AD via Entra Connect; also managed via Microsoft Graph API

Some AD groups (e.g., `ECS-DUO-Users`, `DuoUsers` ~90,000 members) are synced to Entra ID via [[recall/concepts/entra-connect]] and used as [[recall/concepts/conditional-access-policy]] targets. A provisioning bug that incorrectly manages group membership at the AD layer can silently break authentication policy enforcement at the Entra layer. See [[recall/synthesis/unt-iam-provisioning-layer]].

## Read-Only Scripts

Several scripts connect to AD but perform no writes — they require only search/read access:

- `compare_adtoentragroup.py`, `count_groupmembers.py`, `get_aduser.py`, `get_groupmember.py`, `get_uachieveinfo.py`, `start_idmsyncuserevent.py`, `sync_idmusermailattrs.py`

## Related Pages

- [[recall/entities/edirectory]]
- [[recall/entities/iam-modules]]
- [[recall/entities/unt-system]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/concepts/iam-scripting-architecture]]
- [[recall/concepts/dry-run-by-default]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
- [[recall/synthesis/unt-iam-provisioning-layer]]
