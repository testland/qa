---
name: flyway-migrations
description: "Authors and runs Flyway database migrations - versioned (`V1__add_users.sql`), repeatable (`R__refresh_views.sql`), and undo (`U1__remove_users.sql`) migration files in `db/migration/`; runs `flyway migrate` / `info` / `validate` / `clean` / `baseline` / `repair`; tracks state in the `flyway_schema_history` table; supports 50+ databases including Oracle / SQL Server / MySQL / PostgreSQL / MariaDB / Snowflake / BigQuery; integrates with Maven, Gradle, CLI, and Docker. Use when the user works with Flyway-managed schemas, asks about migration ordering, or needs CI gates on schema changes."
---

# flyway-migrations

## Overview

Per [documentation.red-gate.com/fd/flyway-documentation-138346877.html][fw-home]:

[fw-home]: https://documentation.red-gate.com/fd/flyway-documentation-138346877.html

> "Redgate Flyway extends DevOps to your databases to accelerate
> software delivery and ensure quality code so you can deploy with
> confidence. From version control to continuous delivery, Flyway
> builds on application delivery processes to automate database
> deployments."

Flyway tracks applied migrations in a per-database
`flyway_schema_history` table (per [documentation.red-gate.com/fd/quickstart-how-flyway-works-184127223.html][fw-how]):

[fw-how]: https://documentation.red-gate.com/fd/quickstart-how-flyway-works-184127223.html

> "[The flyway_schema_history table] is used to track the changes
> to the database."

> "The migrations are applied in order based on their **version
> number**."

## When to use

- The repo has a `db/migration/` (or configured) directory of
  `V*.sql` / `R*.sql` files.
- The user works with Flyway CLI / Docker / Maven plugin / Gradle
  plugin.
- A CI workflow needs a migration gate against a per-PR ephemeral
  database (e.g., Testcontainers) before merge.
- The team migrates from manual SQL scripts to versioned migration
  control.

## How to use

1. Install Flyway via CLI, Docker, Maven, or Gradle (Step 1).
2. Create versioned `V<n>__desc.sql` files in `db/migration/`; use
   `R__` for repeatable views / procs (Step 2).
3. Configure `flyway.conf` with the JDBC URL and set
   `cleanDisabled=true` for any non-ephemeral DB (Step 5).
4. Preview with `flyway info`, then apply pending migrations with
   `flyway migrate` (Steps 3 - 4).
5. Verify checksums of applied migrations with `flyway validate`
   before each deploy (Step 3).
6. Gate every PR in CI: spin an ephemeral DB, apply migrations, run
   tests against the migrated schema (Step 6).
7. If a migration fails mid-run, fix `flyway_schema_history` with
   `flyway repair` - never by editing an applied file (Step 3,
   Anti-patterns).

## Step 1 - Install

Per [fw-home][fw-home]: "Flyway Command Line runs on Windows,
macOS, Linux, and is available on docker." Plus Maven plugin and
Gradle Plugin distributions.

Common install paths (consult [fw-home][fw-home] for current download
URL by platform):

```bash
# Docker (zero-install for CI)
docker run --rm flyway/flyway -url=jdbc:postgresql://host/db -user=usr -password=pwd migrate

# Homebrew (macOS / Linux)
brew install flyway

# Maven plugin (Spring Boot etc.)
# add to pom.xml under <build><plugins>
```

## Step 2 - First migration

Per [fw-how][fw-how], migrations may be "written in either SQL,
Java, or other scripting languages." File-naming convention places
migrations in the configured `locations` (default `db/migration`):

```
db/migration/
├── V1__create_users.sql
├── V2__add_email_index.sql
├── R__refresh_active_users_view.sql      # repeatable, reruns on checksum change
└── U1__remove_users.sql                   # undo (Flyway Teams)
```

The prefix scheme:

| Prefix | Type | Reruns? | Use |
|---|---|---|---|
| `V<n>__` | Versioned | Once | New schema changes; immutable after merge |
| `R__` | Repeatable | When checksum changes | Views / stored procs / seed data |
| `U<n>__` | Undo | Inverse of versioned | Rollback (Teams edition) |

`__` (double underscore) separates version + description; `.sql` (or
configured suffix) marks the file as a migration.

## Step 3 - Core commands

Per [fw-home][fw-home]: "Flyway has the following commands at its
disposal: Migrate, Clean, Info, Validate, Undo, Baseline, Repair,
Check and Snapshot."

