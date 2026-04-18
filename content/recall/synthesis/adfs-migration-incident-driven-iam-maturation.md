---
title: "January 2026 ADFS Migration: Incident-Driven IAM Infrastructure Maturation"
type: synthesis
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - iam
  - unt-system
  - entra-id
  - change-management
  - testing
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal]]"
  - "[[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-]]"
confidence: high
---

The January 28, 2026 ADFS → Entra ID migration at [[recall/entities/unt-system]] was a turning point. It affected 72,274+ users, exposed multiple undocumented platform behaviors, and forced [[recall/entities/jack-stewart]]'s IAM team to troubleshoot live against production. Two documents produced in its aftermath — the [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal|Multi-Tenant Environment Proposal]] (February 2026) and the [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final|Entra Authentication Methods Rollout Plan]] (March 2026) — together constitute a coordinated, two-track response: one addressing infrastructure gaps, the other addressing operational process gaps. Read together, they show a team building the conditions for sustainable change management _while_ executing the next change.

## The Two-Track Response

| Track | Document | Focus | Outcome |
|-------|----------|-------|---------|
| Infrastructure | Multi-Tenant Environment Proposal | Persistent staging + greenfield Entra tenants | Requests P2 licensing for myunttest and myuntsrc |
| Operations | Authentication Methods Rollout Plan | Mandatory pre-production validation before any production change | Part 0 testing plan codifies the methodology |

The documents are interdependent: the Rollout Plan's Part 0 requires `myunttest.onmicrosoft.com` as a staging tenant, but the Multi-Tenant Proposal notes that P2 licensing for that tenant was still being procured at the time of writing. This is a live dependency — pre-production testing **cannot begin** until licensing is in place.

## Common Origin: The Same Incident

Both documents trace directly to the same root cause event. The migration revealed:

- Deleting an [[recall/concepts/external-authentication-method]] configuration does **not** clean up EAM registrations from individual user objects — 72,274 accounts required custom PowerShell remediation.
- Authentication state exists at the **user object level**, not the tenant policy level — producing unexpected behavior that tenant-policy documentation does not describe.
- Microsoft and [[recall/entities/cisco-duo]] documentation did not cover pre-migration auditing of user-level authentication method registrations.
- Propagation delays in [[recall/entities/microsoft-entra-id]] authentication strength changes caused unexpected admin MFA prompts with no documented timeline.

The Multi-Tenant Proposal uses this event as the primary argument for persistent test infrastructure. The Rollout Plan uses it as justification for its mandatory Part 0 gate — explicitly stating: "The initial migration from ADFS to Entra ID managed authentication on January 28, 2026, revealed gaps in testing coverage that resulted in unplanned user impact."

## Part 0 as the First Instantiation of the IAM Testing Methodology

The [[recall/concepts/iam-testing-methodology]] is a formal process document that defines scope classifications, risk assessment criteria, testing phases, and approval workflows. Before the Rollout Plan, it existed as a procedural document with no environment to run against.

The Rollout Plan's Part 0 is the first concrete execution of that methodology:

- **Scope classification** — the plan explicitly labels scope as Part 0 (Testing) · Part 1 (Enterprise) · Part 2 (Departmental)
- **Test environment** — `myunttest.onmicrosoft.com`, the staging tenant proposed in the Multi-Tenant Proposal
- **Test personas and cases** — structured matrix covering five user personas against seven test areas
- **Go/No-Go gate** — production changes blocked until all test cases pass and results are reviewed
- **Sign-off requirement** — joint decision by all three signers (IAM Architect, IAM Manager, Director of Enterprise Collaboration Services)

This represents the methodology moving from design to practice — using the Rollout Plan as the first real test run.

## Shared Platform Limitations

Both documents independently surface the same Microsoft platform constraints, reinforcing their significance:

| Limitation | Rollout Plan | Multi-Tenant Proposal |
|------------|-------------|----------------------|
| Mobile broker bypass (Authenticator overrides Duo on mobile) | Documented as medium-likelihood risk; no config fix | Referenced as undocumented behavior discovered in production |
| EAM incompatibility with custom auth strengths | Noted for admin accounts; cloud-native workaround | Part of broader EAM discovery from migration |
| Tenant-policy vs. user-object-level config split | Implicit in sequencing requirements | Explicitly called out as root cause of migration disruption |

The mobile broker bypass is particularly notable: the Rollout Plan documents it, acknowledges Microsoft has no fix, and cross-references the executive brief — but the limitation persists. It represents a known architectural gap in UNT System's MFA posture that cannot be resolved through configuration alone.

## Sequencing as a Shared Design Principle

Both documents share a strong emphasis on ordered, reversible steps. The Rollout Plan specifies explicit rollout sequences across Parts 1 and 2, with each step independently reversible. The Multi-Tenant Proposal's testing framework is organized as a linear phase progression (greenfield → staging → production). The [[recall/concepts/conditional-access-policy|Conditional Access]] changes in Part 2 have a critical sequencing constraint: the Duo EAM must be provisioned before the CA policy enforces, or users are blocked.

This is not incidental — it reflects a team burned by the January migration's lack of sequencing discipline, now encoding explicit ordering into every future change.

## Tension: Cloud-Native Admin Accounts

A structural tension surfaces across both sources. The Rollout Plan recommends provisioning cloud-native admin accounts (`euid@myunt.onmicrosoft.com`) to resolve the EAM + custom auth strength incompatibility. This is a deliberate architecture decision — federated admin accounts cannot work cleanly with Duo EAM routing. However, the migration to cloud-native admin accounts is a separate workstream, not yet planned as of March 2026. Until it is executed, federated admins remain a known conflict point.

## Executive vs. Technical Communication of the Same Initiative

The [[recall/sources/2026-04-18-2026-04-18-entra-test-environment-executive-brief-1-|Executive Brief]] and the [[recall/sources/2026-04-18-2026-04-18-entra-id-multi-tenant-environment-proposal|full Multi-Tenant Environment Proposal]] present the same infrastructure request at two different levels of abstraction — and the differences are instructive.

| Dimension | Executive Brief | Full Proposal |
|-----------|----------------|---------------|
| Framing | Cost, risk, and 4-year scope | Technical architecture and methodology integration |
| January 2026 incident | "Issues undocumented by Microsoft and Cisco Duo required production troubleshooting" | Specific user-object vs. tenant-policy split, 72,274 affected accounts, PowerShell remediation |
| IAM Testing Methodology | Implicit (staging→production flow) | Explicitly named and mapped |
| Audience signal | "Full proposal available upon request" | Self-contained technical document |

The brief explicitly names a four-year horizon and frames cost as potentially reducible through enterprise agreements — both moves aimed at executive decision-makers rather than technical reviewers. The technical detail (EAM registration cleanup, propagation delays, cloud-native admin account conflicts) is deliberately omitted.

## Reading Together

The Rollout Plan operationalizes the principles the Multi-Tenant Proposal argues for. The Multi-Tenant Proposal provides the infrastructure the Rollout Plan depends on. Neither document is fully self-contained without the other. Together they represent a coherent, incident-driven push to bring identity infrastructure change management up to the rigor level of other enterprise systems — with the same pattern (persistent test environments, formal testing phases, documented sign-offs) that ERP platforms like PeopleSoft have established as standard practice.

## Related Pages

- [[recall/entities/unt-system]]
- [[recall/entities/jack-stewart]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/mfa-sign-in-frequency]]
