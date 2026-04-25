---
title: "SAML"
type: concept
created: 2026-04-23
updated: 2026-04-23
tags:
  - saml
  - identity
  - authentication
  - federation
  - sso
  - iam
sources:
  - "[[collection/sources/2026-04-23-img-2369]]"
confidence: high
---

Security Assertion Markup Language (SAML) is an XML-based open standard for exchanging authentication and authorization data between an Identity Provider (IdP) and a Service Provider (SP). It is the dominant protocol for enterprise Single Sign-On (SSO) and federated identity.

## Core Flow

1. A user attempts to access a Service Provider resource.
2. The SP redirects the unauthenticated user to the SAML Identity Provider with a SAML request.
3. The IdP presents a login page, validates credentials against a directory (e.g., [[collection/entities/active-directory|Active Directory]]), and issues an XML-based **SAML assertion**.
4. The assertion is passed back to the Service Provider, which grants access.

The credential verification step involves the IdP querying a backend directory; the Service Provider never touches the raw credentials.

## Key Components

| Component | Role |
|-----------|------|
| Identity Provider (IdP) | Issues SAML assertions after authenticating the user |
| Service Provider (SP) | Consumes SAML assertions to authorize access |
| User Directory (e.g., AD) | Stores credentials the IdP validates against |
| SAML Assertion | Signed XML document asserting identity claims |

## Strengths

- Purpose-built for enterprise SSO across organizational boundaries.
- Assertions carry rich attribute data (roles, groups, email) in a single signed token.
- Mature standard with broad enterprise software support.

## Limitations

- XML-heavy; complex to implement compared to [[collection/concepts/oauth|OAuth]]/OIDC.
- Less suited for mobile and API-first architectures.
- Tightly coupled to browser-redirect flows.

## Relationship to OAuth

SAML handles **authentication** (who are you?) and conveys the result as an assertion. [[collection/concepts/oauth|OAuth]] handles **authorization** (what can you access?) and conveys the result as an access token. They solve adjacent but distinct problems; many enterprises run both. See [[collection/synthesis/saml-vs-oauth|SAML vs. OAuth — Comparison]].
