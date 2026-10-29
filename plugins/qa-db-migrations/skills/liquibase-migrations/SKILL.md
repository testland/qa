---
name: liquibase-migrations
description: "Use whenever a schema is managed with Liquibase: changelogs and changesets in XML, YAML, JSON or SQL, update, status, rollback and tag, preconditions, contexts and labels, and the changelog lock tables, for portable migrations across databases with fine rollback control."
---

# liquibase-migrations

## Overview

[lb-gh]: https://github.com/liquibase/liquibase

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

Pick one runner and pin its version:

```bash
# CLI in a container (CI and local)
docker run --rm -v "$PWD/changelog:/liquibase/changelog" \
  -e LIQUIBASE_COMMAND_PASSWORD \
  liquibase/liquibase:5.0.4 \
  --url=jdbc:postgresql://host/db --username=app \
  --changelog-file=changelog/db.changelog-master.yaml \
  status --verbose
```

Keep the password off the command line: any command option can be set
as `LIQUIBASE_COMMAND_<option-name>` ([environment variables][lb-env]),
and `-e LIQUIBASE_COMMAND_PASSWORD` with no value forwards the host's
variable into the container ([docker run][docker-env]).

Maven ([Maven integration][lb-mvn]):

```xml
<plugin>
  <groupId>org.liquibase</groupId>
  <artifactId>liquibase-maven-plugin</artifactId>
  <version>5.0.4</version>
  <configuration>
    <changeLogFile>src/main/resources/db/changelog/db.changelog-master.yaml</changeLogFile>
    <url>${env.DB_URL}</url>
    <username>${env.DB_USER}</username>
    <password>${env.DB_PASSWORD}</password>
  </configuration>
</plugin>
```

then `mvn liquibase:validate liquibase:update`. Spring Boot: with
`spring-boot-starter-liquibase` on the classpath, migrations run at
startup and before tests, reading `db/changelog/db.changelog-master.yaml`
unless `spring.liquibase.change-log` says otherwise ([Spring Boot][sb-lb]).

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

## Step 3 - Gate: validate and preview before `update`

Run these in order; stop at the first failure:

```bash
liquibase validate                       # 1. syntax, duplicate id/author/file, checksums
liquibase status --verbose               # 2. which changesets are pending
liquibase update-sql > pending.sql       # 3. read the SQL that update would run
liquibase update                         # 4. apply
```

`validate` checks that the changelog parses, that no `id` / `author` /
`file` combination repeats, and that no applied changeset's checksum
changed ([validate][lb-validate]). `update-sql` prints the SQL `update`
would run so it can be reviewed; it does not check that SQL for
correctness ([update-sql][lb-updatesql]).

**On a checksum error,** someone edited a changeset that already ran.
Revert the edit and put the change in a new changeset. Only if the edit
is deliberately harmless (a comment, whitespace), add that changeset's
new checksum to a `validCheckSum` entry and say why in the PR; never
clear checksums to make the gate pass.

**On a held lock** after an interrupted run, confirm no other
Liquibase process is running, then `liquibase release-locks`
([release-locks][lb-locks]).

Other commands:

| Command | Use |
|---|---|
| `liquibase history` | Show executed changesets |
| `liquibase tag <tag>` / `rollback <tag>` | Mark a state; roll back to it |
| `liquibase rollback-count <n>` | Roll back the last N changesets |
| `liquibase update-testing-rollback` | Update, roll back the same changesets, update again: proves every rollback works ([update-testing-rollback][lb-utr]) |
| `liquibase changelog-sync` | Mark pending changesets as applied without running them (adopting an existing schema) |

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
services:
  postgres:
    image: postgres:17
    env: { POSTGRES_PASSWORD: ci }
    ports: ["5432:5432"]
