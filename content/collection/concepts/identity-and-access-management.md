---
title: "Identity and Access Management"
summary: "The discipline of managing digital identities and controlling which resources those identities can access — covering authentication, authorization, and provisioning."
type: concept
created: 2026-05-01
updated: 2026-05-01
subjects:
  - identity-management
tags:
  - iam
  - authentication
  - authorization
  - provisioning
  - directory-services
  - federation
  - lifecycle-management
  - privileged-access
sources:
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
confidence: high
---

Identity and Access Management (IAM) is the discipline concerned with ensuring that the right individuals have access to the right resources, at the right times, for the right reasons. It sits at the intersection of security, operations, and enterprise architecture.

## Core Pillars

- **Authentication**: Verifying that a user is who they claim to be. Mechanisms range from passwords and MFA to federated assertions ([[collection/concepts/saml]], OIDC).
- **Authorization**: Determining what an authenticated identity is permitted to do — governed by roles, groups, entitlements, and access policies.
- **Provisioning / Lifecycle management**: Creating, modifying, and deprovisioning accounts and entitlements as identities are born, change roles, and exit the organization.
- **Directory services**: The data layer — [[collection/concepts/active-directory]], [[collection/concepts/entra-id]], OpenLDAP, eDirectory — that stores identity attributes and group memberships.
- **Privileged access management (PAM)**: A specialized subset focused on high-privilege accounts, secrets, and credential vaulting. CyberArk is the canonical enterprise PAM platform in this wiki.
- **Federation**: Extending identity across organizational and application boundaries using standards like [[collection/concepts/saml]].

## IAM in Higher Education

Higher education presents a distinctive IAM environment: large, heterogeneous populations (students, staff, faculty, alumni, guests), high lifecycle churn (enrollment/graduation cycles), decentralized governance, and a mix of on-premise legacy systems and cloud services.

[[collection/entities/jack-stewart]]'s 29-year career demonstrates the full arc of higher-ed IAM: starting with early directory services and Novell DirXML connector work at [[collection/entities/university-of-louisville]], maturing through complex multi-system environments at [[collection/entities/university-of-michigan]], and continuing with cloud-first architecture at [[collection/entities/university-of-north-texas]].

See [[collection/synthesis/iam-career-in-higher-education]] for a synthesis of how IAM practices in higher education have evolved across this career.
