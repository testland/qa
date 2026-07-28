# Flyway command reference and CI integration

## Command reference

Per [fw-home], Flyway's commands are Migrate, Clean, Info, Validate, Undo,
Baseline, Repair, Check, and Snapshot.

| Command | Use |
|---|---|
| `flyway migrate` | Apply pending migrations |
| `flyway info` | Show applied + pending migration list |
| `flyway validate` | Verify checksums of applied migrations vs disk files |
| `flyway baseline` | Mark a legacy schema state as baseline (skip prior migrations) |
| `flyway repair` | Fix a broken `flyway_schema_history` (e.g., after a failed migration) |
| `flyway undo` | Roll back the last versioned migration (Teams) |
| `flyway clean` | **Drop all objects** in the schema (production-disabled by default) |

[fw-home]: https://documentation.red-gate.com/fd/flyway-documentation-138346877.html

## CI integration

Pattern: ephemeral DB (Docker / Testcontainers) per PR, apply migrations,
run tests against the migrated schema.

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
plugin): spin up the DB via Testcontainers, then call `Flyway.configure()`
in JUnit `@BeforeAll`.