steps:
  - uses: actions/checkout@v4
  - name: Liquibase gate on a throwaway database
    env:
      LIQUIBASE_COMMAND_URL: jdbc:postgresql://localhost:5432/postgres
      LIQUIBASE_COMMAND_USERNAME: postgres
      LIQUIBASE_COMMAND_PASSWORD: ci
      LIQUIBASE_COMMAND_CHANGELOG_FILE: changelog/db.changelog-master.yaml
    run: |
      lb() { docker run --rm --network=host -v "$PWD/changelog:/liquibase/changelog" \
        -e LIQUIBASE_COMMAND_URL -e LIQUIBASE_COMMAND_USERNAME \
        -e LIQUIBASE_COMMAND_PASSWORD -e LIQUIBASE_COMMAND_CHANGELOG_FILE \
        liquibase/liquibase:5.0.4 "$@"; }
      lb validate
      lb update-sql
      lb update-testing-rollback
```

The job fails on the first failing command (`bash -e` is the default
shell on GitHub-hosted runners), so a checksum error stops it before
anything is applied. Run the same `validate` step in the deploy job
before `update` against each real environment.

## Step 8 - Review risky changesets

Run the `migration-blast-radius-reviewer` agent on new changesets and
classify each with `migration-operation-taxonomy` (additive, breaking,
data-loss, locking) before merge.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Reuse a changeset `id` after it's been deployed | Checksum mismatch on next `update`; deploys fail | New `id` per change; never edit deployed changesets |
| Rollback section omitted | `liquibase rollback` fails silently; downtime | Author rollback per changeset (Step 2) |
| `runAlways: true` on schema or data changes | Re-runs on every deploy | Reserve it for idempotent statements (grants, view refreshes) |
| Editing an applied changeset, then clearing checksums | History no longer matches the database | New changeset; `validCheckSum` only for harmless edits (Step 3) |
| Mix XML + YAML + JSON in one repo | Reviewer cognitive load; sloppy diffs | Pick one format per repo |
| Skip preconditions on conditional changes | Apply fails on environments where preconditions don't hold | Use `dbms`/`tableExists` preconditions (Step 4) |

## Limitations

- Per-changeset rollback only works if every author writes the
  rollback section; OSS Liquibase doesn't auto-generate them for
  most change types.
- Cross-DBMS portability of changesets has limits - DBMS-specific
  syntax (e.g., Postgres JSONB columns) requires `dbms` precondition
  + per-DBMS variants.
- An interrupted run leaves `DATABASECHANGELOGLOCK` locked;
  `liquibase release-locks` clears it (Step 3).
- Liquibase Pro features (Quality Checks, Drift Reports, Targeted
  Rollback) are paid; the OSS edition covers the patterns above.

## References

- [lb-gh][lb-gh] - repository, install, supported databases
- [lb-cl][lb-cl] - changelog concept page
- [lb-docs][lb-docs] - full documentation
- [lb-env][lb-env] - `LIQUIBASE_COMMAND_<option-name>` environment variables
- [docker-env][docker-env] - `docker run -e VAR` forwards the host value
- [validate][lb-validate], [update-sql][lb-updatesql], [update-testing-rollback][lb-utr], [release-locks][lb-locks] - command pages
- [Maven integration][lb-mvn], [Spring Boot Liquibase][sb-lb]
- `flyway-migrations`, `atlas-migrations` - sister tools (Flyway =
  SQL-first versioned; Atlas = declarative HCL / SQL with lint);
  `migration-operation-taxonomy` and `migration-blast-radius-reviewer`
  for risk review

[lb-validate]: https://docs.liquibase.com/commands/utility/validate.html
[lb-updatesql]: https://docs.liquibase.com/commands/update/update-sql.html
[lb-utr]: https://docs.liquibase.com/commands/update/update-testing-rollback.html
[lb-locks]: https://docs.liquibase.com/commands/utility/release-locks.html
[lb-mvn]: https://docs.liquibase.com/tools-integrations/maven/getting-started-liquibase-maven.html
[sb-lb]: https://docs.spring.io/spring-boot/how-to/data-initialization.html
[lb-docs]: https://docs.liquibase.com/
[lb-env]: https://docs.liquibase.com/community/user-guide-5-0-3/what-are-liquibase-environment-variables
[docker-env]: https://docs.docker.com/reference/cli/docker/container/run/
