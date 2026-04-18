---
title: "Orphaned Authentication Registrations"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - entra-id
  - iam
  - incident
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]"
confidence: high
---

A platform behavior in [[recall/entities/microsoft-entra-id]] where deleting an [[recall/concepts/external-authentication-method]] (EAM) configuration does **not** remove the corresponding EAM registrations from individual user objects. The result is a silent mismatch: the tenant-level EAM policy is gone, but user objects still carry stale registration records.

## Discovery

This behavior was first discovered by [[recall/entities/unt-system]]'s IAM team during the January 28, 2026 ADFS → Entra ID migration. After [[recall/entities/cisco-duo]] was configured and then deleted as part of migration testing or cutover sequencing, 72,274 user accounts retained orphaned EAM registration entries. Neither Microsoft nor Cisco Duo had documented this behavior or any cleanup requirement.

## Impact

- 72,274 accounts affected — the entire UNT System user population
- Required custom PowerShell scripting to scan and remove orphaned registrations
- Discovered post-go-live, forcing emergency remediation in production

## Root Cause: Policy vs. User Object Split

The underlying issue is a structural disconnect in Entra ID's data model: authentication method configuration exists at the **tenant policy level**, but user registrations are stored on **individual user objects**. Operations on the tenant policy (including deletion) do not cascade to user objects. This same split was the root cause of the "no pre-migration user audit guidance" gap — Microsoft's migration documentation focuses on policy state, not user object state.

## Detection: How Testing Would Have Caught It

Under the [[recall/concepts/iam-testing-methodology]], functional testing of the full EAM lifecycle — creating, modifying, and deleting the EAM configuration — would have exposed this behavior in the staging tenant ([[recall/concepts/entra-id-three-tenant-model]]). A pre-migration user audit of authentication method registrations in staging would also have revealed the discrepancy. Either approach would have surfaced the issue before production.

## Mitigation

Custom PowerShell scripts to scan all user objects for EAM registration entries and remove them. These scripts are now part of [[recall/entities/unt-system]] IAM team's operational toolkit.

## Industry Validation

The [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-|Authentication Methods Migration Executive Brief]] (February 2026) confirms that after extensive research across Microsoft's official documentation, Cisco Duo's EAM documentation, Microsoft Q&A, community forums, and consultant blogs, **no guidance exists anywhere in the industry** regarding the need to audit or clean up authentication method registrations on user objects before, during, or after migration. No other organization has publicly documented performing this cleanup.

This represents a simultaneous documentation gap from both Microsoft and Cisco — not a niche edge case, but a missing piece of standard migration guidance.

## Related Pages

- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/unt-system]]
- [[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]
- [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]
