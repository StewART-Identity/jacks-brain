---
title: "IAM Scripting Architecture"
type: concept
created: 2026-04-18
updated: 2026-04-18
tags:
  - architecture
  - scripting
  - python
  - iam
  - unt-system
  - separation-of-concerns
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
  - "[[recall/sources/2026-04-19-2026-04-18-contract]]"
confidence: high
---

The three-layer software architecture governing all provisioning and automation scripts in [[recall/entities/unt-system]]'s IAM infrastructure. Each layer has a defined responsibility and strict rules about what it must not contain.

## The Three Layers

### Layer 1 — Module (`iam_modules`)

[[recall/entities/iam-modules]] owns:
- System connections (eDirectory, AD, Oracle, Entra Graph API)
- Credential loading (single `.env`, resolved through symlinks)
- Logging setup
- Ctrl+C / SIGINT handling
- Entry-point safety wrapper (`run(main)`)
- Constants (log directory, valid AD domains, timeouts)

What it must **not** contain: SQL queries, business rules, domain-specific logic, application-specific env vars.

### Layer 2 — Business Logic (`lib/`)

The consuming repo's `lib/` directory owns:
- SQL queries for Oracle databases (`lib/hrpd.py`, `lib/lspd.py`)
- Domain-specific rules and data transformation
- Reusable logic that multiple scripts in the same repo share

The correct pattern is:
```python
from iam_modules.connections import connect_to_hrdb
from lib.hrpd import get_active_employees

hr_conn = connect_to_hrdb(config, logger)   # iam_modules handles the connection
employees = get_active_employees(hr_conn)    # lib/ handles the query
```

### Layer 3 — Scripts

Individual scripts own:
- Argument parsing (`argparse`, mandatory for all scripts)
- Workflow orchestration (calling `lib/` functions with connections from `iam_modules`)
- Progress reporting via `set_operation()`
- The `main()` function and `run(main)` entry point

## Repository Structure

The architecture is expressed physically as a symlink relationship:

```
/usr/local/iamadm/scripts/
├── iam-modules/              ← Layer 1 (standalone repo)
│   └── .env                  ← single credential source of truth
│
├── iam-scripts-provisioning/
│   ├── iam_modules -> ../iam-modules/   ← symlink (underscore, not hyphen)
│   ├── lib/hrpd.py           ← Layer 2
│   ├── lib/lspd.py           ← Layer 2
│   └── idtree/script.py      ← Layer 3 (one level below repo root, always)
```

The symlink uses an **underscore** (`iam_modules`) because Python cannot import names containing hyphens. The target repo name (`iam-modules`) uses a hyphen — that is fine because it is never imported directly.

## Script Layout Rules

- Scripts live **exactly one directory level below the repo root** — no nested subdirectories (`groups/archive/` is forbidden).
- Every script begins with the sys.path preamble before any `from iam_modules import ...` statements (resolves the symlink into Python's module search path).
- Script filenames follow the PowerShell verb taxonomy adapted for IAM: `send_`, `invoke_`, `sync_`, `get_`, `repair_`, `restore_`, `clear_`.

## Service Account Architecture

The least-privilege principle is encoded per layer and per directory:

- **eDirectory**: `cn=IAMScript` for general scripts; `cn=IAMDrip` for LDIF import (needs broader attribute access)
- **Active Directory**: one service account per domain (`IAMScriptAD`, `IAMScriptUNT`, `IAMScriptHSC`, `IAMScriptSTU`) — no Domain Admin or Enterprise Admin membership
- **Global Catalog**: read-only; no write delegation needed

## Ctrl+C Safety Architecture

The SIGINT protection has two layers, both provided by `iam_modules`:

1. **Signal handler** — registered automatically on import; catches Ctrl+C during Python code
2. **`run()` wrapper** — catches `KeyboardInterrupt` that escapes the handler when Python is blocked in C-level I/O (SSL socket reads, Oracle network calls)

Both layers read the same `_current_operation` state set via `set_operation()`, so the interrupt message always reflects the actual phase in progress.

## Migration Checklist (Legacy Script Conversion)

The CONTRACT defines a 17-step procedure for converting inline legacy scripts to the `iam_modules` architecture. Key steps in order:

1. Add sys.path preamble (copy exactly — do not vary it)
2. Replace `.env` loading with `load_config(__file__)`
3. Replace logging setup with `setup_logging('script_name')`
4. Replace LDAP connection code with `connect_to_edir()`, `connect_to_ad()`, etc.
5. Replace Oracle connection code with `connect_to_hrdb()` / `connect_to_lsdb()`
6. Replace `--dry-run` flag with `--commit`; default must be dry-run
7. Remove `import ssl`, direct `Tls()` construction, and all `load_dotenv()` calls
8. Remove `import cx_Oracle`; replace with `from iam_modules.connections import ...`
9. Remove any in-script connection function or `LDAPConnectionManager` class definitions
10. Add `set_operation()` calls at each processing phase
11. Replace `conn.result['result']` checks with `try/except LDAPException`
12. Use `run(main)` as entry point (not `sys.exit(main())`)
13. Test with `python script_name.py --verbose` (dry-run) before committing

## Service Account Delegation Matrix

The CONTRACT requires maintaining a living attribution table: every LDAP attribute written, the object type, the operation, and the specific script responsible. This is embedded in the architecture document itself — a permission audit trail that must be updated whenever a script writes to a new attribute.

The IAMDrip account (`cn=IAMDrip`) is the sole exception to attribute-specific delegation — it requires write access to arbitrary attributes on `ou=people,o=unt` because it replays LDIF records that may touch any attribute.

The `deactivate_terminateduser` and `reactivate_terminateduser` scripts skip the STUDENTS domain by default; the `--students` flag must be passed explicitly to include it.

## What This Architecture Prevents

Without this architecture, the 21+ scripts that once defined inline eDirectory connections each had their own TLS configuration, their own `load_dotenv()` calls, and their own credential variable names. Changes to server hostnames, cipher suites, or TLS versions required hunting across all scripts. The module layer centralizes that surface to a single file (`connections.py`), making fleet-wide infrastructure changes a single-file update.

## Related Pages

- [[recall/entities/iam-modules]]
- [[recall/entities/edirectory]]
- [[recall/entities/unt-system]]
- [[recall/entities/oracle-peoplesoft]]
- [[recall/concepts/dry-run-by-default]]
- [[recall/concepts/graceful-interrupt-handling]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
- [[recall/sources/2026-04-19-2026-04-18-contract]]
- [[recall/synthesis/unt-iam-provisioning-layer]]
