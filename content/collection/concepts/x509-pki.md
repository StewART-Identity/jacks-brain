---
title: "X.509 Public Key Infrastructure"
summary: "ITU-T/ISO framework for public-key certificates, certification paths, certificate policies, and revocation — the backbone of TLS and enterprise PKI."
type: concept
created: 2026-05-04
updated: 2026-05-04
subjects:
  - pki
tags:
  - x509
  - pki
  - certificate
  - certification-path
  - crl
  - certificate-policies
  - name-constraints
  - itu-t
  - iso
  - directory-services
  - tls
  - asn1
  - cross-certification
  - revocation
  - ca
confidence: high
sources:
  - "[[collection/sources/2026-05-04-t-rec-x-imp500-200109-i-msw-e]]"
  - "[[collection/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e]]"
  - "[[collection/sources/2026-05-04-t-rec-x-509-202110-i-cor1-pdf-e]]"
---

**X.509** is ITU-T Recommendation X.509 | ISO/IEC 9594-8, *The Directory: Authentication Framework* (and, in later editions, *Public-Key and Attribute Certificate Frameworks*). Originally a component of the [[collection/entities/itu-t|ITU-T]] X.500 directory series, X.509 became the universal standard for public-key certificates and is the foundation of TLS/HTTPS, S/MIME, code signing, and enterprise [[collection/concepts/ldap-tls|LDAP TLS]] authentication.

X.509 was co-published alongside the [[collection/sources/2026-05-04-t-rec-x-500-198811-s-pdf-e|1988 X.500 specification]], where it served as the "strong authentication" mechanism: the directory would hold users' public encryption keys, and X.509 defined the procedures for obtaining those keys and authenticating between entities using them. X.509 thus began as a directory authentication service, not as an internet PKI standard.

This subject (`pki`) is introduced here because X.509 PKI spans far beyond directory services — it is the trust infrastructure for the broader internet. The existing `directory-services` subject does not capture this scope.

## Certificate Structure

An X.509 certificate binds a public key to a subject identity, signed by a certification authority (CA). The v3 structure includes:
- **Version** (must be v2 for attribute certificates; v3 for public-key certificates with extensions)
- **Serial number** (unique per issuing CA)
- **Signature algorithm identifier**
- **Issuer name** (Distinguished Name of the CA)
- **Validity period** (notBefore / notAfter — UTCTime for dates through 2049, GeneralizedTime thereafter)
- **Subject name** (Distinguished Name of the certificate subject)
- **SubjectPublicKeyInfo** (algorithm + public key)
- **Extensions** (v3 only; flagged critical or non-critical)

## Certificate Extensions and Criticality

A v3 extension carries a critical flag with precise semantics (clarified in Technical Corrigendum 2 to the 3rd edition, DR 244):

- A **recognized** extension MUST be processed regardless of whether it is flagged critical or non-critical.
- An **unrecognized critical** extension causes the certificate to be rejected.
- An **unrecognized non-critical** extension is ignored.

The criticality flag thus governs behavior only for *unrecognized* extensions. This clarification resolved a widespread implementation gap where implementations treated non-critical extensions as optional to process even when they understood the extension type.

## Certification Path Processing

A **certification path** is a sequence of certificates from a trust anchor to an end-entity certificate, where each certificate's subject is the issuer of the next. Validation requires processing all certificates in the path and checking that the path is valid under at least one acceptable certificate policy.

The formal certification path processing procedure (introduced in X.509 TC1, 3rd edition, DR 222) defines:

**Inputs:**
- The certification path itself
- A trusted public key (trust anchor)
- `initial-policy-set`: acceptable certificate policies (or `any-policy`)
- `initial-explicit-policy`: whether an acceptable policy must appear in every certificate
- `initial-policy-mapping-inhibit`: whether policy mapping is forbidden
- `initial-inhibit-policy`: whether `anyPolicy` matches specific policies

**State variables maintained across certificates:**
- `authorities-constrained-policy-set`: table of policies and qualifiers from all processed certificates
- `permitted-subtrees` / `excluded-subtrees`: name constraint state
- `explicit-policy-indicator`: currently active explicit policy requirement
- `path-depth`: certificate index
- Pending constraint indicators for deferred constraints

**For each certificate in the path**, the procedure checks signature validity, date validity, name chaining, and revocation; processes the certificate policies extension (updating the policy table); enforces name constraints; records policy mapping; and advances state variables.

**Outputs:** success/failure, diagnostic code, `authorities-constrained-policy-set`, `user-constrained-policy-set` (intersection of authorities-constrained and initial-policy-set).

## Certificate Policies

The `certificatePolicies` extension lists the policy OIDs under which a certificate was issued. Policy processing across a certification path determines which policies are valid end-to-end:

- **`anyPolicy`** OID: if present in a certificate and `inhibit-any-policy-indicator` is not set, it matches any specific policy — allowing a CA to assert that its certificates are valid under all policies recognized by certificate users.
- **`inhibitAnyPolicy`** extension (added in TC3, DR 272): specifies that `anyPolicy` is not considered a match for any specific policy value, with a `SkipCerts` count for deferred effect.
- **Policy mapping**: an intermediate CA may declare that a policy OID in its own domain is equivalent to one in the subject CA's domain, using the `policyMappings` extension.
- **`requireExplicitPolicy`**: constrains the path so that every certificate must contain an acceptable policy identifier.
- **`inhibitPolicyMapping`**: forbids further policy mapping beyond a specified number of certificates.

## Name Constraints

The `nameConstraints` extension (in CA certificates only) restricts the name space valid for subjects in subsequent certificates in the path:

