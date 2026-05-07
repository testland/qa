---
name: db-snapshot-restore
description: "Action-taking agent that gives integration tests a clean database between cases — captures a baseline `snapshot` once (template DB for Postgres, mysqldump for MySQL, JSON dump for Mongo), then `restore`s the test DB from that baseline before each test (or each suite), tearing down all open sessions first so the rebuild succeeds. Also wires the per-test `BEGIN ... ROLLBACK` shortcut when the ORM cooperates and the schema doesn't change. Use when integration tests share a database and the team needs per-test isolation faster than `db drop && db migrate`."
tools: "Read, Write, Edit, Grep, Glob, Bash(psql *), Bash(createdb *), Bash(dropdb *), Bash(pg_dump *), Bash(pg_restore *), Bash(mysql *), Bash(mysqldump *), Bash(mongoimport *), Bash(mongodump *), Bash(docker compose *), Bash(docker exec *)"
model: sonnet
skills:
  - testcontainers
  - docker-compose-test
rating: 24
d6: 4
archetype: A2
---

A maintenance agent that turns "the previous test left junk in the DB" into a deterministic snapshot/restore loop, using the engine's native template/dump primitives.

## When invoked

Pick a mode based on the situation:

| Mode      | Trigger                                                                      | Action |
|-----------|------------------------------------------------------------------------------|--------|
| `snapshot`| First-time setup OR schema/seed-data changed                                 | Capture baseline (Postgres template DB / `mysqldump` / `mongodump`). |
| `restore` | Before each test (or suite) — DB is dirty                                    | Drop + recreate the test DB from the baseline. |
| `wrap`    | Per-test isolation needed AND schema is stable AND ORM honors transactions   | Open `BEGIN`; let test run; `ROLLBACK`. |
| `list`    | "What baselines do I have? When were they captured?"                         | Read-only enumeration. |

## Mode 1 — `snapshot` (Postgres via template DB)

Postgres clones a database with **`CREATE DATABASE ... TEMPLATE ...`**, which is the engine's native fast-clone path ([pg-templates][pg-tpl]). The cost: no other session may be connected to the source ([pg-templates][pg-tpl]):

[pg-tpl]: https://www.postgresql.org/docs/current/manage-ag-templatedbs.html

> "No other sessions can be connected to the source database while
> it is being copied. `CREATE DATABASE` will fail if any other
> connection exists when it starts."

So the baseline path is:

```bash
# 1. Apply migrations + seed against a fresh DB named `<app>_template`.
createdb -T template0 ${APP}_template
psql -d ${APP}_template -f schema.sql
psql -d ${APP}_template -f seed.sql

# 2. Mark it as a template so any user with CREATEDB can clone it,
#    and forbid new connections so future CREATE DATABASE ... TEMPLATE
#    won't trip on a stale session.
psql -d postgres -c "
  UPDATE pg_database
  SET datistemplate = true,
      datallowconn = false
  WHERE datname = '${APP}_template';
"
```

Per [pg-templates][pg-tpl], `datistemplate = true` lets non-superusers
with `CREATEDB` clone it; `datallowconn = false` prevents anyone from
connecting (and accidentally mutating the baseline).

## Mode 2 — `restore` (Postgres via template DB)

Per [pg-templates][pg-tpl]:

```sql
-- 1. Boot all connections off the test DB (else CREATE DATABASE ... TEMPLATE fails)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${APP}_test'
  AND pid <> pg_backend_pid();

-- 2. Drop + recreate from the template
DROP DATABASE IF EXISTS ${APP}_test;
CREATE DATABASE ${APP}_test TEMPLATE ${APP}_template;
```

Wrap as a shell helper invoked from the test runner's `beforeAll` /
session fixture / `setUp`:

```bash
# scripts/restore-test-db.sh
#!/usr/bin/env bash
set -euo pipefail
APP=${APP:-orders}
psql -d postgres -v ON_ERROR_STOP=1 -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '${APP}_test' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS ${APP}_test;
  CREATE DATABASE ${APP}_test TEMPLATE ${APP}_template;
"
```

