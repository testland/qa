# Tenant context patterns

The policy needs a source of truth for the current tenant. Four canonical
patterns.

## 1. `current_setting()` with SET LOCAL

Set the tenant at session / transaction start, read it in the policy:

```sql
-- Application code (every transaction):
SET LOCAL app.tenant_id = '<uuid>';

-- Policy:
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

`SET LOCAL` confines the value to the current transaction - critical when the
connection is from a shared connection pool.

## 2. `current_user` / `session_user`

Map each tenant to a Postgres role. Suitable for low-tenant-count deployments
(silo-leaning):

```sql
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = (SELECT id FROM tenants WHERE name = current_user));
```

## 3. Supabase `auth.uid()` / `auth.jwt()`

For Supabase-backed apps, JWT claims are exposed through helper functions. Per
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

**Critical:** Per Supabase docs, never trust `raw_user_meta_data` for
authorisation - it's user-modifiable. Use `raw_app_meta_data` (server-set) or a
separate server-side claim store.

## 4. JWT claim parsing in policy

For self-rolled auth, parse the JWT or token directly:

```sql
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid);
```

The `true` argument to `current_setting` makes it return NULL if the setting is
absent (safer than erroring).

## References

- Supabase RLS guide:
  [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security).
