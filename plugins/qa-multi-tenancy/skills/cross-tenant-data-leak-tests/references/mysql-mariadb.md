# MySQL and MariaDB - view-based tenant isolation

MySQL 8.x and MariaDB have no native row-level security statement.
Isolation combines a view defined `SQL SECURITY INVOKER` with an
application role that holds no direct grants on the base table.

## Why INVOKER, not DEFINER

The `CREATE VIEW` default is `SQL SECURITY DEFINER`: the view runs with
the creator's privileges, so any user with `SELECT` on the view reads
every row the creator can read, including other tenants'. With
`SQL SECURITY INVOKER` the view runs with the caller's privileges, so the
view's `WHERE` clause becomes the tenant boundary. The only clauses
material to isolation are `SQL SECURITY { DEFINER | INVOKER }` and
`WITH [CASCADED | LOCAL] CHECK OPTION`; the MySQL 8.4 `CREATE VIEW`
reference has the full grammar.

## Canonical per-tenant view

```sql
CREATE VIEW tenant_docs AS
    SELECT *
    FROM documents
    WHERE tenant_id = /* app sets via session var or stored function */ ...
SQL SECURITY INVOKER
WITH CASCADED CHECK OPTION;
```

`WITH CHECK OPTION` rejects inserts or updates that would create rows
outside the view's `WHERE` clause.

## App-layer enforcement (required complement)

Views do not block `TRUNCATE`, constraint checks, or direct table access
when the role holds table-level grants. The application must:

1. Connect with a role that has NO `SELECT`/`INSERT`/`UPDATE`/`DELETE`
   on the base table (only on the view).
2. Set the tenant identity before each query (session variable or a
   JWT-derived stored-function result).
3. Treat the view `WHERE` clause as the sole row gate and re-validate it
   in every schema migration.

MariaDB shares this model. Its `DEFINER` clause also accepts
`role | CURRENT_ROLE`, which makes a schema-per-tenant view owned by a
per-tenant role viable at low tenant counts. Atomic DDL for `CREATE VIEW`
landed in MariaDB 10.6.1.

## Bypass risks

| Risk | Why |
|---|---|
| `SQL SECURITY DEFINER` (default) | View runs as creator; tenant filter is advisory only |
| Direct base-table grants on the app role | App can bypass the view entirely |
| `TRUNCATE` | Never filtered by views; requires separate role restriction |
| Schema changes to the view | Migration that widens `WHERE` clause removes isolation |

Sources: MySQL 8.4 `CREATE VIEW`
[dev.mysql.com/doc/refman/8.4/en/create-view.html](https://dev.mysql.com/doc/refman/8.4/en/create-view.html);
MariaDB `CREATE VIEW`
[mariadb.com/kb/en/create-view/](https://mariadb.com/kb/en/create-view/).
