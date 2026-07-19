---
name: docker-compose-test
description: "Authors a `compose.test.yaml` for tests - declares the SUT plus its real backing services as one declarative topology, wires healthcheck-driven `depends_on: condition: service_healthy` start ordering, isolates parallel CI jobs via per-job `--project-name`, gates the test step on `--wait` / `--wait-timeout` / `--exit-code-from`, and tears the stack down deterministically with `down --volumes --remove-orphans`. Use when the test environment is multi-service (app + db + cache + queue) and the topology is best expressed in YAML rather than imperative test code."
---

# docker-compose-test

## Overview

Docker Compose is "a tool for defining and running multi-container
applications" - services, networks, and volumes declared "in a single
YAML configuration file" and managed "with a single command"
([compose-overview][compose]).

[compose]: https://docs.docker.com/compose/

For tests, Compose is the right choice when:

- The SUT needs **two or more** real backing services that have to
  see each other (app → db → cache → queue) - the topology is the
  artifact.
- The same definition must run locally **and** in CI without
  imperative drift.
- A team wants per-job isolation in CI without booking dedicated
  ports / databases.

When the test process only needs **one** dependency wired into a
single test, [`testcontainers`](../testcontainers/SKILL.md) is the
lighter option - it lives inside the test process and doesn't need
a separate `docker compose up` step.

## When to use

- The SUT has 2+ runtime dependencies and the team already runs them
  via Docker locally.
- A CI pipeline needs to spin up the same topology per-job, not share
  one test database across PRs.
- An end-to-end test suite (Playwright, Cypress, native E2E) needs a
  full stack reachable on a network.

## Step 1 - Author `compose.test.yaml`

Compose's default file lookup is `compose.yaml` or `docker-compose.yaml`
in the working directory or any parent ([compose-cli][cli]); using
the explicit `compose.test.yaml` filename + `-f` flag keeps test
topology separate from local-dev topology.

[cli]: https://docs.docker.com/reference/cli/docker/compose/

```yaml
# compose.test.yaml
name: orders-tests

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: orders_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d orders_test"]
      interval: 2s
      timeout: 3s
      retries: 30
      start_period: 5s

  cache:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 30

  app:
    build:
      context: .
      target: test
    environment:
      DATABASE_URL: postgres://postgres:test@db:5432/orders_test
      REDIS_URL: redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 2s
      timeout: 3s
      retries: 30
      start_period: 10s

  e2e:
    image: mcr.microsoft.com/playwright:v1.50.0-noble
    working_dir: /work
    volumes:
      - .:/work
    environment:
      BASE_URL: http://app:3000
    depends_on:
      app:
        condition: service_healthy
    command: npx playwright test
```

The `name:` top-level key sets the project name (which Compose
normally derives from the working directory) - important for CI
isolation, see Step 4.

## Step 2 - Healthchecks are load-bearing

Per [compose-services][compose-svc], `depends_on` accepts three
conditions:

[compose-svc]: https://docs.docker.com/reference/compose-file/services/

| Condition                      | Meaning                                                               |
|--------------------------------|------------------------------------------------------------------------|
| `service_started`              | Container has been created and started (default - usually wrong for tests). |
| `service_healthy`              | Dependency's `healthcheck` succeeded - the right choice for DBs / queues / app. |
| `service_completed_successfully` | Dependency ran to completion and exited 0 - for one-shot init / migration containers. |

**`service_started` is almost never what a test wants.** Postgres
"started" doesn't mean "accepting connections". Always pair a real
dependency with a `healthcheck` and a `service_healthy` gate.

The `healthcheck` syntax per [compose-services][compose-svc]:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost"]
  interval: 1m30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

For tests, use **shorter** intervals (2s vs the 1m30s default) and
**more retries** so the gate trips quickly when the service is up
but waits long enough for cold starts.

## Step 3 - Migrations as one-shot dependencies

Database migrations belong in their own service that the app
`depends_on` with `service_completed_successfully`:

