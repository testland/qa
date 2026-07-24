---
name: atlas-migrations
description: "Authors and runs Atlas database schema migrations - declarative HCL or SQL schema definition with `atlas schema apply` for desired-state apply OR `atlas migrate diff` to generate versioned migrations against a dev DB; `atlas migrate apply` to deploy; `atlas migrate lint` to flag destructive / locking / data-loss patterns; `atlas migrate hash` to detect tampering. Supports PostgreSQL, MySQL, SQL Server, ClickHouse, SQLite, MariaDB, Snowflake, Oracle, Redshift, Spanner, CockroachDB, Databricks. Use when the user wants Terraform-style declarative DB schema management or modern SQL-first migration linting beyond Flyway / Liquibase."
---

# atlas-migrations

## Overview

Per [atlasgo.io/getting-started][at-start]:

[at-start]: https://atlasgo.io/getting-started

> "Atlas is a language-independent tool for managing and migrating
> database schemas using modern DevOps principles. Define your
> desired schema, and Atlas will plan, lint, test, and safely apply
> the changes - like Terraform, but for databases."

Two operating modes:

1. **Declarative** - define desired state in HCL or SQL; Atlas
   computes diff and applies (`atlas schema apply`).
2. **Versioned** - Atlas generates timestamped migration files from
   schema diffs (`atlas migrate diff`); migrations apply forward
   (`atlas migrate apply`).

Most production teams use versioned mode for the audit trail; dev
loops often use declarative mode for fast iteration.

## When to use

- The user wants Terraform-style "desired state" workflow for the
  database.
- The team needs the strongest migration linter in the OSS space - 
  Atlas detects destructive operations, lock-escalating patterns,
  and reversibility issues automatically.
- A multi-database stack benefits from a single tool covering 13+
  DBMS engines.
- The team migrates from Flyway / Liquibase and wants migration
  generation from declarative schema (vs hand-authoring every
  ALTER).

## Step 1 - Install

Per [at-start][at-start]:

```bash
# download the install script, then run it
curl -sSf https://atlasgo.sh -o install-atlas.sh
sh install-atlas.sh

# Homebrew
brew install ariga/tap/atlas

# Direct binary download (per platform):
#   atlasbinaries.com/atlas/atlas-{linux-amd64,linux-arm64,
#                                  darwin-amd64,darwin-arm64,
#                                  windows-amd64}-latest
```

## Step 2 - Define schema

Per [at-start][at-start], schema can be SQL (most common) or HCL.

SQL example (PostgreSQL):

```sql
-- schema.sql
CREATE TABLE users (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

HCL example (same schema in Atlas's HCL DSL):

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

The dev DB referenced via `--dev-url` is a **temporary scratch
database** Atlas uses to compute the diff (Atlas applies the desired
state to the scratch DB, then computes the migration vs production).

## Step 3 - Apply schema (declarative mode)

Per [at-start][at-start]:

```bash
atlas schema apply --url "$DATABASE_URL" --to file://schema.sql \
  --dev-url "docker://postgres/17/dev?search_path=public"
```

`--url` = target DB; `--to` = desired schema definition; `--dev-url`
= scratch DB for diff computation. Atlas prints the planned changes
and prompts for confirmation by default.

## Step 4 - Generate versioned migrations

Per [at-start][at-start]:

```bash
atlas migrate diff initial --to file://schema.sql \
  --dev-url "docker://postgres/17/dev?search_path=public"
```

This generates a timestamped migration file in `migrations/` (e.g.,
`20260506120000_initial.sql`). Subsequent calls with a new schema
generate new migrations against the previous state.

## Step 5 - Apply versioned migrations

```bash
atlas migrate apply --url "$DATABASE_URL"
```

Atlas tracks state in `atlas_schema_revisions` table - each applied
migration is recorded with its hash, so tampering is detected on
subsequent applies.

## Step 6 - Lint migrations

Per [at-start][at-start]:

```bash
atlas migrate lint --dev-url "..." --latest 1
```

Lints the most recent migration for: data loss, narrow-column
operations (e.g., `varchar(50)` → `varchar(20)`), missing default
on a `NOT NULL` add, lock-escalating ops on large tables, schema
backwards-incompatibility.

The lint output is the value-add over Flyway / Liquibase - those
tools are syntax-only; Atlas knows about destructive patterns.

## Step 7 - Hash + integrity

Atlas computes hashes for each migration file. If a developer edits
an already-applied migration, `atlas migrate apply` fails until
`atlas migrate hash` re-syncs (intentional act). This protects
against silent migration tampering.

## Step 8 - CI integration

```yaml
- uses: ariga/setup-atlas@v0
- name: Lint migrations
  run: atlas migrate lint --dir "file://migrations" \
    --dev-url "docker://postgres/17/dev?search_path=public" \
    --latest 1
- name: Apply migrations to staging
  run: atlas migrate apply --url "${{ secrets.STAGING_DB_URL }}"
```

GitHub Action `ariga/setup-atlas@v0` provides Atlas in the runner;
the `atlas-action` orchestrator provides PR-comment integration with
diff visualization.

## Step 9 - Composition with sister tools

Beyond `atlas migrate lint`, apply adversarial review with
team-specific risk policies that Atlas's built-in lint doesn't
capture (e.g., "no `DROP TABLE` without DBA approval").

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Edit a migration after it's been applied to staging/prod | `atlas migrate apply` fails on hash mismatch | Add a new migration that adjusts |
| Skip `--dev-url` | Atlas can't compute diff; commands fail or produce wrong output | Always pass `--dev-url` (Steps 3, 4, 6) |
| Use declarative `schema apply` directly to production | No audit trail of applied changes | Use versioned mode in production (Step 4) |
| Skip `atlas migrate lint` in CI | Destructive migrations slip through review | Always lint in CI (Step 8) |
| `atlas migrate hash` after every edit (without team review) | Defeats integrity check | Hash sync only after intentional edit + team review |

## Limitations

- Some DBMS-specific features (e.g., Oracle PL/SQL packages,
  PostgreSQL extension management) have limited HCL support - fall
  back to SQL schema for those.
- Lint rules are general-purpose; team-specific policies (e.g., "no
  `DROP TABLE` without DBA approval") need adversarial review on top.
- `--dev-url` requires a real DBMS instance (or Docker) - Atlas
  cannot diff schemas without one.
- Atlas Cloud (managed plan visualization) is paid; OSS covers
  the CLI workflow.

## References

- [at-start][at-start] - getting-started, install commands,
  example schema, all `atlas` commands, supported databases
- atlasgo.io/docs - full documentation
- github.com/ariga/atlas - repository
- `flyway-migrations`,
  `liquibase-migrations`,
  `sqlmesh-migrations` - sister
  tools (Flyway / Liquibase = imperative versioned; SQLMesh =
  data-pipeline + schema)
