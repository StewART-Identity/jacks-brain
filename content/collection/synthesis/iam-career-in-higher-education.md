---
title: "IAM Career in Higher Education: Jack Stewart's Arc"
summary: "Synthesis of Jack Stewart's 29-year IAM career — tracing the evolution from early directory services to cloud identity architecture across three universities."
type: synthesis
created: 2026-05-01
updated: 2026-05-02
subjects:
  - identity-management
  - career
tags:
  - iam
  - higher-education
  - active-directory
  - entra-id
  - netiq
  - cloud-identity
  - identity-provisioning
  - career-trajectory
  - ansible
  - metadirectory
  - platform-migration
sources:
  - "[[collection/sources/2026-05-01-manuel-jack-stewart-ii-resume]]"
  - "[[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces]]"
confidence: high
---

This synthesis traces [[collection/entities/jack-stewart]]'s 29-year career as an IAM practitioner in higher education, identifying the patterns, transitions, and technological evolution visible across three employer institutions.

## Phase 1: Infrastructure Origins (1994–2002, UofL)

Jack's career at [[collection/entities/university-of-louisville]] began in infrastructure — LAN team leadership and student computer lab upgrades — before moving into Directory Services team leadership in 2003. This infrastructure grounding shapes his later work: he approaches [[collection/concepts/identity-and-access-management]] problems with the operational awareness of someone who has provisioned the machines that run the systems.

## Phase 2: First IAM Implementation (2002–2012, UofL)

The 2002–2005 [[collection/entities/netiq-identity-manager]] implementation at Louisville (then Novell DirXML 1.1a) was Jack's entry into production IAM engineering. Writing XSLT connectors against eDirectory established the pattern — metadirectory as the authoritative hub, connectors as the spokes — that recurs throughout his career. The 2010–2012 Oracle Identity Manager migration then demonstrated his ability to lead platform transitions, not just greenfield builds.

## Phase 3: Scale and Specialization (2012–2023, U-M)

At [[collection/entities/university-of-michigan]], Jack operated at significantly larger scale: a ~1-million-object [[collection/concepts/active-directory]] domain, multiple concurrent IAM platforms (AD, eDirectory, CyberArk, Passwordstate, Azure AD), and a federated SSO estate via [[collection/concepts/saml]] / Shibboleth. The eleven-year tenure produced a broad project portfolio:

- **IDM driver development** (2020): The TeamDynamix scripting driver reflects evolved IDM patterns — Python scripting drivers integrating modern REST-based targets, replacing the earlier XSLT approach.
- **Azure AD implementations** (2017–2022): Two consecutive deployments, plus a complex tenant-to-tenant migration, demonstrate growing cloud identity depth.
- **AD domain administration** (2022–2023): Elevation to lead AD domain administrator — atop an existing developer lead role — indicates both the breadth of Jack's scope and the institutional trust placed in him for the university's most critical directory infrastructure.

## Phase 4: Cloud Architecture and Application Development (2024–Present, UNT)

At [[collection/entities/university-of-north-texas]], Jack's external title shifts to include "Architect" — a signal that the role has an explicit architecture dimension that his Michigan developer-lead titles did not. This tracks the broader industry shift: as [[collection/concepts/entra-id]] absorbs more of what on-premise [[collection/concepts/active-directory]] and [[collection/entities/netiq-identity-manager]] once handled, the senior IAM practitioner role evolves from connector-writing and domain administration toward cloud platform design and governance.

Simultaneously, the UNT phase reveals a team that has expanded into full web application development. The [[collection/entities/iam-toolbox]], the UNT Directory App, and the DSTools Azure replacement are React/TypeScript applications built and maintained by the IAM team. The [[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary document]] — a shared HTML/UX terminology guide — is direct evidence of this expansion: teams write vocabulary guides when multiple engineers are building multiple UIs and vocabulary drift has become a real cost. See [[collection/synthesis/iam-team-application-portfolio]] for a focused synthesis of this dimension.

## Patterns Across the Arc

**1. Metadirectory thinking**

From DirXML connectors to Azure AD Connect sync rules, Jack's approach centers on maintaining an authoritative identity source and pushing changes to downstream systems — a consistent architectural principle across 20+ years and multiple platforms.

**2. Tooling evolution with continuity**

Perl → Python → PowerShell; XSLT → scripting drivers → REST APIs; on-premise → hybrid → cloud. The tools change; the underlying model (authoritative source, transformation, target) does not.

**3. Platform lifecycle expertise**

Louisville (Novell DirXML → Oracle Identity Manager), Michigan (NetIQ IDM, Azure AD tenant-to-tenant migration), UNT (Entra ID architecture). Jack has led or contributed to major platform transitions at each employer.

**4. Infrastructure–application bridge**

The Ansible automation work (BIG-IP, Linux, Windows provisioning) alongside application developer roles suggests a practitioner who spans the infrastructure/application boundary — relatively rare in IAM, where roles often specialize to one side.

**5. Documentation as a deliverable**

The cross-team run-books for Michigan's tenant-to-tenant migration appear explicitly in the resume as a notable artifact. This frames coordination artifacts — not just the technical implementation — as first-class deliverables, consistent with operating at scale across distributed teams. The [[collection/sources/2026-05-01-iam-team-knowledge-ui-vocabulary-and-conventions-for-web-interfaces|UI Vocabulary document]] at UNT extends this pattern into frontend engineering: a shared vocabulary guide is itself a deliverable, not a byproduct of the work.
