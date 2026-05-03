---
title: "Rob Weltman"
summary: "Yahoo!, Inc. engineer and sole author of RFC 4370, which standardized the LDAP Proxied Authorization Control using a Netscape-arc OID from his prior tenure."
type: entity
created: 2026-05-02
updated: 2026-05-02
subjects:
  - directory-services
tags:
  - ldap
  - ldapv3
  - ietf
  - rfc
  - rfc4370
  - rfc3829
  - proxy-authorization
  - authorization-identity
  - netscape
  - yahoo
confidence: high
sources:
  - "[[collection/sources/2026-05-02-rfc4370-txt]]"
  - "[[collection/sources/2026-05-02-rfc4532-txt]]"
---

Rob Weltman is a software engineer affiliated with Yahoo!, Inc. (701 First Avenue, Sunnyvale, CA 94089; `robw@worldspot.com`) at the time of [[collection/sources/2026-05-02-rfc4370-txt|RFC 4370]]'s publication in February 2006. He is the sole author of the RFC, which standardized the LDAP Proxied Authorization Control on the Standards Track.

## RFC Authorship

| RFC | Title | Role |
|---|---|---|
| RFC 3829 (2004) | LDAP Authorization Identity Request and Response Controls | Co-author (with [[collection/entities/mark-smith\|Mark Smith]], [[collection/entities/mark-wahl\|Mark Wahl]]) |
| RFC 4370 (2006) | LDAP Proxied Authorization Control | Author |

## RFC 3829 and the Authorization Identity Controls

RFC 3829 (July 2004) defined the Authorization Identity Request and Response Controls — a mechanism for LDAP clients to obtain the authorization identity the server associates with a session, delivered via Bind request and response controls. [[collection/entities/kurt-zeilenga|Kurt Zeilenga]]'s [[collection/sources/2026-05-02-rfc4532-txt|RFC 4532]] (June 2006) is explicitly intended to replace this mechanism; the core limitation was that Bind controls are not protected by the security layers the Bind operation establishes. RFC 4532 acknowledges Weltman's prior work. RFC 3829 has not been cataloged as a wiki source, but its influence is present through RFC 4532's design decisions.

## Netscape Provenance

The OID assigned to the [[collection/concepts/ldap-proxy-authorization|Proxy Authorization Control]] — `2.16.840.1.113730.3.4.18` — sits in [[collection/entities/netscape-communications|Netscape Communications Corp.'s]] OID arc (`2.16.840.1.113730`). Though the RFC was published while Weltman was at Yahoo!, Inc., the OID registration predates the RFC, suggesting the control was designed and the OID assigned during an earlier tenure at Netscape.

This pattern — a vendor OID carried into IETF standardization by an author who has since moved organizations — also appears in the [[collection/concepts/ldap-controls|controls]] defined in [[collection/sources/2026-05-02-rfc2696-txt|RFC 2696]] and [[collection/sources/2026-05-02-rfc2891-txt|RFC 2891]], whose OIDs are in [[collection/entities/microsoft|Microsoft's]] arc despite being submitted through the IETF process. In both cases, the OID arc reflects where the extension was first implemented, not where it was ultimately standardized.
