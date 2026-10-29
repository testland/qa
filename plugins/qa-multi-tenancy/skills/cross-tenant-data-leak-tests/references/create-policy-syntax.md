# CREATE POLICY syntax reference

Full `CREATE POLICY` grammar plus the clause semantics a tenant policy relies on.

## Grammar

```sql
CREATE POLICY policy_name ON table_name
    [ AS { PERMISSIVE | RESTRICTIVE } ]
    [ FOR { ALL | SELECT | INSERT | UPDATE | DELETE } ]
    [ TO role_name [, ...] ]
    [ USING ( using_expression ) ]
    [ WITH CHECK ( check_expression ) ];
```

## USING vs WITH CHECK

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

`USING` ensures the user can only update **their own row**; `WITH CHECK`
ensures they can't update the row into a state that violates other invariants.

## Per-command policies

For SELECT/UPDATE divergence (a common tenant pattern: all users see all rows,
but only modify their own):

```sql
CREATE POLICY user_sel_policy ON users
    FOR SELECT
    USING (true);

CREATE POLICY user_mod_policy ON users
    FOR UPDATE
    USING (user_name = current_user);
```

## Permissive vs restrictive policies

| Type | Combination |
|---|---|
| **PERMISSIVE** (default) | Multiple policies combine with **OR** - any match grants access |
| **RESTRICTIVE** | Multiple policies combine with **AND** - all must allow |

Restrictive policies layer additional constraints on top of permissive ones.
Per Postgres docs:

```sql
-- Permissive: anyone in role 'admin' or whose row matches
-- Restrictive: only allow when from local network
CREATE POLICY admin_local_only ON passwd
    AS RESTRICTIVE TO admin
    USING (pg_catalog.inet_client_addr() IS NULL);
```

## TO role_name

If omitted, the policy applies to **all users** (`TO PUBLIC`). For tenant
isolation, scope policies to the application role:

```sql
CREATE POLICY tenant_isolation ON documents
    TO app_user
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

## References

- `CREATE POLICY` syntax:
  [postgresql.org/docs/current/sql-createpolicy.html](https://www.postgresql.org/docs/current/sql-createpolicy.html).
