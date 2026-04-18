---
title: "iam-modules"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - tool
  - python
  - iam
  - scripting
  - unt-system
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

The shared Python library that underpins all provisioning and automation scripts in [[recall/entities/unt-system]]'s IAM infrastructure. A standalone Git repository (`iam-modules/`, hyphen in repo name) at `/usr/local/iamadm/scripts/iam-modules/`, consumed by four or more downstream scripting repositories via a symlink named `iam_modules` (underscore, to satisfy Python import requirements).

## Purpose

`iam-modules` enforces a strict separation of concerns: it owns connections, credentials, logging, and Ctrl+C safety. Business logic, SQL queries, and domain rules live in consuming repos' `lib/` directories. Individual scripts orchestrate these two layers. See [[recall/concepts/iam-scripting-architecture]].

## Core Modules

| Module | Responsibility |
|--------|----------------|
| `config.py` | Loads `.env` via `load_dotenv()`, resolves symlinks, builds config dict keyed by service |
| `connections.py` | Factory functions for all system connections (eDirectory, AD, Oracle, Graph API) |
| `edir_client.py` | `EDirectoryClient` — higher-level eDirectory operations with dry-run support |
| `ad_client.py` | `ADDomainControllerClient` — AD group membership management with dry-run support |
| `gc_client.py` | `ADGlobalCatalogClient` — forest-wide read operations via AD Global Catalog (port 3269) |
| `graph_client.py` | `GraphAPIClient` — [[recall/entities/microsoft-entra-id]] management via Microsoft Graph API |
| `logging_utils.py` | `setup_logging()` — rotating file logger at `/var/log/iam/`, configurable console level |
| `cli_utils.py` | `run()` entry-point wrapper with `KeyboardInterrupt` protection |
| `idm_utils.py` | IDM/eDirectory utility helpers |

## Connection Functions

All connections are produced with `raise_exceptions=True`, requiring scripts to use `try/except LDAPException` rather than checking `conn.result`. See [[recall/sources/2026-04-18-2026-04-18-contract]] for the complete reference.

- `connect_to_edir(config, 'prod'|'test', logger)` — eDirectory with TLSv1.2 pinned, 600s timeout
- `connect_to_idtree(config, logger)` — legacy alias for `connect_to_edir(..., 'prod', ...)`
- `connect_to_ad(config, 'ad'|'hsc'|'students'|'unt', logger)` — Active Directory per domain
- `connect_to_gc(config, logger)` — AD Global Catalog, port 3269
- `connect_to_hrdb(config, logger)` — Oracle HRPD (PeopleSoft HR)
- `connect_to_lsdb(config, logger)` — Oracle LSPD (PeopleSoft LS)

## Key Behaviors

**SIGINT / Ctrl+C protection** — registered automatically on import. Scripts call `set_operation('description')` to describe the current phase; on interrupt, the user sees `Interrupted during: <description>` instead of a Python traceback. The `run(main)` entry-point wrapper provides a second layer of `KeyboardInterrupt` protection for C-level I/O blocking.

**Credential loading** — the `.env` file lives in the `iam-modules` repo directory. `load_config(__file__)` resolves symlinks using `os.path.realpath()` so it always finds the real `.env` regardless of where the calling script runs from. Application-specific variables not managed by `iam-modules` (e.g., `BATCH_*`, `VPN_*`) remain accessible via `os.getenv()` after `load_config()` has called `load_dotenv()`.

**Dry-run-by-default** — client class methods (`modify_attribute`, `add_group_member`, etc.) accept a `dry_run=` parameter. Scripts propagate `dry_run=not args.commit`. See [[recall/concepts/dry-run-by-default]].

## Consuming Repositories

| Repo | Symlink Path | Purpose |
|------|-------------|---------|
| `iam-scripts-provisioning` | `iam_modules -> ../iam-modules/` | eDirectory and EIS provisioning |
| `iam-scripts-utilities` | `iam_modules -> ../iam-modules/` | Batch, cron, group mgmt, user lifecycle |
| `iam-scripts-alma-v2` | `iam_modules -> ../iam-modules/` | Alma account lifecycle |
| `iam-scripts-drip` | `iam_modules -> ../iam-modules/` | LDIF record drip import |

## Related Pages

- [[recall/concepts/iam-scripting-architecture]]
- [[recall/concepts/dry-run-by-default]]
- [[recall/concepts/graceful-interrupt-handling]]
- [[recall/entities/unt-system]]
- [[recall/entities/oracle-peoplesoft]]
- [[recall/entities/microsoft-entra-id]]
- [[recall/entities/cisco-duo]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