- **`permittedSubtrees`**: subject names must fall within at least one permitted subtree for each name form present
- **`excludedSubtrees`**: any subject name in an excluded subtree makes the certificate unacceptable
- **`requiredNameForms`** (added in TC3/DR 273): all subsequent certificates must include a subject name of at least one of the required name forms — e.g., requiring that all subjects have both a DirectoryName and an rfc822Name

Only name forms with a well-defined hierarchical structure (e.g., `directoryName`) may appear in `permittedSubtrees`/`excludedSubtrees`.

## Revocation

X.509 defines **Certificate Revocation Lists (CRLs)** as the mechanism for communicating certificate invalidity before natural expiry.

### CRL Distribution Points

The `cRLDistributionPoints` extension in a certificate specifies where to retrieve the CRL covering that certificate. The **Issuing Distribution Point (IDP)** extension in a CRL identifies which CRL distribution point the CRL belongs to, and partitions coverage:

- `containsUserPublicKeyCerts` / `containsCACerts`: which certificate populations the CRL covers
- `containsUserAttributeCerts` / `containsAACerts` / `containsSOAPublicKeyCerts`: attribute certificate populations (4th edition)
- `onlySomeReasons`: if present, CRL only covers the listed revocation reason codes
- `indirectCRL`: CRL may contain revocations from issuers other than the CRL issuer itself

The IDP extension is always critical — a certificate user that cannot process it cannot assume the CRL is complete.

### Delta CRLs

The `freshestCRL` (also called `deltaCRLIndicator`) mechanism allows issuing smaller incremental CRLs between full CRL publications, reducing bandwidth for large CRL populations.

## Cross-Certification

A CA may issue a certificate to *another CA* — a **cross-certificate**. Cross-certificates enable certification paths to cross organizational and policy-domain boundaries. In the X.500 directory, a CA's entry holds:

- `cACertificate` attribute: self-issued certificates and certificates from CAs in the same realm
- `crossCertificatePair` attribute: `issuedByThisCA` (certificates where this CA is subject) and `issuedToThisCA` (certificates issued by this CA to other CAs) — renamed from `forward`/`reverse` in DR 257

Cross-certification introduces the need for policy mapping: if two CAs operate in different policy domains, the intermediate CA can use the `policyMappings` extension to declare that its own policy OID corresponds to the subject CA's policy OID.

## Self-Issued Certificates

A CA may issue a certificate to itself in three circumstances:
1. To encode its public key for communication (verified using the public key within the certificate itself)
2. For key usages other than certificate/CRL signing (e.g., time-stamping) — treated as end-entity certificates
3. For key rollover (self-issued intermediate certificates) — do not contribute to `pathLenConstraint` counting

## CertificatePair and PkiPath

The `CertificatePair` (`issuedByThisCA`/`issuedToThisCA`) structure in the directory supports bidirectional cross-certification. The `PkiPath` type (added in TC2, 4th edition, DR 279) represents a certification path as a SEQUENCE OF Certificate, ordered so that each certificate's subject is the issuer of the next.

## Algorithm Framework

The cryptographic algorithm framework in X.509 is built around the `ALGORITHM` information object class, formally specified in clause 6.2.2 (corrected by Technical Corrigendum 1 to the 9th edition, DR 431). See [[collection/sources/2026-05-04-t-rec-x-509-202110-i-cor1-pdf-e|X.509 Cor.1 (2021)]] for the full ASN.1.

```asn1
ALGORITHM ::= CLASS {
    &Type       OPTIONAL,
    &DynParms   OPTIONAL,
    &id         OBJECT IDENTIFIER UNIQUE }
WITH SYNTAX {
    [PARMS      &Type]
    [DYN-PARMS  &DynParms]
    IDENTIFIED BY &id }
```

Three parameterized types are built on this class for different signalling needs:

| Type | When used |
|---|---|
| `AlgorithmIdentifier` | Algorithm type signalled *without* invocation — used in certificate `signatureAlgorithm`, `subjectPublicKeyInfo.algorithm` |
| `AlgorithmWithInvoke` | Algorithm type signalled *with* its invocation (includes dynamic parameters) |
| `AlgoInvoke` | Only dynamic invocation parameters, when the algorithm is already known |

`AlgorithmIdentifier` is what practitioners most commonly encounter: it appears in every X.509 certificate, every CRL, and every TLS handshake that negotiates a certificate-based algorithm. The corrigendum formalization makes the parameter constraint system (which OIDs are valid, which ASN.1 types apply to each OID's parameters field) machine-checkable rather than prose-described.

## Relationship to LDAP and Directory Services

X.509 began as an authentication component of the X.500 directory series and retains close ties to it. The [[collection/concepts/x500-user-schema|X.500 user schema]] defines PKI-specific object classes (`strongAuthenticationUser`, `certificationAuthority`, `certificationAuthority-V2`) and attribute types (`userCertificate`, `cACertificate`, `certificateRevocationList`, `crossCertificatePair`) that store X.509 certificates in LDAP/X.500 directory entries.

In [[collection/concepts/ldap-tls|LDAP TLS]], X.509 certificates are used by both clients and servers for mutual authentication via TLS, with [[collection/concepts/sasl|SASL EXTERNAL]] binding TLS credentials to LDAP authorization identity.

The IETF PKI (PKIX) working group translated the ITU-T X.509 framework into the Internet PKI profile, published as RFC 2459 (superseded by RFC 3280, then RFC 5280). These Internet PKI documents closely parallel the X.509 corrigenda processed in the [[collection/sources/2026-05-04-t-rec-x-imp500-200109-i-msw-e|Directory Implementors' Guide]] — the certification path processing algorithm in RFC 3280 reflects the same state machine introduced in X.509 Technical Corrigendum 1 (3rd edition).