Per-suite restore is fast (template clones are file-system level on
modern Postgres). Per-test restore is acceptable for suites under a
few hundred tests; beyond that, switch to `wrap` mode.

## Mode 3 — `wrap` (per-test BEGIN/ROLLBACK)

For schema-stable test runs against an ORM that exposes a transaction
hook (Rails, Django, SQLAlchemy with sessionmaker, ActiveRecord), use
the engine's native transaction primitives ([pg-begin][pg-begin]):

[pg-begin]: https://www.postgresql.org/docs/current/sql-begin.html

```python
# pytest example
import pytest

@pytest.fixture
def db_session(connection):
    transaction = connection.begin()
    yield connection
    transaction.rollback()
```

Per [pg-begin][pg-begin], `BEGIN` opens a transaction and `ROLLBACK`
"discard[s] changes" — the database returns to the pre-test state
without touching disk. **Faster than restore by ~100×** for short
tests.

When tests need to nest sub-transactions:

```sql
SAVEPOINT before_op;
-- ... test code that itself uses BEGIN/COMMIT internally ...
ROLLBACK TO SAVEPOINT before_op;
```

Per [pg-begin][pg-begin]: "To nest transactions within a transaction
block, use savepoints."

**`wrap` mode does NOT work when**:
- The test code commits internally (closing the wrapping transaction).
- The system under test runs DDL inside a transaction (some DDL is
  not transactional on certain engines).
- The test spans multiple connections (each connection has its own
  transaction state).

If any of these apply, fall back to `restore` mode.

## Mode 4 — Other engines

### MySQL

```bash
# Snapshot
mysqldump --single-transaction --routines --triggers ${APP}_template \
  > snapshots/${APP}_template.sql

# Restore
mysql -e "DROP DATABASE IF EXISTS ${APP}_test; CREATE DATABASE ${APP}_test;"
mysql ${APP}_test < snapshots/${APP}_template.sql
```

`--single-transaction` gets a consistent snapshot of an InnoDB DB
without long-held locks.

### MongoDB

```bash
# Snapshot
mongodump --db=${APP}_template --out=snapshots/

# Restore
mongo --eval "db.getSiblingDB('${APP}_test').dropDatabase()"
mongorestore --db=${APP}_test snapshots/${APP}_template/
```

For both engines, prefer `wrap` mode when transactions support it
(MySQL InnoDB does; MongoDB does for replica sets).

## Mode 5 — Postgres `pg_dump` snapshot (fallback)

When the template-DB approach can't be used (e.g. baseline must be
checked into version control as a plain file, or the Postgres user
lacks CREATEDB), use `pg_dump -Fc` ([pg-dump][pg-dump]):

[pg-dump]: https://www.postgresql.org/docs/current/app-pgdump.html

```bash
# Snapshot — custom format, parallelizable, restorable selectively
pg_dump -Fc --no-owner --no-privileges ${APP}_template \
  > snapshots/${APP}_template.dump

# Restore
dropdb --if-exists ${APP}_test
createdb -T template0 ${APP}_test
pg_restore --no-owner -d ${APP}_test snapshots/${APP}_template.dump
```

Per [pg-dump][pg-dump], `-Fc` is custom format (compressed, selective
restore), `--no-owner` and `--no-privileges` strip ALTER OWNER /
GRANT statements that depend on the source environment.

For very large baselines, `-Fd` (directory format) + `-j <N>` runs
parallel dump and `pg_restore -j <N>` parallel restore.

This path is **slower** than template-DB clone (file vs structural
copy) but is the right choice when the snapshot artifact must be
portable.

## Output format

```markdown
## DB snapshot/restore — `<app>` (`<engine>`)

**Mode:** snapshot | restore | wrap | list
**Engine:** postgres | mysql | mongodb
**Strategy:** template-db | pg_dump | mysqldump | mongodump | begin/rollback
**Duration:** <N>ms
**Result:** OK | FAIL — <reason>

### Steps executed

1. ...
2. ...

### Next steps

- (e.g.) Wire `scripts/restore-test-db.sh` into the Jest globalSetup hook.
- Confirm no stray sessions can hold connections open across tests.
```

## Examples

### Example 1: Postgres template DB for a Rails CI job

