---
title: "eduroam"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - wifi
  - networking
  - radius
  - higher-education
  - internet2
sources:
  - "[[sources/2026-04-16-2026-04-16-eduroam-registration]]"
confidence: high
---

# eduroam

eduroam (education roaming) is a secure, worldwide Wi-Fi roaming service built for the international research and education community. It allows students, researchers, and staff to use their home institution credentials to access Wi-Fi at any eduroam-enabled site globally.

## Technical Foundation

eduroam is built on [[concepts/radius|RADIUS]] (Remote Authentication Dial-In User Service) federation. When a user connects at a visited institution, the authentication request is proxied via a hierarchy of RADIUS servers back to the user's home institution, which performs the actual credential check.

## Relevance to UNT

[[entities/unt|UNT]] operates eduroam on its campuses. UNT IAM staff (including Jack Stewart) have engaged in technical training — notably the [[entities/internet2|Internet2]]-hosted eduroam Technical RADIUS Workshop (March 4–5, 2026) — to develop expertise in deploying and managing the RADIUS infrastructure that underpins eduroam.

## Governance

- U.S. eduroam service is coordinated by [[entities/internet2|Internet2]]
- Institutions must be [[entities/incommon|InCommon]] participants or meet equivalent trust requirements to join the eduroam federation
