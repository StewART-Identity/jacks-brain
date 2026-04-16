---
title: "Provisional Users"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - account-lifecycle
  - deactivation
  - selection
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
confidence: high
---

# Provisional Users

A "provisional user" is an account that has been selected as a **candidate** for deactivation but has not yet been confirmed for deactivation. The provisional list is the output of the Selection phase of the [[concepts/account-deactivation-process|account deactivation process]].

## Selection Criteria

An account is added to the provisional list if it meets both conditions in [[entities/idtree|IDTREE]]:

- `lastLogonTimestamp <= TODAY - 18 months` (inactive for 18+ months)
- `loginDisabled = FALSE` (not already deactivated)

## What Happens to Provisional Users

After selection, each provisional user is checked against all [[concepts/authoritative-data-sources|authoritative data sources]] (Review phase). Users found in any source are **excluded** from the list. Only those remaining after review are actually deactivated.

The term "provisional" reflects the uncertainty: being on the list does not mean the account *will* be deactivated — it means it *might* be, pending the review.

## Related

- [[entities/alma|ALMA]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/authoritative-data-sources|Authoritative Data Sources]]
- [[entities/idtree|IDTREE]]
