# Row-level security on non-Postgres engines

Companion reference for `rls-reference`. The host skill covers Postgres RLS
in full; this file covers the four non-Postgres engines that appear most in
multi-tenant B2B SaaS stacks: MySQL / MariaDB, CockroachDB, Vitess, and
SQL Server.

## Overview

The host skill covers Postgres RLS in
full. This reference covers the four non-Postgres engines that appear most
in multi-tenant B2B SaaS stacks. For each engine the spine below gives
the isolation primitive, the tenant-context essence, and a minimal
isolation test; the full context SQL, vindex / VSchema detail, and the
per-engine bypass table live in the linked per-engine reference file.
For the broader model-selection context see
the isolation-models reference in `cross-tenant-data-leak-tests`.

## When to use

- Designing tenant isolation on a MySQL, MariaDB, CockroachDB, Vitess,
  or SQL Server backed service.
- Auditing an existing isolation scheme for bypass risks.
- Writing cross-tenant leak tests for any of these engines (companion to
  `cross-tenant-data-leak-tests`).
- Translating a Postgres RLS design to one of these engines.

## Engine cheat sheet

| Engine | Isolation primitive | Tenant context | Highest-signal gotcha |
|---|---|---|---|
| MySQL / MariaDB | `SQL SECURITY INVOKER` view + app-role grants | Session var / stored function | Default `DEFINER` view leaks; app role must lack base-table grants |
| CockroachDB | Native RLS (`CREATE POLICY`) | `application_name` session var | No Postgres `SET LOCAL current_setting`; CDC/backup/replication bypass RLS |
| Vitess | Keyspace sharding + `tenant_id` vindex | `tenant_id` predicate on every query | Query without `tenant_id` scatters to all shards; `tenant_id` must be immutable |
| SQL Server | `CREATE SECURITY POLICY` + inline TVF predicate | `SESSION_CONTEXT` with `@read_only = 1` | Pooled connection reuse leaks context without `@read_only = 1` |

---

## MySQL / MariaDB - views + app layer

No native RLS. A view defined `SQL SECURITY INVOKER` runs with the
caller's privileges, so its `WHERE` clause is the tenant boundary; the
default `SQL SECURITY DEFINER` runs as the creator and leaks other
tenants' rows. `WITH CASCADED CHECK OPTION` blocks writes that fall
outside the view. Isolation holds only if the app role has no direct
grants on the base table. MariaDB shares this model, with role-owned
per-tenant views as an option at low tenant counts.

```sql
-- Role has SELECT on the view only (not the base table)
SET @tenant_id = 'tenant-A';
SELECT COUNT(*) FROM tenant_docs;                             -- tenant-A rows only
SELECT COUNT(*) FROM documents WHERE tenant_id = 'tenant-B';  -- must be denied
INSERT INTO tenant_docs (tenant_id, body) VALUES ('tenant-B', 'leak');  -- CHECK OPTION failed
```

Full view pattern, app-layer checklist, and bypass table:
[mysql-mariadb.md](mysql-mariadb.md).

---

## CockroachDB - native RLS

Native RLS mirroring Postgres. `ALTER TABLE ... ENABLE ROW LEVEL
SECURITY` plus `CREATE POLICY ... USING (...) WITH CHECK (...)`; access
is denied by default once RLS is enabled and no policy applies. There is
no Postgres `SET LOCAL` + `current_setting` transaction variable, so the
tenant is read from the `application_name` session variable.

```sql
-- app_role: no BYPASSRLS, not table owner
SET application_name = 'tenant:11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) FROM documents;                          -- tenant-1 rows only
INSERT INTO documents (tenant_id, body)
VALUES ('22222222-2222-2222-2222-222222222222', 'leak');  -- violates WITH CHECK
SET row_security = off;
SELECT * FROM documents;                                 -- errors if a policy would filter rows
RESET row_security;
```

Enable/force syntax, the `application_name` policy, and the bypass table
(FK, `TRUNCATE`, CDC, backup, replication):
[cockroachdb.md](cockroachdb.md).

---

## Vitess - keyspace sharding + vindexes

No policy layer. A primary vindex on `tenant_id` routes each tenant's
rows to a dedicated shard range; a query without a `tenant_id` predicate
scatters to all shards and returns every tenant's rows, so the
application must include `tenant_id` on every query. `tenant_id` is the
sharding key and must be immutable - Vitess cannot move a row between
shards on update.

```sql
-- Via VTGate: confirm the plan is a unique route, not a scatter
EXPLAIN SELECT COUNT(*) FROM documents WHERE tenant_id = 'tenant-A';
-- plan_type must be "EqualUnique", not "Scatter"
UPDATE documents SET tenant_id = 'tenant-B' WHERE id = 1;  -- must be rejected at app layer
```

Vindex types, the VSchema fragment, and the bypass table:
[vitess.md](vitess.md).

---

## SQL Server - security policy + predicate function

