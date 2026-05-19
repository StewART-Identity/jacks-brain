---
title: "ISO/IEC JTC 1/SC 6"
summary: "ISO/IEC joint subcommittee responsible for the X.500 directory series (ISO 9594), co-publishing standards with ITU-T Study Group 17."
type: entity
created: 2026-05-04
updated: 2026-05-04
subjects:
  - directory-services
tags:
  - iso
  - iec
  - standards-body
  - x500
  - iso9594
  - itu-t
  - directory-standards
  - asn1
  - defect-resolution
confidence: high
sources:
  - "[[reflect/sources/2026-05-04-t-rec-x-imp500-200109-i-msw-e]]"
---

**ISO/IEC Joint Technical Committee 1, Subcommittee 6** (JTC 1/SC 6) is the ISO/IEC body responsible for telecommunications and information exchange between systems. In the context of directory standards, SC 6 is the ISO/IEC counterpart to [[reflect/entities/itu-t|ITU-T]] Study Group 17 for the joint publication of the **X.500 directory series** as ISO 9594 International Standards.

## Role in X.500 Standardization

The X.500 series is developed and published simultaneously by two bodies:
- **ITU-T** publishes as ITU-T Recommendations (X.500, X.501, X.509, etc.)
- **ISO/IEC JTC 1/SC 6** publishes the identical text as ISO 9594 International Standards (ISO 9594-1, -2, -8, etc.)

The parallel publication is reflected in the joint citation style throughout the standards: *"ITU-T Rec. X.501 (1997) | ISO/IEC 9594-2:1998"*. Both publications carry identical normative text; the dual numbering reflects institutional coordination rather than substantive differences.

## Defect Resolution Partnership

SC 6 participates jointly with ITU-T in the **Directory Defect Resolution Committee**, the international body that reviews implementer-reported defects and approves Technical Corrigenda to the X.500 series. Each Technical Corrigendum must be approved through both the ISO/IEC ballot process and by ITU-T. The [[reflect/sources/2026-05-04-t-rec-x-imp500-200109-i-msw-e|Directory Implementors' Guide]] is distributed through both ITU-T contributions and ISO/IEC JTC 1/SC 6 N-series documents.

The SC 6 Secretariat is hosted by the Korean Standards Association in Seoul. As of 2001, the secretariat contact was Jooran Lee.

## Working Group Structure

Within JTC 1/SC 6, the Directory working group is **WG 7** (Information Systems). The ISO Rapporteur for Directory (the editor of the Directory Implementors' Guide) coordinates defect reports on the ISO side. [[reflect/entities/hoyt-kesterson|Hoyt L. Kesterson II]] served as ISO/IEC Directory Rapporteur and Defect Report Editor for the 3rd and 4th edition periods.

## Relationship to LDAP

The [[reflect/concepts/ldap|LDAP]] protocol and its RFC series are developed in the IETF rather than ITU-T or ISO/IEC. However, LDAP inherits its data model — [[reflect/concepts/distinguished-name|distinguished names]], attribute types, [[reflect/concepts/ldap-object-classes|object classes]] — directly from the X.500 series. RFC 2256 (superseded by RFC 4519) explicitly draws attribute types and object classes from X.501, X.520, X.521, and X.509 as produced by this joint standardization process.
