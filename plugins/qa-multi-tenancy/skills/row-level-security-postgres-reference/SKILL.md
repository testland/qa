---
name: row-level-security-postgres-reference
description: "Pure-reference catalog of Postgres Row-Level Security (RLS) for tenant isolation. Covers enabling RLS (ALTER TABLE ... ENABLE ROW LEVEL SECURITY, default-deny semantics), CREATE POLICY syntax (USING vs WITH CHECK clauses, FOR SELECT/INSERT/UPDATE/DELETE/ALL, permissive vs restrictive, TO role_name), bypassing RLS (superuser / BYPASSRLS / table owner / FORCE ROW LEVEL SECURITY), tenant context patterns (current_user, current_setting, JWT claims via Supabase auth.uid() / auth.jwt()), performance discipline (wrapping auth functions in SELECT, index on policy-referenced columns), and anti-patterns. Use as the RLS-pattern reference for Postgres-backed tenant isolation. Consumed by tenant-leak-test-author, cross-tenant-data-leak-tests."
---

# row-level-security-postgres-reference

## Overview

Postgres Row-Level Security (RLS) lets the database itself
enforce per-tenant row visibility, independent of the application
code. It is the canonical defence-in-depth layer for pool /
horizontally-partitioned tenancy models - even if the application
forgets to add a `WHERE tenant_id = ?` filter, the database
refuses to return another tenant's rows.

