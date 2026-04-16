---
title: "Rapid7"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - security
  - vulnerability-management
  - tooling
sources:
  - "[[sources/2026-04-16-2026-04-16-remediation]]"
confidence: high
---

# Rapid7

Rapid7 is a cybersecurity company whose **InsightVM** (formerly Nexpose) platform provides vulnerability management for the UNT IAM infrastructure. The platform deploys lightweight **Insight Agents** on managed assets to perform continuous vulnerability assessment without requiring credentialed network scans.

## Role in IAM Environment

Rapid7 Insight Agents are installed across the full IAM server fleet — Linux (`untsystem.edu`) and Windows (`ad.unt.edu` and subdomains) — and report findings to a central InsightVM console. The platform generates risk-scored remediation reports that prioritize work by exposure and exploitability.

The [[sources/2026-04-16-2026-04-16-remediation|IAM Top 25 Remediations by Risk]] report (December 2025) shows 98 total remediations with a combined risk coverage of 96.5% of vulnerabilities across the IAM fleet.

## Key Concepts

- **Risk score:** Composite score combining CVSS severity, asset criticality, exploit availability, and malware kit presence. Used to rank remediations.
- **Insight Agents:** Host-based agents that perform local vulnerability assessment and relay data without requiring network-level scanner access.
- **Sites:** Logical groupings of assets (e.g., "Public Pool 2", "GABDCN", "UNTHSC") used to segment the environment.

## Related Pages
- [[concepts/vulnerability-management|Vulnerability Management]] — the process Rapid7 supports
- [[entities/active-directory|Active Directory]] — Windows assets scanned by Rapid7
- [[entities/duo|Duo]] — Duo servers appear prominently in scan results
- [[sources/2026-04-16-2026-04-16-remediation|IAM Top 25 Remediations by Risk]] — primary source
