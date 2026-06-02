---
name: testcontainers
description: "Brings up real backing services (databases, message brokers, browsers, anything dockerizable) as throwaway containers from inside a test process - Java, Node.js, Python, Go, .NET, Ruby and ten other languages - using the Testcontainers library family. Wires the per-test container lifecycle, exposed-port → host-port mapping, wait strategies (port / log / HTTP / SQL), Ryuk-based cleanup, container-to-container networks, and the (experimental) `withReuse` shortcut for local dev. Use when integration tests need a real Postgres / Redis / Kafka / Selenium / etc. and the team wants per-test isolation without hand-rolled docker-compose teardown."
rating: 25
d6: 4
archetype: S1
---

# testcontainers

## Overview

Testcontainers is "a library that provides easy and lightweight APIs
for bootstrapping local development and test dependencies with real
services wrapped in Docker containers" ([tc-getting-started][tc-gs]).
It exists for **Java, Go, .NET, Node.js, Clojure, Elixir, Haskell,
Python, Ruby, Rust, PHP, and Native (C)** ([tc-getting-started][tc-gs]).

[tc-gs]: https://testcontainers.com/getting-started/

The shape is the same in every language:

1. The test process declares the container it needs (image + exposed
   ports + wait strategy + optional env / volumes / network).
2. The library starts the container, waits for it to be ready, and
   maps the exposed port to a **random free host port** so multiple
   tests can run in parallel without port collisions
   ([tc-getting-started][tc-gs]).
3. The test reads `getHost()` + `getMappedPort(<container-port>)` to
   build a connection URL.
4. After the test, the container is destroyed - even on `SIGKILL`.

The cleanup guarantee is enforced by **Ryuk**, a sidecar reaper:
"Testcontainers attaches a set of labels to the created resources
(containers, volumes, networks etc) and Ryuk automatically performs
resource clean up by matching those labels. This works reliably even
when the test process exits abnormally (e.g. sending a SIGKILL)"
([tc-getting-started][tc-gs]).

## When to use

- Integration tests need a **real** Postgres / MySQL / Redis / Kafka /
  MongoDB / Elasticsearch - not a fake or in-memory substitute that
  drifts from production behavior.
- E2E tests need a real Selenium / Playwright browser container.
- A test process must spin up its own dependencies because shared CI
  databases create cross-job interference.
- The team wants a single API surface across Java / Node / Python / Go
  rather than per-language ad-hoc docker scripts.

If the team needs **multiple** related containers wired with their own
network and lifecycle (e.g. app + db + cache), evaluate
[`docker-compose-test`](../docker-compose-test/SKILL.md) first - it
expresses the topology in declarative YAML rather than imperative
test code.

## Step 1 - Pick the language module

| Language    | Package / Coordinate                                 |
|-------------|------------------------------------------------------|
| Java        | `org.testcontainers:testcontainers` (Maven / Gradle) |
| Node.js     | `npm install --save-dev testcontainers`              |
| Python      | `pip install testcontainers[<module>]` (e.g. `[postgres]`) |
| Go          | `go get github.com/testcontainers/testcontainers-go` |
| .NET        | `dotnet add package Testcontainers`                  |

Java requires "a supported JVM testing framework" with
**Jupiter / JUnit 5** as the recommended option ([tc-java][tc-java]).
Python uses an "extras" notation: `pip install testcontainers[postgres]`
installs both the core library and the Postgres module
([tc-python][tc-python]).

[tc-java]: https://java.testcontainers.org/
[tc-python]: https://testcontainers-python.readthedocs.io/en/latest/

## Step 2 - Author the container declaration

### Java (`GenericContainer`)

Per [tc-getting-started][tc-gs]:

