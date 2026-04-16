---
title: "Active Directory (AD)"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - iam
  - directory-service
  - microsoft
  - identity-management
sources:
  - "[[sources/2026-04-16-2026-04-16-account-lifecycle-management-application-deactivation-process]]"
  - "[[sources/2026-04-16-2026-04-16-domain-admins-ad]]"
  - "[[sources/2026-04-16-2026-04-16-remediation]]"
confidence: high
---

# Active Directory (AD)

Active Directory is the university's Windows directory service. It is one of the target systems where [[entities/alma|ALMA]] applies account [[concepts/account-deactivation-process|deactivation]] actions.

## Domains

ALMA manages accounts across three AD domains:

- **HSC** — Health Science Center
- **STUDENTS** — Student accounts
- **UNT** — Main university domain

## Deactivation Actions

When ALMA deactivates a user in AD:

- `userAccountControl` bit 2 is set (disables the account)
- `description` is set to `"Account deactivated by IAM. YYYY-MM-DD HH:MM:SS"`

## Global Catalog

[[entities/entra-id|Entra ID]] and the on-premise AD Global Catalog (GC) are both accessible via the ALMA API for UPN/email lookups:

- `GET /api/ad/upn/{username}` — on-prem GC
- `GET /api/entra/upn/{username}` — cloud (Entra ID)

## Privileged Groups

The **Domain Admins** [[concepts/ad-security-groups|Global Security group]] grants full administrative control over the domain. Key facts from the [[sources/2026-04-16-2026-04-16-domain-admins-ad|group record]]:

- SAM account name: `Domain Admins`
- Created: Jul 30, 2007
- No designated owners listed
- Not protected from accidental deletion (security posture gap)

## Security Posture (from Rapid7 Scans)

The [[sources/2026-04-16-2026-04-16-remediation|December 2025 vulnerability report]] identifies several issues across AD domain controllers:

- **3DES cipher suite enabled** on 24 domain controllers (Item 21) — deprecated cipher, should be disabled
- **Certificate Padding Check missing (CVE-2013-3900)** on 35 Windows hosts (Item 24) — registry fix required
- **CVE-2022-0001 (Branch History Injection / Intel BHI)** affecting 47 Windows assets (Item 25) — microarchitectural side-channel; requires registry mitigation
- **Windows cumulative updates outstanding**: Server 2022 (35 hosts), 2019 (5 hosts), 2016 (5 hosts)

See [[concepts/vulnerability-management|Vulnerability Management]] for the broader remediation context.

## Related

- [[entities/alma|ALMA]]
- [[entities/entra-id|Entra ID]]
- [[entities/idtree|IDTREE]]
- [[entities/rapid7|Rapid7]]
- [[concepts/account-deactivation-process|Account Deactivation Process]]
- [[concepts/ad-security-groups|AD Security Groups]]
- [[concepts/vulnerability-management|Vulnerability Management]]
