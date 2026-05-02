---
title: "NetIQ Identity Manager"
summary: "Enterprise identity provisioning platform (formerly Novell DirXML) built around a metadirectory vault that drives connected systems via bidirectional drivers."
type: entity
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
tags:
  - netiq
  - novell
  - dirxml
  - identity-provisioning
  - edirectory
  - idm
  - synchronization
  - connectors
  - metadirectory
  - xslt
  - scripting-driver
sources:
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
confidence: high
---

NetIQ Identity Manager (IDM) is an enterprise identity provisioning platform built around a **metadirectory** — a central identity vault (NetIQ eDirectory) from which connected systems are driven via bidirectional drivers. Each driver handles synchronization between eDirectory and a specific target (Active Directory, LDAP, databases, HR systems, REST APIs, etc.).

## Naming History

| Period | Name |
|--------|------|
| 2001–2003 | Novell DirXML |
| 2003–2011 | Novell Identity Manager |
| 2011–2014 | NetIQ Identity Manager (post-Attachmate acquisition) |
| 2014–2023 | NetIQ IDM (Micro Focus era) |
| 2023–present | Part of OpenText Identity portfolio |

## Technical Model

- **Identity Vault**: eDirectory holds the canonical identity record.
- **Drivers**: Each driver handles one connected system; drivers have Publisher (inbound to vault) and Subscriber (outbound from vault) channels.
- **Policies**: XSLT or ECMAScript policies transform and filter events at each layer.
- **Driver types**: Built-in drivers for common targets (AD, LDAP, JDBC); the Scripting driver (Python/Ruby) handles custom or REST-based targets.
- **Entitlements**: IDM drives role and resource assignments via the User Application or Role and Resource Service Driver.

## Role in This Wiki

[[collection/entities/jack-stewart]] has deep expertise with NetIQ IDM spanning two employers:

- At [[collection/entities/university-of-louisville]] (2002–2005): Implemented the first version (then Novell DirXML 1.1a), writing connectors in XSLT. This was Jack's entry into production [[collection/concepts/identity-and-access-management]].
- At [[collection/entities/university-of-michigan]] (2020): Wrote a custom scripting driver to provision users/groups from eDirectory to TeamDynamix, supplemented by Python scripts.

The shift from XSLT connectors (Louisville) to Python scripting drivers (Michigan) reflects how IDM's extensibility model evolved over two decades — and how [[collection/entities/jack-stewart]]'s own tooling evolved with it. See [[collection/synthesis/iam-career-in-higher-education]] for the broader pattern.