```java
GenericContainer container = new GenericContainer("postgres:15")
        .withExposedPorts(5432)
        .waitingFor(new LogMessageWaitStrategy()
            .withRegEx(".*database system is ready to accept connections.*\\s")
            .withTimes(2)
            .withStartupTimeout(Duration.of(60, ChronoUnit.SECONDS)));
container.start();

var jdbcUrl = "jdbc:postgresql://"
            + container.getHost()
            + ":" + container.getMappedPort(5432)
            + "/test";
// ...perform DB operations...
container.stop();
```

The `LogMessageWaitStrategy` example uses `withTimes(2)` because
Postgres logs the "ready to accept connections" line twice during
startup - once for the bootstrap process and once for the listener.

### Node.js (`GenericContainer`)

The `with*` builder API mirrors Java; `.start()` returns a Promise:

```javascript
import { GenericContainer, Wait } from 'testcontainers';

const container = await new GenericContainer('postgres:15')
  .withExposedPorts(5432)
  .withEnvironment({ POSTGRES_PASSWORD: 'test' })
  .withWaitStrategy(Wait.forLogMessage(/database system is ready/, 2))
  .start();

const url = `postgresql://postgres:test@${container.getHost()}:${container.getMappedPort(5432)}/postgres`;
// ...
await container.stop();
```

### Python (context manager, preferred)

Per [tc-python][tc-python]:

```python
from testcontainers.postgres import PostgresContainer
import sqlalchemy

with PostgresContainer("postgres:16") as postgres:
    psql_url = postgres.get_connection_url()
    engine = sqlalchemy.create_engine(psql_url)
    # ...
```

The `with`-statement guarantees `stop()` runs on exit - including on
exception. Prefer the per-service modules (`PostgresContainer`,
`MySqlContainer`, `KafkaContainer`) over raw `DockerContainer` when
they exist; they ship sensible defaults and a typed connection-URL
helper.

### Go (`testcontainers.Run`)

Per [tc-go-quickstart][tc-go-q]:

```go
redisC, err := testcontainers.Run(
    ctx, "redis:latest",
    testcontainers.WithExposedPorts("6379/tcp"),
    testcontainers.WithWaitStrategy(
        wait.ForListeningPort("6379/tcp"),
        wait.ForLog("Ready to accept connections"),
    ),
)
testcontainers.CleanupContainer(t, redisC)
```

[tc-go-q]: https://golang.testcontainers.org/quickstart/

`testcontainers.CleanupContainer(t, redisC)` ties container teardown
to `t.Cleanup` and **handles a nil container so it can be called
before the error check** - important for the common
`if err != nil { t.Fatal(err) }` pattern.

## Step 3 - Choose a wait strategy

Per [tc-go-quickstart][tc-go-q], the canonical wait strategies are:
**Exec, Exit, File, Health, HostPort, HTTP, Log, Multi, SQL, TLS,
Walk**. Match the strategy to the container:

| Container          | Recommended wait                                           |
|--------------------|------------------------------------------------------------|
| Postgres / MySQL   | `Log` (DB-specific "ready" line) **+** retry SQL ping       |
| Redis              | `Log("Ready to accept connections")` or `HostPort`          |
| HTTP service       | `HTTP` GET on a known endpoint with expected status         |
| Kafka              | `Log` (boot complete) + `HostPort` for the broker           |
| Anything Docker-healthchecked | `Health` (delegates to Docker `HEALTHCHECK`)      |

Avoid bare `Thread.sleep` / `setTimeout` - the test becomes flaky
under load and slow when the dependency is fast.

## Step 4 - Wire the test framework

### Java + JUnit 5

Per [tc-junit5][tc-junit5], two annotations drive the lifecycle:

[tc-junit5]: https://java.testcontainers.org/test_framework_integration/junit_5/

- **`@Testcontainers`** on the test class enables the Jupiter
  extension.
- **`@Container`** on a field declares a container for lifecycle
  management.

Static vs instance fields control scope:

> "Static Fields (Shared) ... will be started only once before any
> test method is executed and stopped after the last test method has
> executed."
>
> "Instance Fields (Restarted) ... will be started and stopped for
> every test method." ([tc-junit5][tc-junit5])

```java
@Testcontainers
class ProfileRepositoryIT {

