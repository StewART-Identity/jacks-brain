---
title: "AD Security Groups"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - active-directory
  - iam
  - access-control
  - security-groups
sources:
  - "[[sources/2026-04-16-2026-04-16-domain-admins-ad]]"
confidence: high
---

# AD Security Groups

Active Directory Security Groups are used to assign permissions and access rights to collections of users within a Windows domain. They are a core mechanism for [[concepts/account-deactivation-process|access control]] in [[entities/active-directory|Active Directory]].

## Group Scope Types

| Scope | Description |
|-------|-------------|
| **Global** | Members from the same domain; can be granted permissions in any domain in the forest |
| **Domain Local** | Used to assign permissions within a single domain; members from any domain |
| **Universal** | Members from any domain; used for cross-domain access assignments |

## Key Built-in Privileged Groups

- **Domain Admins** — Full administrative control over the domain. Members are automatically local administrators on every domain-joined machine.
- **Enterprise Admins** — Forest-wide administrative privileges.
- **Schema Admins** — Can modify the AD schema.

## Governance Considerations

- Privileged groups like Domain Admins should have **designated owners** responsible for membership review.
- Microsoft best practice recommends enabling **Protected from Deletion** on privileged groups to prevent accidental removal.
- Lack of an owner (as observed in the [[sources/2026-04-16-2026-04-16-domain-admins-ad|Domain Admins group record]]) means no accountable steward for membership changes.

## Related

- [[entities/active-directory|Active Directory]]
- [[entities/entra-id|Entra ID]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
