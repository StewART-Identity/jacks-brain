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
  - "[[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-]]"
  - "[[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-]]"
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

## The Case Study: Closing the Evidence Loop

The [[recall/sources/2026-04-18-2026-04-18-auth-methods-migration-case-study-1-|Authentication Methods Migration Case Study]] is the fourth source in this cluster and the one that most directly quantifies the incident's cost. Where the Multi-Tenant Proposal and Executive Brief argue prospectively ("here is what test environments would prevent"), the case study argues retrospectively ("here is exactly what happened, and here is how each testing phase would have caught each issue").

It maps the incident's four failure modes to specific methodology phases with concrete outcomes:

| Issue | Testing Phase That Would Have Caught It | Outcome With Testing |
|---|---|---|
| Orphaned registrations (72,274 accounts) | Full lifecycle functional testing (create + modify + delete EAM) | Cleanup procedure documented before go-live |
| Authentication strength propagation delays | Regression testing across admin MFA flows | Propagation timing documented in rollout plan |
| No pre-migration user audit guidance | Pre-migration scan in staging tenant | User-object vs. policy-level gap revealed before production |
| User disruption during remediation | Production pilot (500–1,000 users) | No production impact; issues resolved before deployment |

This structured mapping is the case study's primary contribution: it transforms the incident from a general argument for "better testing" into a specific, traceable case where each gap has a named testing control that would have prevented it. The [[recall/concepts/orphaned-authentication-registrations]] concept — the most technically significant discovery — gets its own dedicated analysis.

Taken together, the four sources now form a complete arc: **incident → infrastructure proposal → process plan → retrospective case study**. Each document addresses the same underlying gap from a different vantage point and for a different audience.

The [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-|Authentication Methods Migration Executive Brief]] (February 14, 2026) extends the arc with a fifth perspective: **industry validation**. Where the case study argues "here is what happened and what testing would have prevented," the executive brief argues "here is evidence that every challenge UNT encountered is consistent with industry-wide experience — and here is where UNT exceeded what any other organization has done."

## Industry Validation: The Fifth Source

The [[recall/sources/2026-04-18-2026-04-18-authentication-methods-migration-executive-brief-2-|Authentication Methods Migration Executive Brief]] adds an external validation dimension that transforms the arc from an internal organizational story into a documented instance of industry-wide patterns.

### What the Industry Brief Confirms

The brief systematically validates each of the four main issues UNT encountered against published external evidence:

| Issue | UNT Experience | Industry Evidence |
|-------|---------------|-------------------|
| Authenticator fallback on mobile despite EAM | Reported by users post-migration | Multiple orgs report identical behavior (Cisco Community, Jan 2026; Microsoft Q&A) |
| Admin lockouts after migration | Potential risk; avoided through careful execution | Multiple documented cases requiring Microsoft support intervention |
| "Microsoft managed" defaults enabling Authenticator | System-Preferred MFA confusion | One admin spent 7 hours troubleshooting; hundreds of forum responses; no published list of affected controls |
| Orphaned registrations undocumented | 72,274 accounts required custom remediation | **No guidance exists anywhere in the industry** — confirmed after comprehensive research |

The orphaned registration finding is the starkest: UNT's discovery is genuinely novel. Every other challenge has at least some external documentation; the cleanup requirement for orphaned EAM registrations has none.

### New Issue Surfaced: Fail-Open/Fail-Closed Removal

The brief introduces a business continuity risk not addressed by any of the four earlier sources: the loss of fail-mode control when migrating from ADFS+Duo to EAM. Under ADFS, administrators could configure Duo to fail-open (allow access without MFA if Duo is unreachable) or fail-closed. Under EAM, this control is gone — Conditional Access always denies if the MFA claim is not satisfied, and there is no administrative lever to change this behavior. See [[recall/concepts/mfa-fail-open-fail-closed]].

This is a consequential architectural change with university-scale impact: a Duo service outage could lock out the entire ~72,000-user population from Microsoft 365. The recommended mitigation (enabling SMS/Voice as supplemental methods for `ECS-DUO-Users`) introduces its own tradeoff — Entra ID's lack of MFA method prioritization means users see all three options equally.

### The Early Warning Context

The brief also documents a concrete example of institutional risk that pre-dated the January 2026 migration: [[recall/entities/jack-stewart]] flagged the need to begin migration in August 2025, more than a month before Microsoft's September 30 deadline. The warning was dismissed because colleagues confused two distinct Microsoft mandates — the all-user *Authentication Methods policy migration* and the admin-only *mandatory MFA for admin portals*. This confusion is documented as an industry-wide pattern, not a UNT-specific failure of awareness.

The fact that UNT completed the migration in January 2026 without incident despite missing the September deadline was, as the brief notes, "a fortunate outcome of Microsoft's gradual enforcement, not a guarantee." This retrospective honesty about timing is notable in an executive communication context.

### The Complete Five-Source Arc

| Source | Vantage Point | Audience | Primary Contribution |
|--------|--------------|----------|---------------------|
| Multi-Tenant Environment Proposal | Infrastructure gap | Technical/Executive | Argues for persistent test tenants; names incident as primary motivation |
| Executive Brief (Test Environment) | Cost/risk framing | Executive | Translates the proposal for non-technical leadership; 4-year horizon |
| Rollout Plan | Operational process | Technical | First execution of the IAM Testing Methodology in Part 0 |
| Case Study | Retrospective evidence | Technical/Executive | Maps each incident failure mode to a specific testing control |
| **Executive Brief (Industry Validation)** | **External context** | **Executive** | **Validates UNT's experience against industry; identifies new business continuity risk** |

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
- [[recall/concepts/orphaned-authentication-registrations]]
- [[recall/concepts/mfa-fail-open-fail-closed]]
- [[recall/concepts/microsoft-managed-defaults]]