    @Container
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:15");

    @Test
    void findsProfileByEmail() {
        // pg.getJdbcUrl() / pg.getUsername() / pg.getPassword() ready
    }
}
```

> "This extension has only been tested with sequential test
> execution. Using it with parallel test execution is unsupported
> and may have unintended side effects." ([tc-junit5][tc-junit5])

If JUnit's parallel execution is enabled, scope each test class to
its own container (instance field) and disable parallelism within a
class.

### Node.js + Vitest / Jest

```javascript
import { GenericContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, test } from 'vitest';

let container;
let connectionUrl;

beforeAll(async () => {
  container = await new GenericContainer('postgres:15')
    .withExposedPorts(5432)
    .withEnvironment({ POSTGRES_PASSWORD: 'test' })
    .start();
  connectionUrl = `postgresql://postgres:test@${container.getHost()}:${container.getMappedPort(5432)}/postgres`;
}, 120_000);

afterAll(async () => {
  await container?.stop();
});

describe('profile repo', () => {
  test('findsProfileByEmail', async () => { /* ... */ });
});
```

Set the test framework's per-hook timeout high enough to cover
container start (120s is usually safe in CI; faster locally).

### Python + pytest

The cleanest pytest integration is a session-scoped fixture wrapping
the context manager:

```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope='session')
def pg_url():
    with PostgresContainer('postgres:16') as pg:
        yield pg.get_connection_url()
```

`scope='session'` matches Java's static-field semantics: one
container per test session.

## Step 5 - Wire multiple containers via networks

Per [tc-networking][tc-net], "Network aliases are the preferred
option for container communication on the same network":

[tc-net]: https://node.testcontainers.org/features/networking/

```javascript
import { Network, GenericContainer } from 'testcontainers';

const network = await new Network().start();

const db = await new GenericContainer('postgres:15')
  .withNetwork(network)
  .withNetworkAliases('db')
  .withEnvironment({ POSTGRES_PASSWORD: 'test' })
  .start();

const app = await new GenericContainer('my-app:test')
  .withNetwork(network)
  .withEnvironment({ DATABASE_URL: 'postgresql://postgres:test@db:5432/postgres' })
  .start();

// ...later...
await app.stop();
await db.stop();
await network.stop();
```

Inside `app`, the hostname `db` resolves via Docker's embedded DNS to
the `db` container's network IP - **no port mapping involved**, since
both containers sit on the same Docker network.

For accessing **host-side** services from inside a container, use
`TestContainers.exposeHostPorts(...)` and connect to
`host.testcontainers.internal:<port>` ([tc-networking][tc-net]).

## Step 6 - (Optional) Reuse for fast local iteration

Per [tc-reuse][tc-reuse], reuse keeps a container alive across test
runs when its configuration is unchanged. Enable globally:

[tc-reuse]: https://java.testcontainers.org/features/reuse/

- Env var: `TESTCONTAINERS_REUSE_ENABLE=true`
- Or in `~/.testcontainers.properties`: `testcontainers.reuse.enable=true`

Then mark the container reusable:

```java
GenericContainer container = new GenericContainer("redis:6-alpine")
    .withExposedPorts(6379)
    .withReuse(true);
container.start();
// Do NOT call stop() — the container persists for the next run
```

> "Reusable containers are not suited for CI usage and as an
> experimental feature not all Testcontainers features are fully
> working (e.g., resource cleanup or networking)." ([tc-reuse][tc-reuse])

Pattern: enable reuse only via `~/.testcontainers.properties` on the
developer's machine; never set the env var in CI.

## CI integration

Two requirements:

1. **A Docker daemon reachable from the runner.** GitHub Actions
   `ubuntu-*` images ship Docker; for self-hosted runners, install
   Docker and grant the runner user access to `/var/run/docker.sock`.
2. **Pull-image timeout headroom.** The first run downloads the image;
   set a generous per-test timeout (>=120s) for that path.

```yaml
# .github/workflows/integration.yml
name: integration
on:
  pull_request:
  push:
    branches: [main]
