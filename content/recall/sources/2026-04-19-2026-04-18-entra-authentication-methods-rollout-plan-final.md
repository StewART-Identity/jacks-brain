---
title: "Entra Authentication Methods Rollout Plan — Final (re-read 2026-04-19)"
type: source
created: 2026-04-19
updated: 2026-04-19
tags:
  - identity
  - authentication
  - mfa
  - entra-id
  - conditional-access
  - unt-system
  - cisco-duo
  - change-management
sources: []
confidence: high
---

[Download original](/originals/2026-04-18-Entra_Authentication_Methods-Rollout-Plan-FINAL.docx)

**Prepared by:** [[recall/entities/jack-stewart]] | Architect/Engineer, [[recall/entities/unt-system]] Identity and Access Management
**Date:** March 10, 2026 · **Re-read:** 2026-04-19

Second reading of the [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final|Entra Authentication Methods Rollout Plan]]. This read surfaces the multi-gate deployment structure, the Part 1 → Part 2 intermediate checkpoint, the formal risk assessment, and the provisioning-layer dependency embedded in Part 2.

## Three-Gate Deployment Structure

The plan is not organized around a single pre-production [[recall/concepts/go-no-go-gate|Go/No-Go gate]] — it contains three sequential enforcement gates:

| Gate | Position | Mechanism | Blocks What |
|------|----------|-----------|-------------|
| Part 0 Go/No-Go | Before any production change | All test cases pass in `myunttest`; joint sign-off | Parts 1 and 2 production deployment |
| Part 1 → Part 2 Checkpoint | Between Part 1 and Part 2 | Explicit checklist of active settings and conflict-free state | Part 2 deployment |
| CA Enforcement Ramp | Within Part 2 | `Logon-CitrixHorizon-CA` begins in Report-only; logs validate before enforcement | Enforcement of Citrix Horizon MFA |

The innermost gate (CA report-only) is embedded within Part 2 itself. This nested structure means enforcement is always preceded by validation at every level.

## Part 1 → Part 2 Checkpoint

Between the Enterprise (Part 1) and Departmental (Part 2) phases, the plan requires explicit confirmation before proceeding:

**Settings Active:**
- [[recall/concepts/system-preferred-mfa]]: Disabled
- Sign-in frequency: 7 days on `Logon-InternalUsers-CA`
- Duo Remembered Devices: 7 days
- Test sign-in confirms Duo prompt + remembered device active

**No Conflicts:**
- System-preferred MFA disabled → Duo presented consistently across all policies
- `Logon-CitrixHorizon-CA` has no sign-in frequency → no interference
- Duo remembered device cookie applies regardless of which policy triggered MFA

This checkpoint is both a technical verification and a conflict-detection step. It validates that Part 1 changes don't introduce unintended interactions before Part 2 is applied.

## Risk Assessment Structure (Part 1)

Part 1 includes a formal risk table with likelihood ratings and mitigations:

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users bypass Duo via Authenticator broker on mobile | Medium | Documented in executive brief; no config-level fix from Microsoft |
| Duo cookie not honored on all platforms | Low | Monitor Duo logs; investigate Duo Mobile SDK if mobile prompts persist |
| 7-day window too long for security posture | Low | Duration adjustable in both CA policy and Duo |
| Session controls affect app-specific policies (e.g., Infoblox) | Low | Exclude Infoblox from broader sign-in frequency or persistent browser policies |

The mobile Authenticator broker bypass is the only medium-likelihood risk, and the mitigation is explicitly "no config-level fix from Microsoft." This matches the finding in the [[recall/sources/2026-04-19-2026-04-18-authentication-methods-migration-executive-brief-2-|Executive Brief (Industry Validation)]]: the platform limitation is known, documented, and unresolvable through configuration.

## Scoping Evolution: ECS-DUO-Users → DuoUsers

The plan reveals a two-tier user population with distinct roles:

| Group | Size | Scope | Phase |
|-------|------|-------|-------|
| `ECS-DUO-Users` | Internal staff subset | `Logon-InternalUsers-CA` target (pre-existing) | Part 1 — existing policy |
| `DuoUsers` | ~90,000 | New `Logon-CitrixHorizon-CA`; added to Duo EAM | Part 2 — extends coverage |

`ECS-DUO-Users` represents the internal staff Duo deployment (Enterprise Collaboration Services). `DuoUsers` is the broader Duo-enrolled population including students. Part 2 extends MFA enforcement to this larger group for [[recall/entities/citrix-horizon]] access.

## Provisioning-Layer Dependency

The DuoUsers group is synced from on-premises AD to [[recall/entities/microsoft-entra-id]] via [[recall/concepts/entra-connect|Entra Connect]], refreshed every 12 hours. Part 2 Step 1 ("Sync DuoUsers Group") is marked **DONE** — group membership is already in Entra's sync scope. This means Part 2's authentication-layer changes depend on the provisioning layer's group state being current; a membership change in on-prem AD takes up to 12 hours to propagate to the CA policy scope.

This dependency connects to the broader [[recall/synthesis/unt-iam-provisioning-layer|provisioning/authentication layer interaction]] at UNT System.

## Federated Admin Test Persona

The Part 0 test matrix includes a "Federated admin" persona that explicitly validates the known EAM/auth strength conflict before production:

| Persona | Auth Methods | Test Purpose |
|---------|-------------|--------------|
| Federated admin | Duo EAM + Authenticator | Validate EAM/auth strength conflict; confirm cloud-native account fix |

This is deliberate "test the known failure" design: the persona replicates the conflict that real federated admins would face, ensuring the test environment catches it and the [[recall/concepts/cloud-native-admin-accounts|cloud-native account]] resolution is confirmed before any production admin is affected.

## Granular Rollback Design

Each step in Part 1 (5 steps) and Part 2 (3 steps) is independently reversible. Rollback instructions list the specific per-step reversion action, not an all-or-nothing procedure. A problem at Step 3 does not require undoing Steps 1 and 2.

## Related Pages

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
- [[recall/concepts/go-no-go-gate]]
- [[recall/concepts/iam-testing-methodology]]
- [[recall/concepts/conditional-access-policy]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/mfa-sign-in-frequency]]
- [[recall/concepts/entra-id-authentication-strength]]
- [[recall/concepts/cloud-native-admin-accounts]]
- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/mfa-fail-open-fail-closed]]
- [[recall/entities/jack-stewart]]
- [[recall/entities/unt-system]]
- [[recall/entities/cisco-duo]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/citrix-horizon]]
- [[recall/entities/parker-bush]]
- [[recall/entities/ryan-kane]]
- [[recall/synthesis/adfs-migration-incident-driven-iam-maturation]]
- [[recall/synthesis/unt-iam-provisioning-layer]]
