---
title: "Rapid7 Insight"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - vulnerability-management
  - security
  - tooling
  - rapid7
sources:
  - "[[sources/2026-04-16-2026-04-16-remediation]]"
confidence: high
---

# Rapid7 Insight

Rapid7 Insight is the vulnerability management platform used by [[entities/unt|UNT]] IAM to scan infrastructure and prioritize remediation. The deployment uses **Rapid7 Insight Agents** — lightweight agents installed on each managed host — to report vulnerability data back to the Insight platform.

## Role at UNT

- Scans the full IAM infrastructure across Windows and Linux hosts
- Agents are installed across all production and development IAM servers (domains: `*.untsystem.edu`, `*.ad.unt.edu`, and public pools)
- Produces risk-ranked remediation reports used to prioritize patching work
- As of December 2025, covers at least 98 IAM assets

## Report Format

Rapid7 reports surface remediations ranked by composite risk score. Each item includes:
- Number of assets affected
- Number of vulnerabilities addressed
- Total risk score
- Whether published exploits or malware kits exist
- Per-asset IP addresses and site assignments

## Site Labels Observed

| Site Label | Meaning |
|------------|---------|
| Rapid7 Insight Agents | Agent-based scan (most hosts) |
| Public Pool 1–4 | Network-based scans from different scanner pools |
| GABDCN | GAB Data Center Network segment |
| UNTHSC | UNT Health Science Center network segment |

## Related Pages

- [[entities/unt|UNT]] — institution using the platform
- [[concepts/vulnerability-management|Vulnerability Management]] — the process Rapid7 supports
- [[sources/2026-04-16-2026-04-16-remediation|IAM Top 25 Remediations (Dec 2025)]] — example output report
