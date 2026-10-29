# CockroachDB - native RLS

CockroachDB supports native row-level security that closely mirrors
Postgres RLS.

## Enabling RLS

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- Force table owners to obey policies too:
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

## CREATE POLICY

`CREATE POLICY policy_name ON table AS [PERMISSIVE | RESTRICTIVE] FOR
[SELECT | INSERT | UPDATE | DELETE | ALL] TO role USING (condition)
[WITH CHECK (condition)]`. Per the CockroachDB RLS docs: `USING` filters
rows on reads and updates; `WITH CHECK` validates writes and defaults to
`USING` when omitted; permissive policies combine with `OR`, restrictive
with `AND`; access is denied by default once RLS is enabled and no policy
applies.

## Tenant context via application_name

CockroachDB has no Postgres-style `SET LOCAL` + `current_setting`
transaction variable. The canonical pattern reads the tenant from
`application_name`, a session variable every client sets at connection
open:

```sql
SET application_name = 'tenant:<uuid>';

CREATE POLICY tenant_isolation ON documents
    FOR ALL
    TO app_role
    USING (
        tenant_id = split_part(current_setting('application_name'), ':', 2)::uuid
    )
    WITH CHECK (
        tenant_id = split_part(current_setting('application_name'), ':', 2)::uuid
    );
```

## Bypass risks

Per the CockroachDB RLS docs, these paths bypass RLS and need separate
controls:

| Bypass | Behaviour |
|---|---|
| Foreign key constraints and cascades | Not subject to RLS |
| Primary / unique key constraints | Not subject to RLS |
| `TRUNCATE` | Not subject to RLS |
| Change Data Capture (CDC) | Queries fail with error when RLS is enabled |
| Backup and restore | Ignore RLS policies |
| Logical and physical cluster replication | Ignore RLS policies |

Source: CockroachDB RLS
[cockroachlabs.com/docs/stable/row-level-security.html](https://www.cockroachlabs.com/docs/stable/row-level-security.html).
