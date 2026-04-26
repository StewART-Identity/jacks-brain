---
title: "Active Directory"
summary: "Microsoft directory service used by UNT System for account management; automated AD offboarding via provisioning scripts has been inactive since ~2022."
type: entity
created: 2026-04-26
updated: 2026-04-26
subjects:
  - identity-management
tags:
  - active-directory
  - ad
  - ldap
  - kerberos
  - directory
  - offboarding
  - deprovisioning
  - exchange-activesync
  - unt-system
sources:
  - "[[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]]"
confidence: high
---

Active Directory (AD) is [[collection/entities/unt-system]]'s on-premises Microsoft directory service, used for account authentication, authorization, and management across the UNT System campuses. It is distinct from [[collection/entities/microsoft-entra-id]] (the cloud identity platform), though the two are federated.

## Offboarding Gap

As documented in [[collection/sources/2026-04-26-iam-brief-deprovisioning-gap-analysis]], automated AD [[collection/concepts/deprovisioning]] via the dstools provisioning infrastructure is inactive. `ad/offboarding.py` contains logic to disable AD accounts and delete Exchange ActiveSync objects but does not appear in any crontab.

The only scheduled offboarding-adjacent process is `idtree/idtree_offboarding_workaround.py` (daily at 11:59 PM), which removes terminated employees from [[collection/entities/idtree]] group memberships — including the DuoHelpDesk group — but does not disable accounts or touch AD or [[collection/entities/cisco-duo]].

Any AD account disablement for separated employees currently depends on manual action or Identity Manager drivers rather than the provisioning server.

## Remediation Path

The `iam-scripts-alma-v2` deactivation/reactivation scripts in the `iam-scripts-provisioning` repository already integrate with AD alongside [[collection/entities/cisco-duo]], eDirectory, and [[collection/entities/microsoft-entra-id]].