```yaml
services:
  db:
    image: postgres:15
    healthcheck: { test: ["CMD-SHELL", "pg_isready"], interval: 2s, retries: 30 }

  migrate:
    image: orders-app:test
    command: npm run db:migrate
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:test@db:5432/orders_test

  app:
    image: orders-app:test
    depends_on:
      db: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
    environment:
      DATABASE_URL: postgres://postgres:test@db:5432/orders_test
```

The chain - db healthy → migrate runs → migrate exits 0 → app starts - 
ensures the app never connects to an unmigrated database.

## Step 4 - Per-job isolation in CI

Per [compose-cli][cli], the project name controls the namespace of
**every** resource Compose creates (containers, networks, volumes).
Two parallel jobs that use the same project name fight each other.

Set the project name from a unique-per-job value:

```yaml
# .github/workflows/integration.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    env:
      COMPOSE_PROJECT_NAME: orders-${{ github.run_id }}-${{ matrix.shard }}
    steps:
      - uses: actions/checkout@v5
      - name: Compose up
        run: docker compose -f compose.test.yaml up --build --wait --wait-timeout 180
      - name: Run tests
        run: docker compose -f compose.test.yaml run --rm e2e
      - name: Compose down
        if: always()
        run: docker compose -f compose.test.yaml down --volumes --remove-orphans
```

Per [compose-cli][cli], `-p` / `--project-name` resolution order is:
**flag > `COMPOSE_PROJECT_NAME` env var > top-level `name:` > directory
basename**. Using the env var keeps the YAML clean while overriding
the in-file `name:` per CI job.

> "Project names must contain only lowercase letters, decimal digits,
> dashes, and underscores, and must begin with a lowercase letter or
> decimal digit." ([compose-cli][cli])

## Step 5 - Gate the test step on readiness

Per [compose-up][up], two flags pair for "block until everything is
healthy":

[up]: https://docs.docker.com/reference/cli/docker/compose/up/

| Flag                             | Effect                                                           |
|----------------------------------|------------------------------------------------------------------|
| `--wait`                         | "Wait for services to be running\|healthy. Implies detached mode." |
| `--wait-timeout <seconds>`       | "Maximum duration in seconds to wait for the project to be running\|healthy" |
| `--abort-on-container-exit`      | "Stops all containers if any container was stopped." (Foreground.) |
| `--abort-on-container-failure`   | "Stops all containers if any container exited with failure."      |
| `--exit-code-from <service>`     | "Return the exit code of the selected service container. Implies `--abort-on-container-exit`." |

Two valid CI shapes:

### Shape A - `up --wait` then `run` the test service

```bash
docker compose -f compose.test.yaml up --build --wait --wait-timeout 180
docker compose -f compose.test.yaml run --rm e2e
EXIT=$?
docker compose -f compose.test.yaml down --volumes --remove-orphans
exit $EXIT
```

The `up --wait` step blocks until every service is healthy or the
180s budget elapses. The `run` step executes the test container; its
exit code is the build verdict.

### Shape B - `up --abort-on-container-exit --exit-code-from <test-service>`

```bash
docker compose -f compose.test.yaml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from e2e
```

Compose returns the test container's exit code as its own. Cleaner
when the test runs as a Compose service rather than via `run`.

## Step 6 - Tear down deterministically

Per [compose-cli][cli], `down` "Stop[s] and remove[s] containers,
networks". For tests, two flags matter:

| Flag                | Effect                                                                    |
|---------------------|---------------------------------------------------------------------------|
| `--volumes` / `-v`  | Remove named volumes declared in the compose file. Without this, DB state persists across runs and the next run sees stale data. |
| `--remove-orphans`  | Remove containers for services not defined in the current file. Defends against renamed services leaving stragglers. |

```bash
docker compose -f compose.test.yaml down --volumes --remove-orphans
```

Always run `down` in an `if: always()` step (GitHub Actions) or
trap-on-EXIT (shell) - leaked containers consume CI runner disk and
poison the next run.

