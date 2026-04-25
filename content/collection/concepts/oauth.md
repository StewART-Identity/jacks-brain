---
title: "OAuth"
summary: "Open standard for delegated access — letting an app access a user's data without their password."
type: concept
created: 2026-04-23
updated: 2026-04-23
tags:
  - oauth
  - authorization
  - access-token
  - api
  - iam
sources:
  - "[[collection/sources/2026-04-23-img-2369]]"
confidence: high
---

OAuth (Open Authorization) is an open standard protocol that allows a **Client** to obtain limited access to a resource on behalf of a **Resource Owner**, without exposing the owner's credentials to the Client. The current version is OAuth 2.0 (RFC 6749).

## Core Roles

| Role | Description |
|------|-------------|
| Resource Owner | The user who owns the protected data |
| Client | The application requesting access on the user's behalf |
| Authorization Server | Issues access tokens after authenticating the Resource Owner |
| Resource Server | Hosts the protected resources; validates tokens |

## Core Flow (Authorization Code)

1. The Resource Owner tries to access a protected resource through the Client.
2. The Client redirects the user to the Authorization Server's login page.
3. The user authenticates (inputs credentials).
4. The Client presents OAuth credentials (client ID + secret) to the Authorization Server.
5. The Authorization Server issues an **Access Token**.
6. The Client presents the Access Token to the Resource Server.
7. The Resource Server validates the token and returns the protected resource.

## Access Tokens

Tokens can be opaque strings (looked up server-side) or self-contained **JWTs** that encode claims (scope, expiry, subject) in a signed payload the Resource Server can verify locally.

## Relationship to SAML

OAuth is primarily an **authorization** protocol (delegated access), whereas [[collection/concepts/saml|SAML]] is an **authentication + SSO** protocol. OpenID Connect (OIDC) extends OAuth 2.0 with an identity layer (ID Token) to cover the authentication gap, making OIDC the modern alternative to SAML for SSO. See [[collection/synthesis/saml-vs-oauth|SAML vs. OAuth — Comparison]].

## Common Use Cases

- Third-party app integration ("Sign in with Google", GitHub OAuth apps).
- API authorization with scoped tokens.
- Mobile and single-page application auth flows.