Per [postgresql.org/docs/current/ddl-rowsecurity.html](https://www.postgresql.org/docs/current/ddl-rowsecurity.html),
RLS "restricts which rows users can access based on per-user
policies." Unlike standard SQL `GRANT` / `REVOKE` privileges
which act on whole tables, RLS controls **row visibility and
modification** per role.

This skill is a **pure reference** consumed by the tenant-leak
test authors and reviewers. For the broader model context see
[`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md).

## When to use

- Designing tenant isolation on a Postgres-backed pool / bridge
  model.
- Auditing existing RLS policies for correctness.
- Writing tests that verify RLS denies cross-tenant access (per
  [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md)).
- Onboarding a new table to the tenant_id discriminator pattern.

## Enabling RLS

```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
```

Per Postgres docs: "Once enabled, a default-deny policy
applies - no rows are visible or modifiable unless explicitly
allowed by a policy."

To disable:

```sql
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
```

### Force RLS on table owner

By default, the **table owner bypasses RLS**. For tenant
isolation this is dangerous - the application's connecting role
is often the table owner. Force the owner to obey policies too:

```sql
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
```

Per Postgres docs, this is the production-safe default for
multi-tenant tables.

## CREATE POLICY syntax

```sql
CREATE POLICY policy_name ON table_name
    [ AS { PERMISSIVE | RESTRICTIVE } ]
    [ FOR { ALL | SELECT | INSERT | UPDATE | DELETE } ]
    [ TO role_name [, ...] ]
    [ USING ( using_expression ) ]
    [ WITH CHECK ( check_expression ) ];
```

### USING vs WITH CHECK

| Clause | Controls |
|---|---|
| `USING` | Which rows are **visible** (SELECT, UPDATE, DELETE) |
| `WITH CHECK` | Which rows can be **written** (INSERT, UPDATE) |

If only `USING` is specified, it implicitly applies to both.

Per Postgres docs, the canonical own-data UPDATE policy uses both:

```sql
CREATE POLICY user_policy ON users
    FOR UPDATE
    USING (user_name = current_user)
    WITH CHECK (
        user_name = current_user AND
        shell IN ('/bin/bash', '/bin/sh', '/bin/dash')
    );
```

`USING` ensures the user can only update **their own row**;
`WITH CHECK` ensures they can't update the row into a state that
violates other invariants.

### Per-command policies

For SELECT/UPDATE divergence (a common tenant pattern: all users
see all rows, but only modify their own):

```sql
CREATE POLICY user_sel_policy ON users
    FOR SELECT
    USING (true);

CREATE POLICY user_mod_policy ON users
    FOR UPDATE
    USING (user_name = current_user);
```

### Permissive vs restrictive policies

| Type | Combination |
|---|---|
| **PERMISSIVE** (default) | Multiple policies combine with **OR** - any match grants access |
| **RESTRICTIVE** | Multiple policies combine with **AND** - all must allow |

Restrictive policies layer additional constraints on top of
permissive ones. Per Postgres docs:

```sql
-- Permissive: anyone in role 'admin' or whose row matches
-- Restrictive: only allow when from local network
CREATE POLICY admin_local_only ON passwd
    AS RESTRICTIVE TO admin
    USING (pg_catalog.inet_client_addr() IS NULL);
```

### TO role_name

If omitted, the policy applies to **all users** (`TO PUBLIC`).
For tenant isolation, scope policies to the application role:

```sql
CREATE POLICY tenant_isolation ON documents
    TO app_user
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

## Tenant context patterns

The policy needs a source of truth for the current tenant. Four
canonical patterns:

### 1. `current_setting()` with SET LOCAL

Set the tenant at session / transaction start, read it in the
policy:

```sql
-- Application code (every transaction):
SET LOCAL app.tenant_id = '<uuid>';

-- Policy:
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

`SET LOCAL` confines the value to the current transaction - 
critical when the connection is from a shared connection pool.

### 2. `current_user` / `session_user`

Map each tenant to a Postgres role. Suitable for low-tenant-count
deployments (silo-leaning):

```sql
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = (SELECT id FROM tenants WHERE name = current_user));
```

### 3. Supabase `auth.uid()` / `auth.jwt()`

For Supabase-backed apps, JWT claims are exposed through helper
functions. Per
[supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security):

```sql
CREATE POLICY "User can see their own profile only."
ON profiles FOR SELECT
USING ( (SELECT auth.uid()) = user_id );
```

Organisation / team membership via app_metadata:

```sql
CREATE POLICY "User is in team"
ON my_table TO authenticated
USING ( team_id IN (SELECT auth.jwt() -> 'app_metadata' -> 'teams') );
```

**Critical:** Per Supabase docs, never trust
`raw_user_meta_data` for authorisation - it's user-modifiable.
Use `raw_app_meta_data` (server-set) or a separate server-side
claim store.

### 4. JWT claim parsing in policy

For self-rolled auth, parse the JWT or token directly:

```sql
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid);
```

The `true` argument to `current_setting` makes it return NULL if
the setting is absent (safer than erroring).

## Performance discipline

Per Supabase RLS performance docs:

| Practice | Effect |
|---|---|
| Wrap auth function calls in `SELECT` | Postgres optimiser caches result per statement (initPlan); 94%+ improvement on large tables |
| Specify `TO role_name` | Avoids policy evaluation for unrelated roles |
| Index on policy-referenced columns | 99%+ improvement for tenant_id-filtered queries |
| Include explicit filter in query | Helps query planner even when RLS adds implicit filter |

Bad:

```sql
USING ( auth.uid() = user_id )
```

Good (initPlan-cached):

```sql
USING ( (SELECT auth.uid()) = user_id )
```

## Bypassing RLS

Three categories of bypass per Postgres docs:

| Bypass | When |
|---|---|
| Superusers | Always (cannot be disabled) |
| Roles with `BYPASSRLS` attribute | Operational tasks; create explicit roles, audit usage |
| Table owners | Bypass by default unless `FORCE ROW LEVEL SECURITY` set |

**For production tenant tables, the application connection role
must NOT be a superuser, NOT have BYPASSRLS, and must NOT own the
table** (or, if it owns the table, `FORCE ROW LEVEL SECURITY`
must be set).

### Detecting RLS-bypassed sessions

To prevent accidentally-bypassed query patterns from masquerading
as policy-respecting:

```sql
SET row_security = off;
-- Subsequent queries error if a policy would have filtered
```

Useful in audit / backup contexts to catch unintended row
exclusion.

## Operations that **always bypass** RLS

Per Postgres docs, these operations are not subject to RLS:

- Foreign key constraint checks
- Unique constraint checks
- `TRUNCATE`
- `REFERENCES` privilege checks

This creates side-channel leaks: an attacker can probe for
tenant-other rows via `INSERT` collisions on unique constraints,
or via foreign-key reference patterns. Compensating controls:

- Use **UUID** primary keys (not sequential ints) to avoid
  enumeration via FK
- Treat unique-constraint timing differences as a side channel
  worth testing per [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md)

## Common policy patterns for tenant isolation

### Pattern 1: Strict tenant_id discriminator

```sql
CREATE POLICY tenant_isolation ON documents
    AS PERMISSIVE
    FOR ALL
    TO app_user
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

Both `USING` and `WITH CHECK` use the same expression - a tenant
can't read OR insert rows for another tenant.

### Pattern 2: Tenant + per-row ACL

