---
title: "RADIUS"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - radius
  - networking
  - authentication
  - aaa
  - eduroam
sources:
  - "[[sources/2026-04-16-2026-04-16-eduroam-registration]]"
confidence: high
---

# RADIUS

RADIUS (Remote Authentication Dial-In User Service) is a networking protocol that provides centralized Authentication, Authorization, and Accounting (AAA) for users connecting to a network. It is widely used in enterprise Wi-Fi, VPN, and dial-up environments.

## How It Works

1. A user attempts to connect to a network (via Wi-Fi access point, VPN concentrator, etc.)
2. The network access server (NAS) forwards credentials to a RADIUS server
3. The RADIUS server verifies credentials against an identity store (e.g., [[entities/active-directory|Active Directory]], LDAP)
4. The server returns an Access-Accept or Access-Reject response
5. Accounting messages track session start/stop for audit and billing

## RADIUS in eduroam

[[entities/eduroam|eduroam]] is built entirely on federated RADIUS. When a visiting user connects at an institution, the visited institution's RADIUS server proxies the authentication request up through a hierarchy of national and regional RADIUS servers until it reaches the user's home institution. [[entities/internet2|Internet2]] operates the U.S. national RADIUS proxy layer for eduroam under the [[entities/incommon|InCommon]] federation.

Jack Stewart attended the eduroam Technical RADIUS Workshop (March 4–5, 2026) — hands-on training for institutional administrators managing this infrastructure.

## Relevance to UNT System

UNT System operates RADIUS servers to authenticate users on eduroam-enabled Wi-Fi. Proper RADIUS configuration is required to maintain eduroam membership and ensure secure roaming for students, faculty, and staff.

## Sources

- [[sources/2026-04-16-2026-04-16-eduroam-registration|eduroam Technical RADIUS Workshop Registration]]
