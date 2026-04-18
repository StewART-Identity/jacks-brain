---
title: "Go/No-Go Gate"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - change-management
  - identity
  - iam
  - testing
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

A formal checkpoint that blocks production deployment until all pre-production test cases have passed and results have been reviewed. Introduced at [[recall/entities/unt-system]] in Part 0 of the [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final|Entra Authentication Methods Rollout Plan]] (March 2026) as a direct response to the January 28, 2026 ADFS → Entra ID migration incident.

## Structure

A Go/No-Go gate consists of three components:

1. **Test case matrix** — a defined set of scenarios, each with explicit pass criteria, covering the change surface (authentication methods, session controls, policy logic, edge cases)
2. **Test persona matrix** — a set of representative user accounts provisioned in the test tenant (e.g., internal user, student with Duo, student without Duo, cloud-native admin, federated admin), each exercising a distinct configuration path
3. **Joint review and sign-off** — the go/no-go decision requires agreement from all signers of the rollout plan; no single stakeholder can unilaterally advance to production

## Test Environment Dependency

A Go/No-Go gate requires a [[recall/concepts/entra-id-three-tenant-model|non-production tenant]] that mirrors production configuration. At UNT System, this is `myunttest.onmicrosoft.com`. The gate cannot function without the supporting environment — a procedural gate without a test tenant is a checklist with nowhere to run.

See [[recall/concepts/iam-testing-methodology]] for how the gate integrates into the broader testing methodology.

## Failure Handling

Any test case failure must be root-caused and resolved in the test environment before re-executing the affected cases. The gate resets — partial passes do not accumulate toward a go decision. This prevents the "close enough" judgment calls that contributed to the January 2026 incident.

## Example: Rollout Plan Part 0

The Rollout Plan's Part 0 defines test cases across seven areas:

| Area | Test Procedure | Pass Criteria |
|------|---------------|---------------|
| System-Preferred MFA | Disable; sign in with internal user | Duo prompt appears, not Authenticator |
| Sign-In Frequency + Remembered Devices | Set to 7 days; authenticate, close browser, reopen | No re-prompt within window; prompt returns after 7 days |
| Risk-Based Policy | Simulate risky sign-in | Duo EAM invoked for risk challenge |
| Citrix Horizon CA | Create policy in Report-only; access Citrix with DuoUsers student | Logs show "Report-only: Grant—Require MFA" |
| EAM Population | Add DuoUsers to Duo EAM alongside ECS-DUO-Users | Both groups authenticate via Duo; no disruption |
| Auth Strength (Admin) | Update Entra Admin MFA strength; sign in with cloud-native admin | Authenticator Push accepted; no EAM conflict |
| App-Specific Sessions | Apply 7-day frequency; access Infoblox-equivalent app | App retains its own session timeout |

Production deployment of Parts 1 and 2 is blocked until all seven areas pass.

## Sign-Off Chain

The go/no-go decision at [[recall/entities/unt-system]] requires joint approval from:
- [[recall/entities/jack-stewart]] — Architect/Engineer, Identity and Access Management
- [[recall/entities/parker-bush]] — Manager, Identity and Access Management
- [[recall/entities/ryan-kane]] — Director, Enterprise Collaboration Services

## Related Concepts

- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/entra-id-three-tenant-model]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/mfa-sign-in-frequency]]
- [[recall/concepts/system-preferred-mfa]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
