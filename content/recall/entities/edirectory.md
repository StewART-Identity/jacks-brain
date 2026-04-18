---
title: "NetIQ eDirectory"
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
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

NetIQ eDirectory (formerly Novell eDirectory / Novell Directory Services) is [[recall/entities/unt-system]]'s on-premises LDAP directory and the primary identity store for IAM provisioning scripts. It serves as the authoritative source for user objects and is the system most heavily written to by the [[recall/entities/iam-modules]] scripting infrastructure.

## Connection Details

- **Server**: `idmpidv01.untsystem.edu:637`
- **Protocol**: SSL only, TLSv1.2 pinned
- **Cipher string**: `HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5`
- **Connect timeout**: 600 seconds (configurable via `EDIR_PROD_TIMEOUT` in `.env`)

Two environments are supported: `prod` (primary) and `test`. The `test` environment uses separate `EDIR_TEST_*` credentials.

## Directory Structure

Key organizational units within `o=unt`:

- `ou=people,o=unt` — user objects (primary scope for provisioning scripts)
- `ou=IAMApplications,o=unt` — IAM service accounts

## Service Accounts

| Account | Purpose |
|---------|---------|
| `cn=IAMScript,ou=IAMApplications,o=unt` | General provisioning scripts |
| `cn=IAMDrip,ou=IAMApplications,o=unt` | LDIF record drip import (requires broad write access to arbitrary attributes on `ou=people,o=unt`) |

Both accounts operate under **least-privilege**: write access is scoped to the specific attributes each script uses. Read access to all standard attributes is assumed.

## Attributes Written by IAM Scripts

| Attribute | Operation | Scripts |
|-----------|-----------|---------|
| `loginDisabled` | Replace | deactivate_terminateduser, reactivate_terminateduser |
| `groupMembership` | Add/Delete | deactivate_terminateduser, reactivate_terminateduser |
| `description` | Replace | deactivate_terminateduser, reactivate_terminateduser |
| `mail` | Replace | set_usermailattrs, sync_mailattr |
| `prefmail` | Replace | set_usermailattrs, sync_mailattr |
| `employeeMail` | Replace | sync_mailattr |
| `studentMail` | Replace | sync_mailattr |
| `msxmail` | Replace | sync_mailattr |
| `msxmailhsc` | Replace | sync_mailattr |
| `objectClass` | Add (mailProperties) | sync_mailattr |
| `DirXML-Associations` | Add/Delete/Replace | sync_idmusermailattrs, start_idmsyncuserevent, repair_useridmassns |
| `untAccountHistory` | Add | deactivate_terminateduser, reactivate_terminateduser |
| `untAccountMove` | Replace | move_users (cron) |
| `amspin` | Replace | manage_amsuser |
| `systemaccess` | Add/Replace | manage_amsuser |
| `untsecretanswer` | Delete | manage_amsuser |
| `untsecretquestion` | Delete | manage_amsuser |

## Role in UNT IAM Architecture

eDirectory occupies the **provisioning foundation** layer of UNT's hybrid identity stack. Scripts that provision, deactivate, or modify users in eDirectory typically cascade changes outward to [[recall/entities/active-directory|Active Directory]] and [[recall/entities/microsoft-entra-id]] (via Entra Connect sync or direct Graph API calls). The [[recall/entities/iam-modules]] library provides all eDirectory connections and the `EDirectoryClient` higher-level interface.

This is distinct from the **authentication layer** — users authenticate against Entra ID (via [[recall/concepts/external-authentication-method]] with [[recall/entities/cisco-duo]]), not directly against eDirectory. eDirectory is where identity records are mastered; Entra ID is where authentication occurs.

## Related Pages

- [[recall/entities/iam-modules]]
- [[recall/entities/active-directory]]
- [[recall/entities/unt-system]]
- [[recall/concepts/iam-scripting-architecture]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
- [[recall/synthesis/unt-iam-provisioning-layer]]