```sql
CREATE POLICY tenant_isolation ON documents
    AS PERMISSIVE
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY owner_or_shared ON documents
    AS RESTRICTIVE
    USING (
        owner_id = current_setting('app.user_id')::uuid
        OR id IN (SELECT document_id FROM document_shares
                  WHERE shared_with = current_setting('app.user_id')::uuid)
    );
```

Permissive policy enforces tenant boundary; restrictive policy
layers on per-row ACL.

### Pattern 3: Admin override

```sql
CREATE POLICY tenant_isolation ON documents
    USING (
        tenant_id = current_setting('app.tenant_id')::uuid
        OR current_setting('app.is_global_admin', true)::boolean = true
    );
```

Global admin claim bypasses the tenant filter. Audit usage - 
admin connections must be logged and short-lived.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| RLS enabled but no policy | Default-deny means no rows return - broken silently | Always create at least one policy after enabling |
| Policy on table without `FORCE ROW LEVEL SECURITY` | Table owner bypasses; app role often is the owner | Add FORCE ROW LEVEL SECURITY |
| `current_user` for tenant_id without per-tenant roles | Tenants share a role; no isolation | Use SET LOCAL or JWT claim |
| `tenant_id` from request header → SET LOCAL | Spoofable; never derive from request input | Derive from authenticated session/JWT only |
| `auth.uid()` not wrapped in SELECT | Per-row evaluation - major perf hit at scale | `(SELECT auth.uid())` for initPlan caching |
| No index on tenant_id | Sequential scan after policy filter | btree index on tenant_id always |
| Permissive policy + missing TO clause | Applies to all roles including superusers | Always specify TO app_user |
| Tests use superuser to verify policies | Bypasses RLS - test passes but prod leaks | Tests must connect as a non-superuser without BYPASSRLS |
| Trusting raw_user_meta_data in Supabase policies | User-modifiable per Supabase docs | Use raw_app_meta_data (server-set) |
| Single policy mixing tenant + per-row ACL with OR | Permissive OR widens access; one bad clause leaks tenant | Split into permissive (tenant) + restrictive (ACL) |

## Testing RLS policies

Two levels:

### Statement-level

```sql
-- Connect as app_user (no BYPASSRLS, not table owner)
SET LOCAL app.tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT count(*) FROM documents;  -- should match tenant 1's count only

SET LOCAL app.tenant_id = '22222222-2222-2222-2222-222222222222';
SELECT count(*) FROM documents;  -- should match tenant 2's count

-- Attempt cross-tenant
SET LOCAL app.tenant_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO documents (tenant_id, body)
VALUES ('22222222-2222-2222-2222-222222222222', 'leak');
-- Must fail with: new row violates row-level security policy
```

### Application-level

Run the existing test suite under a non-superuser, non-BYPASSRLS,
non-table-owner role. If passing tests rely on RLS bypass, the
suite is silently invalid for production. Per
[`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md)
the gate test must use a tenant-A session to attempt access to
tenant-B-owned rows and assert 0 rows returned.

## Limitations

- **Constraint side channels.** FK and UNIQUE checks bypass RLS;
  this creates timing/error-message side channels.
- **RLS does not protect logs.** A query that filters to 0 rows
  still appears in `pg_stat_statements` and slow-query logs with
  the same SQL text. Log sanitisation is a separate concern.
- **No RLS on views by default.** A view that does
  `SELECT * FROM tenants` doesn't inherit RLS unless `WITH
  (security_invoker = true)` is set on the view (Postgres 15+).
- **Replication.** Logical replication does not respect RLS by
  default; the subscriber sees all rows. Per-publication filters
  needed.
- **Schema migrations.** ALTER TABLE for new columns runs as
  table owner - review whether new columns need to be added to
  policies.

## References

- Postgres Row-Level Security:
  [postgresql.org/docs/current/ddl-rowsecurity.html](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
- `CREATE POLICY` syntax:
  [postgresql.org/docs/current/sql-createpolicy.html](https://www.postgresql.org/docs/current/sql-createpolicy.html).
- Supabase RLS guide:
  [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Tenant isolation context:
  [`tenant-isolation-models-reference`](../tenant-isolation-models-reference/SKILL.md).
- Consumed by:
  [`tenant-leak-test-author`](../tenant-leak-test-author/SKILL.md),
  [`cross-tenant-data-leak-tests`](../cross-tenant-data-leak-tests/SKILL.md).