Native RLS since SQL Server 2016. `CREATE SECURITY POLICY` adds a
`FILTER` predicate (silently filters `SELECT`/`UPDATE`/`DELETE`) and/or a
`BLOCK` predicate (blocks violating writes); the predicate is an inline
table-valued function created `WITH SCHEMABINDING`. For shared pools the
tenant ID is carried in `SESSION_CONTEXT`, set with `@read_only = 1` so a
reused connection cannot carry a prior tenant's context.

```sql
EXECUTE AS USER = 'AppUser';
EXEC sp_set_session_context @key = N'TenantId', @value = 1, @read_only = 1;
SELECT COUNT(*) FROM dbo.Documents;                          -- tenant-1 rows only
INSERT INTO dbo.Documents (TenantId, Body) VALUES (2, 'leak');  -- BLOCK predicate fires
EXEC sp_set_session_context @key = N'TenantId', @value = 2;     -- fails: key is read-only
REVERT;
```

Predicate function + policy, the `USER_NAME()` alternative, and the
bypass table (CDC, Change Tracking, indexed views, FILESTREAM):
[sqlserver.md](sqlserver.md).

---

## Anti-patterns (all engines)

| Anti-pattern | Engine(s) | Why it fails | Fix |
|---|---|---|---|
| `SQL SECURITY DEFINER` view for isolation | MySQL, MariaDB | Runs as creator; any caller sees creator-scoped rows regardless of tenant | Use `SQL SECURITY INVOKER` + restrict base-table grants |
| No `WITH CHECK OPTION` on isolation view | MySQL, MariaDB | Inserts into another tenant's row space silently succeed | Add `WITH CASCADED CHECK OPTION` |
| Direct base-table grants alongside view grants | MySQL, MariaDB | App can bypass the view | Grant only on the view, deny on the base table |
| Querying Vitess without a `tenant_id` predicate | Vitess | Scatters to all shards; returns all tenants' rows | Enforce `tenant_id` predicate in ORM / query layer |
| Mutable `tenant_id` (sharding key) in Vitess | Vitess | Vitess cannot move rows between shards; the update silently corrupts or errors | Declare `tenant_id` immutable at the application layer |
| `SESSION_CONTEXT` without `@read_only = 1` in SQL Server | SQL Server | Pooled connection reuse can carry a prior tenant's context | Always set `@read_only = 1` when writing to `SESSION_CONTEXT` |
| Tests run as `db_owner` / `sysadmin` in SQL Server | SQL Server | Policy applies to these roles, but they can drop/alter the policy - test does not prove the policy is correct for app-role | Tests must connect as the app role only |
| Policies applied to current temporal table but not history table | SQL Server | History table is unprotected | Add a matching `CREATE SECURITY POLICY` on the history table separately |

---

## Limitations

- **MySQL / MariaDB:** no database-enforced row gate equivalent to
  Postgres or SQL Server RLS; view isolation depends entirely on the app
  role lacking base-table privileges. A misconfigured ORM connection
  string that uses a privileged user bypasses all isolation.
- **CockroachDB:** CDC, backup, and replication bypass RLS by design;
  these operational paths require separate data-governance controls.
- **Vitess:** isolation is routing-based, not policy-based, and only as
  strong as the app's discipline in including `tenant_id` on every query.
  Vitess provides no mechanism to reject a scatter query at the database
  tier.
- **SQL Server:** Change Data Capture leaks filtered rows to `db_owner`
  and the CDC gating role, and Change Tracking leaks primary keys,
  regardless of active security policies.

---

## References

- Per-engine detail: [mysql-mariadb.md](mysql-mariadb.md), [cockroachdb.md](cockroachdb.md), [vitess.md](vitess.md), [sqlserver.md](sqlserver.md).
- MySQL 8.4 `CREATE VIEW`: [dev.mysql.com/doc/refman/8.4/en/create-view.html](https://dev.mysql.com/doc/refman/8.4/en/create-view.html).
- MariaDB `CREATE VIEW`: [mariadb.com/kb/en/create-view/](https://mariadb.com/kb/en/create-view/).
- CockroachDB RLS: [cockroachlabs.com/docs/stable/row-level-security.html](https://www.cockroachlabs.com/docs/stable/row-level-security.html).
- Vitess Vindexes: [vitess.io/docs/21.0/reference/features/vindexes/](https://vitess.io/docs/21.0/reference/features/vindexes/).
- Vitess Keyspaces: [vitess.io/docs/21.0/concepts/keyspace/](https://vitess.io/docs/21.0/concepts/keyspace/).
- SQL Server RLS: [learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security).
- SQL Server `CREATE SECURITY POLICY`: [learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql).
- Postgres counterpart: the host `rls-reference` SKILL.md.
- Model context: the isolation-models reference in `cross-tenant-data-leak-tests`.
- Consumed by: `cross-tenant-data-leak-tests` (planning section + runtime gate).
