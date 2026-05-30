---
title: "About"
---

I'm Jack Stewart, an Identity and Access Management (IAM) Engineer at the UNT System. My work is the infrastructure that decides who exists in an organization's systems and what they're allowed to do: provisioning automation, identity lifecycle management, directory and cloud-identity architecture, and the certificate and authentication layers underneath.

I came into identity through higher-education IT — at the University of Michigan and the University of Louisville, where I worked on multi-source identity systems and met OAuth early, through ORCID integrations around 2012 — and I've been deep in the field since.

## What I work on

- **Directory and identity platforms** — eDirectory, multiple Active Directory domains, Microsoft Entra ID, and OpenText Identity Manager, with PeopleSoft as an authoritative source.
- **Provisioning and lifecycle automation** — joiner / mover / leaver flows and affiliation-driven account activation and deactivation, written defensively: dry-run by default, idempotent, with deferral, reactivation, and circuit-breaker logic so failures degrade safely.
- **Identity Manager driver engineering** — DirXML-Script policy authoring across a multi-domain Active Directory forest, including associationless drivers and non-trivial transformation logic.
- **PKI and authentication** — a production two-tier AD CS hierarchy with an offline root and automated revocation / issuance publication; Entra Conditional Access design; modern MFA via Cisco Duo (External Authentication Methods); and the retirement of legacy ADFS federation.
- **Tooling and platforms** — Python automation under a shared contract-and-governance framework, CI/CD on self-hosted runners, monitoring and alerting services, and internal web apps (React / TypeScript front ends on Python / Azure Functions back ends).

## Selected work

- Rebuilt an identity lifecycle system around affiliation-based logic, replacing a brittle last-login heuristic, with resilience patterns that let it run safely at institutional scale.
- Consolidated a sprawling Conditional Access estate from 23 policies down to 6, and migrated the MFA platform for more than 70,000 users while decommissioning legacy federation.
- Stood up a two-tier certificate authority with an offline root and automated CRL / AIA publication.
- Built internal platforms end to end — a directory and people-search app, a monitoring service, and developer tooling — most of it held to a self-imposed standard for type safety, testing discipline, and documentation.

## How I work

Identity is high-blast-radius work: a bad rule can lock out thousands of people, or quietly over-grant access to thousands more. So I build for safety first — dry-run defaults, explicit operational contracts, and documentation treated as part of the deliverable rather than an afterthought. I'd rather a script refuse to act than act wrongly.

## The less-obvious part

Before engineering, I trained in the humanities: a master's in Library Science, with earlier study in musicology and medieval studies. I don't treat that as a detour. Cataloging, controlled vocabularies, and information architecture are exactly the disciplines that keep large identity systems — and the documentation around them — legible instead of sprawling. It's the same instinct whether I'm modeling an entitlement structure or organizing a knowledge base.

Lately I've been extending that in two directions: sharpening my front-end and UX skills, and exploring graph databases (Cypher / Memgraph) as a natural way to model the relationships at the heart of identity — including an ontology of provisioning drawn from directory and HR schemas.

## About this site

Jack's Brain is something I designed and built myself — a personal knowledge wiki on Quartz and Cloudflare Pages, from the ingest-and-cataloging pipeline through interactive visualizations like the [[visualize/graph|knowledge graph]]. It doubles as a working sample of how I think about structuring information.