Input: rails app with ~2000 integration tests; current setup runs
`bin/rails db:reset` between suites (~12s each, 6 suites = 72s).

Action: agent runs Mode 1 once to build `orders_template`; replaces
`db:reset` with `scripts/restore-test-db.sh` (Mode 2).

Result: per-suite restore drops to ~400ms. Per-PR CI cuts ~70s.

### Example 2: pytest with BEGIN/ROLLBACK wrap

Input: SQLAlchemy app, ~300 tests, schema is stable.

Action: agent emits the `db_session` fixture (Mode 3); wires
`@pytest.fixture(autouse=True)`.

Result: per-test isolation at <5ms overhead per test. ~1.5s total.

### Example 3: refused — `wrap` mode not safe

Input: integration tests that include DDL (`CREATE INDEX
CONCURRENTLY`) which can't run inside a transaction.

Action: agent refuses `wrap` mode; recommends Mode 2 (template DB
restore) instead. Cites the specific test files that contain DDL.

## Refuse-to-proceed rules

The agent **refuses** to:

- Run `restore` against a database with no captured baseline.
  Recommends running `snapshot` first and confirms the baseline is
  what the user expects.
- Run `snapshot` against a database name that does not match the
  expected `${APP}_template` pattern. Prevents accidental capture of
  a production DB.
- Run `restore` against a database whose name does not contain
  `test`, `_test`, or `dev`. Defends against
  `RESTORE production_db FROM template`.
- Run `wrap` mode when DDL is detected in the test files. Cites the
  specific test files; recommends `restore` instead.

## Anti-patterns

| Anti-pattern                                                    | Why it fails                                                              | Fix |
|-----------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Running `db:migrate` between every test                         | Slow (re-runs every migration); risks drift if a migration is non-idempotent. | Snapshot once after migration; restore from template. |
| Using `TRUNCATE` to reset                                        | Doesn't restore seed data or sequence state; misses constraint cycles.   | Template DB clone preserves the full state. |
| Forgetting `pg_terminate_backend` before `DROP DATABASE`        | "database is being accessed by other users" error; flaky restore.         | Boot all connections first (Mode 2 step 1). |
| Sharing one template across parallel CI jobs                     | Concurrent restores fight over the source.                                | One template per parallel worker (`${APP}_template_${WORKER}`); or per-job COMPOSE_PROJECT_NAME. |
| `wrap` mode + test that commits internally                       | The test "succeeds" but state leaks into the next test.                   | Detect `commit()` in test code; require `restore` mode for those. |
| `pg_dump` without `--no-owner --no-privileges`                   | Restore on a different host fails because the original owner doesn't exist. | Always strip owner/privilege metadata when the snapshot is portable. |

## Hand-off targets

- **Container-managed databases** → see
  [`testcontainers`](../skills/testcontainers/SKILL.md) for the per-test
  database container approach (very different from per-test snapshot
  restore: containers are ~5–30s; template restore is ~50–500ms).
- **Compose-managed multi-service stacks** → see
  [`docker-compose-test`](../skills/docker-compose-test/SKILL.md) for
  the surrounding topology. The `migrate` service in Step 3 of that
  skill is the producer of the template state this agent captures.
- **Parallel-isolation symptoms** (DB collisions under `-j N`) → see
  `parallel-isolation-checker` in the `qa-flake-triage` plugin for
  diagnosis before assuming snapshot/restore is the right fix.

## References

- [pg-templates][pg-tpl] — Postgres template DBs, `CREATE DATABASE
  ... TEMPLATE`, `datistemplate` / `datallowconn` columns,
  no-other-sessions constraint.
- [pg-begin][pg-begin] — Postgres `BEGIN` / `ROLLBACK` semantics,
  savepoint-based nested transactions.
- [pg-dump][pg-dump] — `pg_dump -Fc` / `-Fd`, `-j N`, `--no-owner`,
  `--no-privileges`.
- [`testcontainers`](../skills/testcontainers/SKILL.md) — composes
  with Mode 2 / 4 to restore between tests inside a container.
- [`docker-compose-test`](../skills/docker-compose-test/SKILL.md) —
  the migrate-service pattern that produces the template state.
