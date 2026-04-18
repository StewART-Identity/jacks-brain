---
title: "Oracle PeopleSoft (HRPD / LSPD)"
type: entity
created: 2026-04-18
updated: 2026-04-18
tags:
  - tool
  - database
  - oracle
  - peoplesoft
  - unt-system
  - hr
  - provisioning
sources:
  - "[[recall/sources/2026-04-18-2026-04-18-contract]]"
confidence: high
---

Two Oracle database instances running PeopleSoft HR and LS at [[recall/entities/unt-system]], serving as the authoritative source of employee and student data that drives IAM provisioning decisions. The [[recall/entities/iam-modules]] library provides connections to both; the consuming repos' `lib/` directories hold the SQL queries and business logic.

## Instances

| Instance | Hostname | Service Name | Purpose |
|----------|----------|--------------|---------|
| HRPD | `oradb404.its.unt.edu:1521` | `hrpd.its.unt.edu` | PeopleSoft HR — employee data, employment status, workforce IDs |
| LSPD | `oradb405.its.unt.edu:1521` | `lspd.its.unt.edu` | PeopleSoft LS — student/learner data |

## Connections via iam-modules

Both databases are accessed via the `oracledb` library (the official successor to the deprecated `cx_Oracle`). [[recall/entities/iam-modules]] provides factory functions that load credentials from the `.env` file and return raw `oracledb.Connection` objects:

```python
from iam_modules.connections import connect_to_hrdb, connect_to_lsdb

hr_conn = connect_to_hrdb(config, logger)   # → oracledb.Connection to HRPD
ls_conn = connect_to_lsdb(config, logger)   # → oracledb.Connection to LSPD
```

Credentials are stored under `HR_DB_*` and `LS_DB_*` env var prefixes in `.env`. Note the canonical key names: `HR_DB_CONNECT_STRING` (not `HR_DB_CONNECTSTRING`), `LS_DB_CONNECT_STRING` (not `LSDB_*` — the old naming scheme).

## Layered Access Pattern

The connection factory in `iam_modules` gives a raw connection; all SQL queries and domain logic live in the consuming repo's `lib/` directory:

```python
# CORRECT — layered as the architecture requires:
from iam_modules.connections import connect_to_hrdb
from lib.hrpd import get_active_employees

hr_conn = connect_to_hrdb(config, logger)
employees = get_active_employees(hr_conn)   # SQL lives in lib/hrpd.py
hr_conn.close()
```

This separation means `lib/hrpd.py` and `lib/lspd.py` can contain reusable query functions shared across multiple scripts without polluting [[recall/entities/iam-modules]] with application-specific SQL. See [[recall/concepts/iam-scripting-architecture]] for the full three-layer model.

## Role in IAM Provisioning

HRPD and LSPD are the **source of truth for identity lifecycle decisions**. Scripts that deactivate terminated employees, reactivate returning staff, or provision new accounts query these databases to determine current employment status. Data from HRPD/LSPD ultimately determines which user objects exist in [[recall/entities/edirectory]], which flows downstream to [[recall/entities/active-directory]] and [[recall/entities/microsoft-entra-id]].

## Migration Note

Any script using `cx_Oracle` must be migrated to `oracledb` (Pattern F in the CONTRACT). The old `HRDB_*` / `LSDB_*` env var naming must also be updated to the `HR_DB_*` / `LS_DB_*` convention.

## Related Pages

- [[recall/entities/iam-modules]]
- [[recall/entities/unt-system]]
- [[recall/entities/edirectory]]
- [[recall/concepts/iam-scripting-architecture]]
- [[recall/sources/2026-04-18-2026-04-18-contract]]
