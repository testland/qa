---
name: non-postgres-rls-reference
description: "Pure-reference catalog of row/tenant isolation mechanisms for non-Postgres engines: MySQL and MariaDB (no native RLS - views with SQL SECURITY INVOKER plus app-layer enforcement), CockroachDB (native RLS via ALTER TABLE ENABLE ROW LEVEL SECURITY and CREATE POLICY, matching Postgres semantics), Vitess (keyspace sharding + vindexes route tenant writes to dedicated shards without a policy layer), and SQL Server (CREATE SECURITY POLICY with inline table-valued function filter/block predicates). Covers the isolation mechanism, tenant-context pattern, bypass risks, and test patterns for each engine. Use when designing or auditing tenant isolation on any of these four engines, or when the Postgres RLS reference does not apply."
keywords:
  - row-level-security
  - mysql
  - mariadb
  - cockroachdb
  - vitess
  - sql-server
  - multi-tenancy
  - tenant-isolation
---

# non-postgres-rls-reference

## Overview

The `row-level-security-postgres-reference` skill covers Postgres RLS in
full. This skill covers the four non-Postgres engines that appear most
frequently in multi-tenant B2B SaaS stacks: MySQL/MariaDB (views + app
layer), CockroachDB (native RLS close to Postgres semantics), Vitess
(keyspace sharding via vindexes), and SQL Server (security policies with
predicate functions).

Each engine section covers:
- the isolation primitive the engine provides,
- the canonical tenant-context pattern,
- bypass risks specific to that engine,
- the test pattern to prove isolation.