jobs:
  it:
    runs-on: ubuntu-latest
    services:
      # No need to declare DB here — Testcontainers manages it from inside the test process.
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - run: ./mvnw -B verify
```

Per the JUnit-5 caveat above, do not enable `surefire.parallel` or
`forkCount > 1` while running container-backed tests with shared
static `@Container` fields.

## Anti-patterns

| Anti-pattern                                                   | Why it fails                                                                | Fix |
|----------------------------------------------------------------|-----------------------------------------------------------------------------|-----|
| `Thread.sleep(5000)` instead of a wait strategy                | Flaky on slow CI; slow on fast local - and the right value drifts.          | Use `LogMessageWaitStrategy` / `HttpWaitStrategy` / language equivalent. |
| Hard-coded host port (`localhost:5432`) inside test code       | Two parallel test classes collide on the same port.                         | Always use `getHost() + getMappedPort(<container-port>)`. |
| Calling `stop()` while `withReuse(true)`                       | Defeats the reuse mechanism on the next run.                                | Don't call `stop()` for reusable containers; let Ryuk-skipped reuse persist them. |
| Setting `TESTCONTAINERS_REUSE_ENABLE=true` in CI               | Per [tc-reuse][tc-reuse], reuse is "not suited for CI usage".               | Enable only via `~/.testcontainers.properties` on dev machines. |
| Running `surefire.parallel = methods` + static `@Container`    | The shared container sees concurrent state from multiple test methods; flaky. | Either instance fields (one container per test) or disable parallel methods. |
| Treating Postgres "ready" log line as the only signal          | The log line fires once during init and once when the listener binds - assertions before binding fail. | The example uses `withTimes(2)` - match the count to the container's actual log behavior. |
| One giant network shared across unrelated test classes         | Cleanup races on the network when both classes finish around the same time.  | One `Network()` per test class or per session; explicit `network.stop()` after dependents. |

## Limitations

- **Requires a Docker daemon.** Sandboxes that ban Docker (some CI
  runners; some sandboxed dev environments) cannot run Testcontainers.
  Cloud alternatives (Testcontainers Cloud, GitHub Actions
  Docker-in-Docker) exist but add a network hop.
- **Image-pull cold start.** First-run latency on a clean cache is
  often 30 - 90s for a multi-100 MB image. Pre-pull the image in a CI
  warm-up job.
- **Per-language module gaps.** Some niche dependencies have a Java
  module but no Node / Python module; fall back to `GenericContainer`
  + manual wait strategy + manual connection-URL construction.
- **Java JUnit-5 parallel execution unsupported** ([tc-junit5][tc-junit5]).
- **Reuse is local-only and experimental** ([tc-reuse][tc-reuse]).

## References

- [tc-gs][tc-gs] - definition, supported languages, lifecycle, Ryuk
  cleanup, port mapping, network aliases.
- [tc-java][tc-java] - Java module overview, Maven coordinate, JUnit
  5 prerequisite.
- [tc-junit5][tc-junit5] - `@Testcontainers` / `@Container`, static
  vs instance, parallel-execution caveat.
- [tc-reuse][tc-reuse] - `withReuse(true)`, env var, properties file,
  CI caveats.
- [tc-python][tc-python] - context-manager pattern, extras-based
  install, per-service modules.
- [tc-go-q][tc-go-q] - `testcontainers.Run`, `CleanupContainer`,
  wait-strategy catalog.
- [tc-net][tc-net] - `Network`, `withNetwork`, `withNetworkAliases`,
  `host.testcontainers.internal`.
- [`docker-compose-test`](../docker-compose-test/SKILL.md) - 
  alternative when the topology is multi-service and best expressed
  declaratively.
- [`db-snapshot-restore`](../../agents/db-snapshot-restore.md) - 
  composes with Testcontainers-managed databases for per-test
  isolation.
