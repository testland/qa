---
name: liquibase-migrations
description: "Authors and runs Liquibase database migrations - changelog-driven schema management with changesets in XML / YAML / JSON / SQL formats; supports `liquibase update` / `status` / `rollback` / `tag` / `history` lifecycle; offers per-changeset preconditions, contexts and labels for selective execution, and rollback semantics; tracks state in `DATABASECHANGELOG` + `DATABASECHANGELOGLOCK` tables. Use when the user works with Liquibase-managed schemas (Spring Boot heritage, polyglot DB shops), needs cross-DBMS portable migrations, or requires fine-grained rollback control."
rating: 22
d6: 4
---

# liquibase-migrations

## Overview

Per [github.com/liquibase/liquibase][lb-gh]:

[lb-gh]: https://github.com/liquibase/liquibase

> "Liquibase helps millions of developers track, version, and
> deploy database schema changes."

Liquibase's distinguishing feature vs Flyway: changesets are
**format-portable** (XML / YAML / JSON / SQL) and **rollback-aware** - each changeset declares its own rollback action, enabling
deterministic per-changeset rollback rather than versioned-only
migration replay.

State tracked in two tables (per Liquibase docs):

- `DATABASECHANGELOG` - applied changeset history (id + author +
  filename + dateExecuted + checksum)
- `DATABASECHANGELOGLOCK` - distributed lock to serialize concurrent
  `update` runs

## When to use

- The repo has `db.changelog-master.xml` / `.yaml` / `.json`.
- The user works with Spring Boot Liquibase auto-config or any of
  the Liquibase Maven / Gradle / Ant plugins.
- The team needs cross-DBMS portable migrations (XML/YAML
  changesets translate to per-DBMS SQL at apply time).
- Per-changeset rollback support is required (vs Flyway's
  whole-version rollback).

## Step 1 - Install

Per [lb-gh][lb-gh] the documented quickstart:

```bash
# Download installer per platform from liquibase.com/download
# Add liquibase to PATH
liquibase init start-h2    # spin up an H2 dev DB to try it out
```

For CI / containerized usage:

```bash
docker pull liquibase/liquibase:latest
docker run --rm -v "$PWD/changelog:/liquibase/changelog" \
  liquibase/liquibase \
  --url=jdbc:postgresql://host/db \
  --username=user --password=pwd \
  --changelog-file=changelog/db.changelog-master.xml \
  update
```

Maven dependency / Gradle plugin available for in-build invocation - 
consult [docs.liquibase.com][lb-docs].

[lb-docs]: https://docs.liquibase.com/

## Step 2 - Changelog + changeset basics

A `changelog` is a file (or set of included files) containing one or
more `changeset` entries. Each changeset has an `id` + `author` (these
are the identity for the `DATABASECHANGELOG` row).

YAML example:

```yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: alice
      changes:
        - createTable:
            tableName: users
            columns:
              - column:
                  name: id
                  type: bigint
                  autoIncrement: true
                  constraints: { primaryKey: true, nullable: false }
              - column:
                  name: email
                  type: varchar(255)
                  constraints: { unique: true, nullable: false }
      rollback:
        - dropTable:
            tableName: users
  - changeSet:
      id: 2
      author: alice
      changes:
        - addColumn:
            tableName: users
            columns:
              - column: { name: created_at, type: timestamp }
      rollback:
        - dropColumn: { tableName: users, columnName: created_at }
```

Equivalent forms in XML / JSON / SQL exist - pick by team
preference; they're functionally equivalent at apply time. (Per
[lb-docs][lb-docs] for format-specific syntax.)

## Step 3 - Core commands

Per [lb-gh][lb-gh] and Liquibase command reference:

| Command | Use |
|---|---|
| `liquibase update` | Apply pending changesets |
| `liquibase status` | List pending changesets |
| `liquibase history` | Show executed changesets |
| `liquibase rollback <tag>` | Roll back to a tagged state |
| `liquibase rollback-count <n>` | Roll back the last N changesets |
| `liquibase tag <tag-name>` | Mark current state with a tag (for later rollback) |
| `liquibase changelog-sync` | Mark all pending changesets as applied without running them (legacy adoption) |
| `liquibase validate` | Check changelog syntax + checksums |

## Step 4 - Preconditions

Changesets can declare preconditions that must hold before they're
applied (or the changeset is skipped / failed):