## Step 7 - Profiles for selective enablement

When the test compose file has services that aren't always needed
(seeded fixtures, a debugging admin UI, a heavyweight observability
stack), gate them behind a profile per [compose-cli][cli]:

```yaml
services:
  db: { image: postgres:15, healthcheck: { ... } }

  pgadmin:
    image: dpage/pgadmin4
    profiles: [debug]
    ports: ["5050:80"]
    depends_on: { db: { condition: service_healthy } }
```

Run with the profile when needed:

```bash
docker compose -f compose.test.yaml --profile debug up
# or via env:
COMPOSE_PROFILES=debug docker compose -f compose.test.yaml up
```

Per [compose-cli][cli]: "Specify a profile to enable" - multiple
profiles via repeating `--profile` or comma-separated
`COMPOSE_PROFILES`.

## Anti-patterns

| Anti-pattern                                                           | Why it fails                                                                  | Fix |
|------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| `depends_on: db` without `condition: service_healthy`                  | Default `service_started` means "container exists" - Postgres isn't ready; app crashes on first connection. | Add a `healthcheck` to the dependency and gate with `condition: service_healthy`. |
| Sharing one project name across parallel CI jobs                       | Two jobs pick the same container/network names; one accidentally tears down the other's state. | `COMPOSE_PROJECT_NAME=<unique-per-job>` ([compose-cli][cli]). |
| `down` without `--volumes`                                             | DB state carries over to the next run; tests pass on dirty state, fail on clean state. | Always `down --volumes --remove-orphans` in `if: always()`. |
| `up` foreground in CI without `--abort-on-container-exit`              | The test container exits but Compose keeps the others running; the job hangs until timeout. | `--abort-on-container-exit --exit-code-from <test-svc>`, or `up --wait` then explicit `run --rm`. |
| Running migrations from inside `app`'s entrypoint                      | App and migrations race on cold start; intermittent connection-refused.        | Separate `migrate` service with `service_completed_successfully` gate (Step 3). |
| Mounting host source into the test app via `volumes:` in CI            | CI source tree and image both write to the same path; build artifacts pollute the workspace. | Use bind mounts only for local-dev compose; tests run against the built image. |
| Reusing the local-dev compose.yaml for tests                           | Test topology grows hidden coupling to the dev convenience services.          | Separate `compose.test.yaml`; `-f compose.test.yaml` everywhere. |
| Hard-coded host ports (`ports: ["5432:5432"]`) in the test compose      | Two parallel jobs collide on the host port.                                    | Don't expose ports on the host in CI; rely on the Compose network for in-stack reachability. |

## Limitations

- **Compose is not a scheduler.** It runs on one Docker daemon. For
  multi-host or k8s-shaped tests, use the orchestrator's native test
  primitive (kind, k3d, helm test) instead.
- **No native parallelism within one project.** Compose runs services
  in topological order; "parallel" tests come from running multiple
  Compose projects per CI matrix shard.
- **Healthcheck images need the probe binary.** Minimal/distroless
  images often don't ship `curl` / `pg_isready` - either switch to a
  slim variant or use a TCP probe via `nc` / `wget`.
- **Per-test reset is coarse.** The Compose stack is per-suite; for
  per-test DB reset, layer a snapshot/restore step on
  top.

## References

- [compose-overview][compose] - overview, "tool for defining and
  running multi-container applications".
- [compose-cli][cli] - `docker compose` subcommand list, `-f`,
  `--project-name`, `--profile`, project-name resolution rules.
- [compose-up][up] - `up` flags: `--wait`, `--wait-timeout`,
  `--abort-on-container-exit`, `--exit-code-from`, `--build`.
- [compose-svc][compose-svc] - `services` schema: `healthcheck`,
  `depends_on` conditions (`service_started` / `service_healthy` /
  `service_completed_successfully`).
- [`testcontainers`](../testcontainers/SKILL.md) - alternative when
  the topology is one container per test, expressed in test code.
