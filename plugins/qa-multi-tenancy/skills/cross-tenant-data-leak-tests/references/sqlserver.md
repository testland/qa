# SQL Server - CREATE SECURITY POLICY with predicate functions

SQL Server has native RLS since SQL Server 2016 (13.x), also available on
Azure SQL Database, Azure SQL Managed Instance, and Microsoft Fabric
Warehouse.

## Predicate types

| Predicate | Effect |
|---|---|
| `FILTER` | Silently filters rows for `SELECT`, `UPDATE`, `DELETE` - the app sees an empty result, not an error |
| `BLOCK` | Explicitly blocks writes (`AFTER INSERT`, `AFTER UPDATE`, `BEFORE UPDATE`, `BEFORE DELETE`) that violate the predicate |

The predicate is an inline table-valued function created
`WITH SCHEMABINDING`. `SCHEMABINDING = ON` (the default) means users
querying the target table need no permission on the predicate function or
its helper tables. The clauses material to isolation are
`ADD [FILTER | BLOCK] PREDICATE tvf(cols) ON table` and
`WITH (STATE = ON)`; the `CREATE SECURITY POLICY` reference has the full
grammar.

## Tenant context via SESSION_CONTEXT

For shared connection pools, carry the tenant ID per connection with
`SESSION_CONTEXT()`:

```sql
CREATE FUNCTION Security.fn_tenant_predicate(@TenantId int)
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS result
    WHERE CAST(SESSION_CONTEXT(N'TenantId') AS int) = @TenantId;
GO

CREATE SECURITY POLICY Security.TenantFilter
    ADD FILTER PREDICATE Security.fn_tenant_predicate(TenantId) ON dbo.Documents,
    ADD BLOCK PREDICATE Security.fn_tenant_predicate(TenantId) ON dbo.Documents AFTER INSERT
    WITH (STATE = ON);
GO

EXEC sp_set_session_context @key = N'TenantId', @value = 42, @read_only = 1;
```

`@read_only = 1` locks the `SESSION_CONTEXT` value until the connection
returns to the pool - critical for pool reuse safety.

## Alternative tenant context - USER_NAME()

For low-tenant-count deployments where each tenant maps to a SQL login:

```sql
CREATE FUNCTION Security.tvf_securitypredicate(@TenantRep AS nvarchar(50))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS result
    WHERE @TenantRep = USER_NAME() OR USER_NAME() = 'GlobalAdmin';
GO
```

## Bypass risks

| Risk | Why |
|---|---|
| `db_owner` / `sysadmin` | Policy applies but these roles can alter/drop it; audit all policy changes |
| `DBCC SHOW_STATISTICS` | Reports statistics on unfiltered data; restrict access to table owners |
| Change Data Capture (CDC) | Leaks full rows to `db_owner` and the CDC gating role regardless of policy |
| Change Tracking | Leaks primary keys of filtered rows to users with `VIEW CHANGE TRACKING` |
| Indexed views | Cannot be created on tables with a security policy |
| `FILESTREAM` | Incompatible with RLS |
| Predicate relying on `SET` options | `SET DATEFORMAT`/`SET LANGUAGE` can cause inconsistent filtering; use explicit `CONVERT` with a style parameter |

Sources: SQL Server RLS
[learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security);
`CREATE SECURITY POLICY`
[learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql).
