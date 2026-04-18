---
title: "Conditional Access Policy"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - identity
  - authentication
  - entra-id
  - security
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]"
confidence: high
---

# Conditional Access Policy

A [[recall/entities/microsoft-entra-id]] policy construct that evaluates signals (user identity, device state, application, location, risk level) and enforces access controls (grant, block, require MFA, require compliant device, etc.) at authentication time.

## How It Works

Conditional Access policies define:
- **Who** — User or group scope (e.g., DuoUsers, ECS-DUO-Users, admin roles)
- **What** — Target applications or actions
- **When** — Conditions (sign-in risk, device compliance, location)
- **Then** — Grant controls (Require MFA, Require compliant device) or Session controls (sign-in frequency, persistent browser session)

Policies can be set to **Report-only** mode to log what would happen without enforcing, allowing safe validation before enforcement.

## UNT System Policies

| Policy | Scope | Purpose |
|--------|-------|---------|
| `Logon-InternalUsers-CA` | DuoUsers (internal) | Sign-in frequency (7 days), MFA via [[recall/entities/cisco-duo]] |
| `Logon-InternalUsers-HighRisk-CA` | DuoUsers | Risk-based MFA challenge (formerly `RequireDuoMfa`, now built-in Require MFA) |
| `Logon-EntraAdminRoles-CA` | Admin role holders | Stronger MFA (Authenticator Push, no SMS/Voice) |
| `Logon-CitrixHorizon-CA` | DuoUsers | Require MFA for [[recall/entities/citrix-horizon]] access |

## Session Controls

- **[[recall/concepts/mfa-sign-in-frequency|Sign-in Frequency]]** — Forces re-authentication after a configurable period (e.g., 7 days).
- **Persistent Browser Session** — Controls whether browser sessions persist across restarts.
- **App-specific sessions** (e.g., Infoblox 2-hr timeout) must be excluded from broader session controls to avoid conflicts.

## Related Concepts

- [[recall/concepts/external-authentication-method]]
- [[recall/concepts/system-preferred-mfa]]
- [[recall/concepts/mfa-sign-in-frequency]]

## Sources

- [[recall/sources/2026-04-18-2026-04-18-entra-authentication-methods-rollout-plan-final]]