| Command | Use |
|---|---|
| `flyway migrate` | Apply pending migrations |
| `flyway info` | Show applied + pending migration list |
| `flyway validate` | Verify checksums of applied migrations vs disk files |
| `flyway baseline` | Mark a legacy schema state as baseline (skip prior migrations) |
| `flyway repair` | Fix a broken `flyway_schema_history` (e.g., after a failed migration) |
| `flyway undo` | Roll back the last versioned migration (Teams) |
| `flyway clean` | **Drop all objects** in the schema (production-disabled by default) |

## Step 4 - Pending-migration semantics

Per [fw-how][fw-how]:

> "If their version number is lower than the table's current
> version, they are ignored by default. The remaining migrations
> are the **pending migrations**: available, but not applied."

This is the safety property: a developer who pulls main with new
migrations and runs `flyway migrate` applies only the new ones; old
ones already in `flyway_schema_history` are not re-run.

## Step 5 - Configuration

Configuration via `flyway.conf` file, env vars (`FLYWAY_*`), or CLI
flags. Key settings:

```properties
flyway.url=jdbc:postgresql://localhost:5432/mydb
flyway.user=myuser
flyway.password=mypass
flyway.locations=filesystem:db/migration,classpath:db/migration
flyway.baselineOnMigrate=true        # auto-baseline empty schemas
flyway.cleanDisabled=true            # CRITICAL for prod - disable destructive `clean`
flyway.outOfOrder=false              # reject migrations with versions lower than max applied
flyway.validateOnMigrate=true        # checksum-validate before applying
```

`cleanDisabled=true` is a **mandatory production guard** - 
`flyway clean` drops every object in the schema. Always set this in
production config; only enable for ephemeral test databases.

## Step 6 - CI integration

Pattern: ephemeral DB (Docker / Testcontainers) per PR + apply
migrations + run tests against the migrated schema.

```yaml
- name: Spin up Postgres
  uses: docker/setup-buildx-action@v3
- run: docker run -d --name pg -p 5432:5432 -e POSTGRES_PASSWORD=pwd postgres:16
- name: Apply migrations
  run: |
    docker run --rm --network=host \
      -v "$PWD/db/migration:/flyway/sql" \
      flyway/flyway -url=jdbc:postgresql://localhost:5432/postgres \
      -user=postgres -password=pwd migrate
- name: Run tests
  run: mvn test
```

For full integration with `testcontainers` (in the qa-test-environment
plugin): spin up the DB via Testcontainers, then call
`Flyway.configure()` in JUnit `@BeforeAll`.

## Step 7 - Composition with sister tools

Before merge, apply adversarial review of new migrations -
classify each as additive / breaking / data-loss / locking.

## Worked example

Add an index on `users.email` and ship it through CI:

1. Create `db/migration/V2__add_email_index.sql` with
   `CREATE INDEX idx_users_email ON users(email);`.
2. Locally run `flyway info` - it lists `V2` as pending while `V1`
   shows applied.
3. `flyway migrate` applies only `V2` and appends a row to
   `flyway_schema_history` with its checksum.
4. In the PR, CI starts an ephemeral Postgres, runs the Docker
   `flyway ... migrate`, then `mvn test` against the migrated schema.
5. A teammate later edits the merged `V2` file; on their next run
   `flyway validate` fails with a checksum mismatch, so they add
   `V3__...` instead of mutating `V2`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Edit a previously-applied versioned migration | Checksum mismatch; `validate` fails on next run | Add a new V_n+1 migration that adjusts |
| `cleanDisabled=false` in production config | One stray `flyway clean` drops the schema | Always `cleanDisabled=true` (Step 5) |
| Mixing versioned + repeatable migrations for the same object | Repeatable applies after every versioned change → race | Pick one per object class |
| `outOfOrder=true` without team agreement | Lower-version migrations apply mid-stream; ordering breaks | Default `false`; enable per change with team review |
| Skip CI gating on per-PR ephemeral DB | Migrations break in production for the first time | Always run migrations in CI (Step 6) |

## Limitations

- Undo migrations are a Teams (paid) feature - OSS users implement
  rollback manually via inverse versioned migrations.
- `flyway clean` is irreversible; the `cleanDisabled=true` guard is
  the only protection.
- 50+ supported DBMS but rule depth varies - consult per-database
  pages on [fw-home][fw-home] for vendor-specific syntax.
- Requires JVM (CLI bundles its own JRE; Docker / Maven plugin
  inherit it).

## References

- [fw-home][fw-home] - main documentation, command list, supported
  databases
- [fw-how][fw-how] - conceptual model: schema_history table,
  pending-migration semantics, ordering
- github.com/flyway/flyway - repository
- `liquibase-migrations`,
  `atlas-migrations`,
  `sqlmesh-migrations` - sister
  tools (Liquibase = changelog-driven; Atlas = declarative HCL;
  SQLMesh = data-pipeline + schema)
