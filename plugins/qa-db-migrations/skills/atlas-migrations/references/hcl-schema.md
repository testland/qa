# HCL schema definition (Atlas DSL)

Atlas accepts the desired schema as SQL (most common) or as HCL,
Atlas's own schema DSL. Both are desired-state inputs to the same
`atlas schema apply` and `atlas migrate diff` commands (Steps 3-4),
passed via `--to file://<schema-file>`.

## HCL example

The `users` table from Step 2's SQL example, expressed in HCL:

```hcl
table "users" {
  schema = schema.public
  column "id" {
    null = false
    type = serial
  }
  column "email" {
    null = false
    type = varchar(255)
  }
  primary_key { columns = [column.id] }
  index "unique_email" { unique = true; columns = [column.email] }
}
```

## HCL vs SQL - which to author

- **SQL** is the most common choice and the widest-supported: any
  feature the target DBMS accepts in DDL can be expressed.
- **HCL** is a single, engine-neutral DSL across all supported
  engines.
- Some DBMS-specific features (e.g., Oracle PL/SQL packages,
  PostgreSQL extension management) have limited HCL support - fall
  back to SQL schema for those (see
  [atlas-caveats.md](atlas-caveats.md)).

Either representation produces the same versioned migrations once
diffed against the `--dev-url` scratch DB.
