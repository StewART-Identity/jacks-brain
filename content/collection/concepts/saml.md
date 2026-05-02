---
title: "SAML"
summary: "Security Assertion Markup Language — the XML-based federation standard enabling SSO across organizational and application boundaries via IdP-to-SP assertions."
type: concept
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
tags:
  - saml
  - federation
  - sso
  - shibboleth
  - internet2
  - xml
  - authentication
  - idp
  - sp
  - higher-education
sources:
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
confidence: high
---

Security Assertion Markup Language (SAML) is an XML-based open standard for exchanging authentication and authorization data between parties — specifically, between an **Identity Provider (IdP)** that asserts who a user is and a **Service Provider (SP)** that consumes that assertion to grant access.

## How SAML Works

1. A user attempts to access an SP-protected resource.
2. The SP redirects the user to the IdP with a SAML AuthnRequest.
3. The IdP authenticates the user and issues a signed XML assertion.
4. The SP validates the assertion's signature and grants access.

The assertion carries attributes about the user (email, name, group memberships) that the SP uses for fine-grained authorization.

## SAML vs. Modern Protocols

SAML (2002) predates OAuth 2.0 and OIDC. Modern SSO increasingly uses OIDC, but SAML remains dominant in enterprise and higher education contexts — especially where legacy SPs were integrated before OIDC was widely adopted. [[collection/concepts/entra-id]] supports both protocols.

## Shibboleth

Shibboleth is the dominant SAML implementation in higher education, maintained by Internet 2 and the Shibboleth Consortium. It provides both IdP and SP components and is pre-configured for common higher-ed attribute schemas (eduPerson, etc.). [[collection/entities/jack-stewart]] worked with Shibboleth at [[collection/entities/university-of-michigan]], processing SSO requests for the university's application portfolio.

See [[collection/concepts/identity-and-access-management]] for the broader IAM context.
