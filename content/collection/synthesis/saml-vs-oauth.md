---
title: "SAML vs. OAuth — Comparison"
type: synthesis
created: 2026-04-23
updated: 2026-04-23
tags:
  - saml
  - oauth
  - authentication
  - authorization
  - iam
  - comparison
sources:
  - "[[collection/sources/2026-04-23-img-2369]]"
confidence: high
---

[[collection/concepts/saml|SAML]] and [[collection/concepts/oauth|OAuth]] are the two dominant protocols in enterprise identity and access management, and they are frequently confused because they both involve a user authenticating somewhere to gain access to a resource. The distinction is sharpest when framed around *what problem each solves*.

## The Core Tension

| Question | SAML answers it | OAuth answers it |
|----------|----------------|-----------------|
| **Who are you?** (Authentication) | Yes — primary use case | Not directly (OIDC extends OAuth to add this) |
| **What can you access?** (Authorization / delegated access) | Incidentally, via assertion attributes | Yes — primary use case |

SAML says: "I am the IdP; I have verified that this user is who they claim to be; here is a signed assertion you can trust."

OAuth says: "Here is an access token; the bearer has been granted permission to perform the actions encoded in its scope."

## Flow Structure Compared

Both protocols use a redirect-based flow where the user is bounced through a central authority before gaining access. The difference lies in the artifact returned:

- **SAML** returns an **XML assertion** (verbose, signed, contains rich identity attributes) sent from the IdP directly to the Service Provider.
- **OAuth** returns an **access token** (compact, opaque or JWT) sent to the Client, which then presents it to the Resource Server.

## Actor Model Compared

| SAML Role | OAuth Equivalent |
|-----------|----------------|
| User | Resource Owner |
| SAML Identity Provider | Authorization Server |
| Service Provider | Resource Server |
| *(no direct equivalent)* | Client (third-party app) |

OAuth introduces an explicit **Client** actor — a third-party application acting on the user's behalf. This is the mechanism that enables "Login with Google" and API integrations. SAML lacks this; it assumes the Service Provider is a first-party application the user is directly accessing.

## Architectural Fit

| Scenario | Better fit |
|----------|-----------|
| Enterprise SSO across internal apps | [[collection/concepts/saml|SAML]] |
| API access with scoped permissions | [[collection/concepts/oauth|OAuth]] |
| Third-party app integration | [[collection/concepts/oauth|OAuth]] |
| Mobile / SPA auth | OAuth + OIDC |
| Legacy enterprise software (HR, ERP) | [[collection/concepts/saml|SAML]] |

## The OIDC Bridge

OpenID Connect (OIDC) extends OAuth 2.0 with an **ID Token** (a JWT asserting the user's identity), making the OAuth ecosystem capable of fully replacing SAML for SSO use cases. Modern cloud-native environments increasingly use OIDC rather than SAML, while SAML remains dominant in legacy enterprise integrations.

## Common Misconception

OAuth is not an authentication protocol in its base form. Using an OAuth access token to determine who a user is (by calling a `/userinfo` endpoint) is an application-layer convention, not part of the OAuth 2.0 specification. OIDC standardizes this convention. Treating raw OAuth as authentication without OIDC is a known security anti-pattern.

## Source

Primary reference: [[collection/sources/2026-04-23-img-2369|SAML vs. OAuth Diagram]] — a side-by-side flow diagram from the "Reco" learning resource.