For the broader model-selection context see
[`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md).

## When to use

- Designing tenant isolation on a MySQL, MariaDB, CockroachDB, Vitess,
  or SQL Server backed service.
- Auditing an existing isolation scheme for bypass risks.
- Writing cross-tenant leak tests for any of these engines (companion to
  [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md)).
- Translating a Postgres RLS design to one of these engines.

---

## MySQL - no native RLS; views + app layer

MySQL 8.x has no native row-level security statement. Isolation is
achieved by combining views with `SQL SECURITY INVOKER` and application-
layer enforcement.

### SQL SECURITY INVOKER views

Per [dev.mysql.com/doc/refman/8.4/en/create-view.html](https://dev.mysql.com/doc/refman/8.4/en/create-view.html),
the full `CREATE VIEW` syntax is:

```sql
CREATE
    [OR REPLACE]
    [ALGORITHM = {UNDEFINED | MERGE | TEMPTABLE}]
    [DEFINER = user]
    [SQL SECURITY { DEFINER | INVOKER }]
    VIEW view_name [(column_list)]
    AS select_statement
    [WITH [CASCADED | LOCAL] CHECK OPTION]
```

The default is `SQL SECURITY DEFINER`: the view executes with the
**creator's** privileges, so any connected user who has `SELECT` on the
view can read rows the creator can read - even rows from other tenants.

With `SQL SECURITY INVOKER`, "the required privileges must be held by
the user who defined or invoked the view" (per MySQL 8.4 docs). The
view executes with the **caller's** privileges and the `WHERE` clause in
the view definition becomes the isolation boundary.

Canonical per-tenant view pattern:

```sql
-- One view per tenant, or a parameterised-equivalent pattern:
CREATE VIEW tenant_docs AS
    SELECT *
    FROM documents
    WHERE tenant_id = /* app sets this via stored-function or column */ ...
SQL SECURITY INVOKER
WITH CASCADED CHECK OPTION;
```

`WITH CHECK OPTION` prevents inserts or updates that would produce rows
invisible to the view's `WHERE` clause, per MySQL 8.4 docs.

### App-layer enforcement (the required complement)

MySQL views do not block `TRUNCATE`, constraint checks, or direct table
access if the connecting role has table-level grants. The application
must:

1. Connect with a role that has NO direct `SELECT`/`INSERT`/`UPDATE`/
   `DELETE` grants on the base table (only on the view).
2. Set the tenant identity before each query - typically as a
   session variable or a JWT-derived stored-function result.
3. Treat the view's `WHERE` clause as the sole row gate; validate it
   in every schema migration.

### Bypass risks

| Risk | Why |
|---|---|
| `SQL SECURITY DEFINER` (default) | View runs as creator; tenant filter is advisory only |
| Direct base-table grants on the app role | App can bypass the view entirely |
| `TRUNCATE` | Never filtered by views; requires separate role restriction |
| Schema changes to the view | Migration that widens `WHERE` clause removes isolation |

### Test pattern - MySQL

```sql
-- Connect as a role with SELECT on the view only (not the base table)
SET @tenant_id = 'tenant-A';
SELECT COUNT(*) FROM tenant_docs; -- must equal tenant-A row count only

-- Attempt tenant-B row via direct table access
SELECT COUNT(*) FROM documents WHERE tenant_id = 'tenant-B';
-- Must fail with: SELECT command denied to user '...' for table 'documents'

-- Attempt insert that violates the WHERE clause
INSERT INTO tenant_docs (tenant_id, body) VALUES ('tenant-B', 'leak');
-- Must fail with: CHECK OPTION failed
```

---

## MariaDB - views + SQL SECURITY INVOKER (same model as MySQL)

MariaDB shares MySQL's view-based isolation model. Per
[mariadb.com/kb/en/create-view/](https://mariadb.com/kb/en/create-view/),
the `CREATE VIEW` syntax is identical to MySQL's except that the
`DEFINER` clause also accepts `role | CURRENT_ROLE` (MariaDB-only).
`SQL SECURITY INVOKER` semantics are identical: "the required privileges
must be held by the user who defined or invoked the view."

The isolation pattern, bypass risks, and test pattern are the same as
MySQL. One practical difference: MariaDB's role system makes a schema-
per-tenant view owned by a per-tenant role viable at low tenant counts.
Atomic DDL for `CREATE VIEW` was added in MariaDB 10.6.1.

---

## CockroachDB - native RLS

CockroachDB supports native row-level security that closely mirrors
Postgres RLS. Per
[cockroachlabs.com/docs/stable/row-level-security.html](https://www.cockroachlabs.com/docs/stable/row-level-security.html):

### Enabling RLS

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- To force table owners to obey policies too:
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

### CREATE POLICY syntax

```sql
CREATE POLICY policy_name ON table_name
    AS [PERMISSIVE | RESTRICTIVE]
    FOR [SELECT | INSERT | UPDATE | DELETE | ALL]
    TO role_name
    USING (condition)
    [WITH CHECK (condition)];
```

Per CockroachDB docs:
- `USING` filters rows during reads and updates.
- `WITH CHECK` validates write operations; defaults to `USING` if
  omitted.
- Permissive policies combine with `OR`; restrictive policies with
  `AND`.
- "Access is denied by default" when RLS is enabled and no policies
  apply.

### Tenant context pattern

CockroachDB does not have Postgres's `current_setting()` with
`SET LOCAL`. The canonical pattern extracts the tenant from
`application_name` (a session variable every CRDB client sets):

```sql
-- Set at connection open time (application code):
SET application_name = 'tenant:<uuid>';

-- Policy:
CREATE POLICY tenant_isolation ON documents
    FOR ALL
    TO app_role
    USING (
        tenant_id = split_part(
            current_setting('application_name'), ':', 2
        )::uuid
    )
    WITH CHECK (
        tenant_id = split_part(
            current_setting('application_name'), ':', 2
        )::uuid
    );
```

### Bypass risks specific to CockroachDB

Per CockroachDB RLS docs, the following bypass RLS and require separate
controls:

| Bypass | CockroachDB behaviour |
|---|---|
| Foreign key constraints and cascades | Not subject to RLS |
| Primary / unique key constraints | Not subject to RLS |
| `TRUNCATE` | Not subject to RLS |
| Change Data Capture (CDC) | Queries fail with error when RLS is enabled |
| Backup and restore | Operations ignore RLS policies |
| Logical and physical cluster replication | Ignore RLS policies |

### Test pattern - CockroachDB

```sql
-- Connect as app_role (no BYPASSRLS, not table owner)
SET application_name = 'tenant:11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) FROM documents;  -- must equal tenant-1's count only

-- Attempt cross-tenant insert
SET application_name = 'tenant:11111111-1111-1111-1111-111111111111';
INSERT INTO documents (tenant_id, body)
VALUES ('22222222-2222-2222-2222-222222222222', 'leak');
-- Must fail: new row violates WITH CHECK policy

-- Disable row_security to detect filter-induced row exclusion
SET row_security = off;
SELECT * FROM documents;  -- errors if a policy would have filtered rows
RESET row_security;

-- Role switch test
SET ROLE app_role;
SELECT COUNT(*) FROM documents;  -- must return only tenant-scoped rows
RESET ROLE;
```

---

## Vitess - keyspace sharding + vindexes

Vitess does not have a row-level security policy layer. Tenant
isolation is achieved at the routing layer: a tenant's rows are
placed on a dedicated shard (or shard range) and queries are routed
by vindexes so cross-tenant access never reaches the wrong MySQL
shard.

### Keyspaces and shards

Per [vitess.io/docs/21.0/concepts/keyspace/](https://vitess.io/docs/21.0/reference/features/vindexes/),
a keyspace is a logical database. When sharded, one keyspace maps to
multiple MySQL databases across shards. "A Vindex provides a way to
map a column value to a keyspace ID."

### Vindexes for tenant isolation

A **primary vindex** on `tenant_id` maps each tenant to a keyspace ID
range. Vitess routes every query that carries a `tenant_id` condition
to the shard(s) that own that range. Per the Vitess vindex docs:

| Vindex type | Use for tenant isolation |
|---|---|
| Functional hash (`xxhash`, `hash`) | Maps `tenant_id` to a keyspace ID deterministically; no lookup table needed |
| Consistent lookup (unique) | Stores `tenant_id -> keyspace_id` in a MySQL lookup table; supports non-hash distributions |
| Non-unique lookup | For secondary routing on tenant-level subtables |

Example VSchema fragment (per vitess.io vindex reference):

```json
{
  "sharded": true,
  "vindexes": {
    "tenant_hash": {
      "type": "xxhash"
    }
  },
  "tables": {
    "documents": {
      "columnVindexes": [
        { "column": "tenant_id", "name": "tenant_hash" }
      ]
    }
  }
}
```

With this VSchema, any query without a `tenant_id` condition scatters
to all shards. Tenant isolation is enforced by ensuring every query
carries a `tenant_id` predicate - a responsibility of the application
layer.

### Bypass risks specific to Vitess

| Risk | Why |
|---|---|
| Query without `tenant_id` predicate | Scatters to all shards; returns rows from every tenant |
| Cross-shard transactions | Vitess uses 2PC for cross-shard writes; isolation bugs can occur in rollback paths |
| Row updates that change `tenant_id` | Vitess cannot move rows between shards on update; the `tenant_id` column must be immutable |
| Direct MySQL access (bypassing VTGate) | Shard-level MySQL has no vindex awareness; direct access bypasses all routing |

### Test pattern - Vitess

```sql
-- Via VTGate: query with tenant_id - should return only that tenant's rows
SELECT COUNT(*) FROM documents WHERE tenant_id = 'tenant-A';
-- Explain to verify no scatter:
EXPLAIN SELECT COUNT(*) FROM documents WHERE tenant_id = 'tenant-A';
-- plan_type must be "EqualUnique", not "Scatter"

-- Via VTGate: query without tenant_id - must be disallowed by app layer
-- or must return rows from all shards (document the expected behaviour)
SELECT COUNT(*) FROM documents;
-- If scatter queries are prohibited, this must return an error

-- Attempt to update tenant_id (must be rejected at app layer)
UPDATE documents SET tenant_id = 'tenant-B' WHERE id = 1;
-- Must be rejected; changing the sharding key is unsupported
```

---

## SQL Server - CREATE SECURITY POLICY with predicate functions

SQL Server has native RLS introduced in SQL Server 2016 (13.x), also
available on Azure SQL Database, Azure SQL Managed Instance, and
Microsoft Fabric Warehouse. Per
[learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security).

### Predicate types

Per the SQL Server RLS docs, RLS supports two predicate types:

| Predicate | Effect |
|---|---|
| `FILTER` | Silently filters rows for `SELECT`, `UPDATE`, `DELETE` - application sees empty result, not an error |
| `BLOCK` | Explicitly blocks write operations (`AFTER INSERT`, `AFTER UPDATE`, `BEFORE UPDATE`, `BEFORE DELETE`) that violate the predicate |

### CREATE SECURITY POLICY syntax

Per [learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql):

```sql
CREATE SECURITY POLICY [schema_name.] security_policy_name
    { ADD [ FILTER | BLOCK ] } PREDICATE tvf_schema_name.predicate_fn_name
      ( { column_name | expression } [, ...n] ) ON table_schema_name.table_name
      [ <block_dml_operation> ] [, ...n]
    [ WITH ( STATE = { ON | OFF } [,] [ SCHEMABINDING = { ON | OFF } ] ) ]
    [ NOT FOR REPLICATION ]

<block_dml_operation>
    [ { AFTER { INSERT | UPDATE } }
    | { BEFORE { UPDATE | DELETE } } ]
```

The predicate must be an **inline table-valued function** created with
`SCHEMABINDING`. Per the SQL Server docs, `SCHEMABINDING = ON` (the
default) means users querying the target table do NOT need permissions
on the predicate function or its helper tables - required for
zero-friction application use.

### Tenant context pattern - SESSION_CONTEXT

For shared-connection-pool architectures, the canonical pattern uses
`SESSION_CONTEXT()` to carry the tenant ID per connection. Per SQL
Server RLS docs (Scenario C in the examples):

```sql
-- Predicate function:
CREATE FUNCTION Security.fn_tenant_predicate(@TenantId int)
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS result
    WHERE CAST(SESSION_CONTEXT(N'TenantId') AS int) = @TenantId;
GO

-- Security policy (filter + block):
CREATE SECURITY POLICY Security.TenantFilter
    ADD FILTER PREDICATE Security.fn_tenant_predicate(TenantId)
        ON dbo.Documents,
    ADD BLOCK PREDICATE Security.fn_tenant_predicate(TenantId)
        ON dbo.Documents AFTER INSERT
    WITH (STATE = ON);
GO

-- Application sets context at connection open time:
EXEC sp_set_session_context @key = N'TenantId', @value = 42, @read_only = 1;
```

`@read_only = 1` prevents the `SESSION_CONTEXT` value from being
changed until the connection is returned to the pool, per SQL Server
docs - critical for connection pool reuse safety.

### Alternative tenant context - USER_NAME()

For low-tenant-count deployments where each tenant maps to a SQL
login, per the SQL Server RLS example A:

```sql
CREATE FUNCTION Security.tvf_securitypredicate(@TenantRep AS nvarchar(50))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS result
    WHERE @TenantRep = USER_NAME() OR USER_NAME() = 'GlobalAdmin';
GO
```

### Bypass risks specific to SQL Server

Per SQL Server RLS docs:

| Risk | Why |
|---|---|
| `db_owner` / `sysadmin` | Policy applies but these roles can alter/drop it; audit all policy changes |
| `DBCC SHOW_STATISTICS` | Reports statistics on unfiltered data; restrict access to table owners |
| Change Data Capture (CDC) | Leaks full rows to `db_owner` and the CDC gating role regardless of policy |
| Change Tracking | Leaks primary keys of filtered rows to users with `VIEW CHANGE TRACKING` |
| Indexed views | Cannot be created on tables with a security policy |
| `FILESTREAM` | Incompatible with RLS |
| Predicate relying on `SET` options | `SET DATEFORMAT`/`SET LANGUAGE` can cause inconsistent filtering; use explicit `CONVERT` with style parameter |

### Test pattern - SQL Server

```sql
-- Connect as AppUser (no direct table access; SESSION_CONTEXT set by app)
EXECUTE AS USER = 'AppUser';
EXEC sp_set_session_context @key = N'TenantId', @value = 1;
SELECT COUNT(*) FROM dbo.Documents; -- must equal tenant-1's row count only

-- Attempt cross-tenant insert (AFTER INSERT block predicate fires)
INSERT INTO dbo.Documents (TenantId, Body) VALUES (2, 'leak');
-- Must fail with a policy violation error

-- Attempt to change SESSION_CONTEXT after @read_only = 1
EXEC sp_set_session_context @key = N'TenantId', @value = 2;
-- Must fail: context key is read-only for this connection

REVERT;

-- Disable policy and verify row counts match full table
ALTER SECURITY POLICY Security.TenantFilter WITH (STATE = OFF);
SELECT COUNT(*) FROM dbo.Documents; -- must equal total row count
ALTER SECURITY POLICY Security.TenantFilter WITH (STATE = ON);
```

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

- **MySQL / MariaDB:** no database-enforced row gate equivalent to Postgres
  RLS or SQL Server RLS. View-based isolation depends entirely on the
  application role not having base-table privileges. A misconfigured ORM
  connection string that uses a privileged user bypasses all isolation.
- **CockroachDB:** CDC, backup, and replication bypass RLS by design (per
  CockroachDB docs). These operational paths require separate data-
  governance controls.
- **Vitess:** isolation is routing-based, not policy-based. The isolation
  guarantee is only as strong as the application's discipline in including
  `tenant_id` in every query. Vitess provides no mechanism to reject a
  scatter query at the database tier.
- **SQL Server:** Change Data Capture leaks filtered rows to `db_owner`
  and the CDC gating role regardless of active security policies. Change
  Tracking leaks primary keys. Both are documented limitations in the
  SQL Server RLS docs.

---

## References

- MySQL 8.4 `CREATE VIEW`: [dev.mysql.com/doc/refman/8.4/en/create-view.html](https://dev.mysql.com/doc/refman/8.4/en/create-view.html).
- MariaDB `CREATE VIEW`: [mariadb.com/kb/en/create-view/](https://mariadb.com/kb/en/create-view/).
- CockroachDB RLS: [cockroachlabs.com/docs/stable/row-level-security.html](https://www.cockroachlabs.com/docs/stable/row-level-security.html).
- Vitess Vindexes: [vitess.io/docs/21.0/reference/features/vindexes/](https://vitess.io/docs/21.0/reference/features/vindexes/).
- Vitess Keyspaces: [vitess.io/docs/21.0/concepts/keyspace/](https://vitess.io/docs/21.0/concepts/keyspace/).
- SQL Server RLS: [learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security).
- SQL Server `CREATE SECURITY POLICY`: [learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql).
- Postgres counterpart: [`row-level-security-postgres-reference`](../row-level-security-postgres-reference/SKILL.md).
- Model context: [`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md).
- Consumed by: [`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md), [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md).
