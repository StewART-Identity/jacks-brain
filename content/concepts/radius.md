---
title: "RADIUS (Remote Authentication Dial-In User Service)"
type: concept
created: 2026-04-16
updated: 2026-04-16
tags:
  - protocol
  - authentication
  - networking
  - eduroam
sources:
  - "[[sources/2026-04-16-2026-04-16-eduroam-registration]]"
confidence: high
---

# RADIUS (Remote Authentication Dial-In User Service)

RADIUS is a client-server networking protocol (RFC 2865) that provides centralized authentication, authorization, and accounting (AAA) for users connecting to a network. Originally designed for dial-up internet access, it is now widely used for Wi-Fi authentication, VPN access, and network device management.

## How It Works

1. A network access server (NAS) — e.g., a Wi-Fi access point — receives a connection request.
2. The NAS forwards credentials to a RADIUS server.
3. The RADIUS server validates credentials against a directory (e.g., [[entities/idtree|IDTREE]]/LDAP or [[entities/active-directory|Active Directory]]) and returns an Accept, Reject, or Challenge.
4. In federated deployments (like [[entities/eduroam|eduroam]]), RADIUS servers proxy requests through a hierarchy to reach the user's home institution.

## Role in eduroam

[[entities/eduroam|eduroam]] is built on RADIUS federation. Each institution runs RADIUS servers; [[entities/internet2|Internet2]] operates a national-level RADIUS proxy that routes authentication requests to the correct home institution. UNT IAM staff attended the eduroam Technical RADIUS Workshop (March 4–5, 2026) to build expertise in this infrastructure.

## Relation to UNT IAM

RADIUS is a network-layer protocol distinct from the application-layer identity management handled by [[entities/alma|ALMA]], [[entities/idtree|IDTREE]], and [[entities/active-directory|Active Directory]] — but those systems serve as the authoritative credential stores that RADIUS ultimately authenticates against.
