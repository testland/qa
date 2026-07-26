# Tenant policy patterns and RLS bypass

Canonical tenant-isolation policy shapes, plus the ways RLS can be bypassed that
a tenant deployment must lock down.

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

Both `USING` and `WITH CHECK` use the same expression - a tenant can't read OR
insert rows for another tenant.

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

Permissive policy enforces tenant boundary; restrictive policy layers on per-row
ACL.

### Pattern 3: Admin override

```sql
CREATE POLICY tenant_isolation ON documents
    USING (
        tenant_id = current_setting('app.tenant_id')::uuid
        OR current_setting('app.is_global_admin', true)::boolean = true
    );
```

Global admin claim bypasses the tenant filter. Audit usage - admin connections
must be logged and short-lived.

## Bypassing RLS

Three categories of bypass per Postgres docs:

| Bypass | When |
|---|---|
| Superusers | Always (cannot be disabled) |
| Roles with `BYPASSRLS` attribute | Operational tasks; create explicit roles, audit usage |
| Table owners | Bypass by default unless `FORCE ROW LEVEL SECURITY` set |

**For production tenant tables, the application connection role must NOT be a
superuser, NOT have BYPASSRLS, and must NOT own the table** (or, if it owns the
table, `FORCE ROW LEVEL SECURITY` must be set).

### Detecting RLS-bypassed sessions

To prevent accidentally-bypassed query patterns from masquerading as
policy-respecting:

```sql
SET row_security = off;
-- Subsequent queries error if a policy would have filtered
```

Useful in audit / backup contexts to catch unintended row exclusion.

## Operations that always bypass RLS

Per Postgres docs, these operations are not subject to RLS:

- Foreign key constraint checks
- Unique constraint checks
- `TRUNCATE`
- `REFERENCES` privilege checks

This creates side-channel leaks: an attacker can probe for tenant-other rows via
`INSERT` collisions on unique constraints, or via foreign-key reference patterns.
Compensating controls:

- Use **UUID** primary keys (not sequential ints) to avoid enumeration via FK
- Treat unique-constraint timing differences as a side channel worth testing per
  `cross-tenant-data-leak-tests`

## References

- Postgres Row-Level Security:
  [postgresql.org/docs/current/ddl-rowsecurity.html](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