```yaml
- changeSet:
    id: 3
    author: alice
    preConditions:
      - onFail: MARK_RAN     # if precondition fails, mark as run without executing
      - onError: MARK_RAN
      - tableExists: { tableName: users }
    changes:
      - addColumn: { tableName: users, columns: [{ column: { name: status, type: varchar(20) }}] }
```

Common precondition predicates: `tableExists`, `columnExists`,
`viewExists`, `indexExists`, `foreignKeyConstraintExists`,
`changeSetExecuted`, `dbms` (e.g., only-on-postgresql),
`primaryKeyExists`, `sqlCheck` (custom SQL returning a single value).

`onFail` / `onError` actions: `HALT` (default - fails the run),
`CONTINUE`, `MARK_RAN`, `WARN`.

## Step 5 - Contexts and labels

Selective changeset execution per environment / feature:

```yaml
- changeSet:
    id: 4
    author: alice
    contexts: dev,test          # only run when --contexts dev or test
    labels: experimental         # filterable by --labels selector
    changes:
      - createTable: { tableName: feature_x_audit, columns: [...] }
```

Run contexts at apply time:

```bash
liquibase update --contexts="dev,test"
liquibase update --label-filter="!experimental"  # exclude experimental
```

## Step 6 - Include + includeAll for splitting changelogs

Master changelog references file groups (per [docs.liquibase.com/concepts/changelogs][lb-cl]):

[lb-cl]: https://docs.liquibase.com/concepts/changelogs/home.html

```yaml
databaseChangeLog:
  - include: { file: changelog/v1.0/users.yaml }
  - include: { file: changelog/v1.0/orders.yaml }
  - includeAll: { path: changelog/v2.0/, errorIfMissingOrEmpty: true }
```

The `includeAll` orders files alphabetically; use prefixes
(`001-users.yaml`, `002-orders.yaml`) to enforce order.

## Step 7 - CI integration

```yaml
- run: docker run --rm --network=host \
    -v "$PWD/changelog:/liquibase/changelog" \
    liquibase/liquibase:latest \
    --url=jdbc:postgresql://localhost:5432/test \
    --username=postgres --password=pwd \
    --changelog-file=/liquibase/changelog/db.changelog-master.xml \
    update
- run: mvn test
```

Per `qa-test-environment/testcontainers` skill, ephemeral DB +
liquibase update is the standard pattern.

## Step 8 - Composition with sister tools

Pair with [`migration-blast-radius-reviewer`](../../agents/migration-blast-radius-reviewer.md)
for adversarial review of new changesets - classifies as
additive / breaking / data-loss / locking; estimates downtime.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Reuse a changeset `id` after it's been deployed | Checksum mismatch on next `update`; deploys fail | New `id` per change; never edit deployed changesets |
| Rollback section omitted | `liquibase rollback` fails silently; downtime | Author rollback per changeset (Step 2) |
| Use `runAlways: true` for migrations | Reruns every deploy; data corruption risk | `runAlways` is for `runInTransaction: false` admin scripts only |
| Mix XML + YAML + JSON in one repo | Reviewer cognitive load; sloppy diffs | Pick one format per repo |
| Skip preconditions on conditional changes | Apply fails on environments where preconditions don't hold | Use `dbms`/`tableExists` preconditions (Step 4) |

## Limitations

- Per-changeset rollback only works if every author writes the
  rollback section; OSS Liquibase doesn't auto-generate them for
  most change types.
- Cross-DBMS portability of changesets has limits - DBMS-specific
  syntax (e.g., Postgres JSONB columns) requires `dbms` precondition
  + per-DBMS variants.
- The `DATABASECHANGELOGLOCK` table can deadlock if a previous run
  crashed mid-update; `liquibase release-locks` recovers (note: this
  command name varies between Liquibase versions; consult
  [lb-docs][lb-docs]).
- Liquibase Pro features (Quality Checks, Drift Reports, Targeted
  Rollback) are paid; the OSS edition covers the patterns above.

## References

- [lb-gh][lb-gh] - repository, install, supported databases
- [lb-cl][lb-cl] - changelog concept page
- [lb-docs][lb-docs] - full documentation
- [`flyway-migrations`](../flyway-migrations/SKILL.md),
  [`atlas-migrations`](../atlas-migrations/SKILL.md),
  [`sqlmesh-migrations`](../sqlmesh-migrations/SKILL.md) - sister
  tools (Flyway = SQL-first versioned; Atlas = declarative HCL;
  SQLMesh = data-pipeline + schema)
- [`migration-blast-radius-reviewer`](../../agents/migration-blast-radius-reviewer.md) - adversarial reviewer
