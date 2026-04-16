---
title: "eduroam"
type: entity
created: 2026-04-16
updated: 2026-04-16
tags:
  - eduroam
  - networking
  - wifi
  - radius
  - higher-education
sources:
  - "[[sources/2026-04-16-2026-04-16-eduroam-registration]]"
confidence: high
---

# eduroam

eduroam (education roaming) is a secure, worldwide roaming wireless network access service developed for the research and education community. It allows students, researchers, and staff to use their home institution credentials to authenticate on Wi-Fi networks at any participating institution globally.

## Technical Foundation

eduroam is built on [[concepts/radius|RADIUS]] (Remote Authentication Dial-In User Service) federation. When a user connects at a visited institution, authentication requests are proxied back to their home institution's RADIUS server via a hierarchical federation of RADIUS proxies.

## Relationship to InCommon and Internet2

In the United States, eduroam is operated by [[entities/internet2|Internet2]] under the [[entities/incommon|InCommon]] federation umbrella. Institutions that are InCommon participants can join eduroam. Jack Stewart (University of North Texas System) attended the eduroam Technical [[concepts/radius|RADIUS]] Workshop in March 2026 as an InCommon Participant.

## Relevance to UNT System

The University of North Texas System participates in eduroam, enabling UNT faculty, staff, and students to access eduroam Wi-Fi at other institutions and host visiting users from other institutions on their network.

## Sources

- [[sources/2026-04-16-2026-04-16-eduroam-registration|eduroam Technical RADIUS Workshop Registration]]
