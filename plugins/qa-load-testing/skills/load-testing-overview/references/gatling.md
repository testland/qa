# Gatling deep dive

[readme]: https://github.com/gatling/gatling
[tutorial]: https://docs.gatling.io/tutorials/scripting-intro/

Gatling tests are **Simulation classes** in Java / Kotlin / Scala / JS / TS
that compose `http()` / `scenario()` / `exec()` DSL builders and run via the
Gatling Maven / Gradle / sbt plugin (per [gatling-tutorial][tutorial]).
Supported protocols span HTTP, WebSocket, Server-Sent Events, JMS, gRPC, and
MQTT ([gatling-readme][readme]).

## Install

The current version + matching plugin is documented at
[`docs.gatling.io`](https://docs.gatling.io/) - pin to a specific release
rather than `LATEST`. Minimum Maven dependencies: the Gatling Maven plugin
(build) plus `gatling-charts-highcharts` (test scope, for HTML report
generation). For Gradle / sbt, the equivalents are `gatling-gradle-plugin` and
`sbt-gatling`. See [gatling-tutorial][tutorial] for the canonical
project-init flow.

## Simulation class structure

Per [gatling-tutorial][tutorial], every Gatling test extends `Simulation` and
uses three DSL builders:

| Builder        | Purpose                                                          |
|----------------|------------------------------------------------------------------|
| `http(...)`    | HTTP protocol config: base URL, default headers, share-connection settings. |
| `scenario(...)`| A named sequence of user actions.                                 |
| `exec(...)`    | Executes one request or a chain of actions within a scenario.    |

Java example:

```java
package com.example.load;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class OrdersSimulation extends Simulation {

  HttpProtocolBuilder httpProtocol = http
    .baseUrl("https://staging.example.com")
    .acceptHeader("application/json")
    .header("Authorization", "Bearer " + System.getenv("API_TOKEN"));

  ScenarioBuilder ordersScenario = scenario("Order lifecycle")
    .exec(
      http("Create order")
        .post("/orders")
        .body(StringBody("{\"sku\":\"SKU-1\",\"qty\":2}"))
        .check(status().is(201))
        .check(jsonPath("$.order_id").saveAs("orderId"))
    )
    .pause(1)
    .exec(
      http("Read order")
        .get("/orders/#{orderId}")
        .check(status().is(200))
    );

  {
    setUp(
      ordersScenario.injectOpen(
        rampUsersPerSec(1).to(20).during(Duration.ofMinutes(1)),
        constantUsersPerSec(20).during(Duration.ofMinutes(2))
      )
    )
    .protocols(httpProtocol)
    .assertions(
      global().responseTime().percentile(95).lt(500),
      global().failedRequests().percent().lt(1.0)
    );
  }
}
```

(Adapted from [gatling-tutorial][tutorial] DSL primitives.)

## Injection profiles

Per [gatling-tutorial][tutorial]:

**Open workload - `injectOpen`.** New users arrive continuously during the
test window. Use when modeling realistic traffic that doesn't depend on user
response time.

```java
ordersScenario.injectOpen(
  nothingFor(Duration.ofSeconds(5)),                        // warmup grace
  rampUsersPerSec(1).to(50).during(Duration.ofMinutes(1)),  // ramp to 50 RPS over 1 min
  constantUsersPerSec(50).during(Duration.ofMinutes(5))     // hold 50 RPS for 5 min
)
```

**Closed workload - `injectClosed`.** A fixed pool of users repeats actions.
Use when modeling sessions / connection-pool behavior where total concurrency
matters more than arrival rate.

```java
ordersScenario.injectClosed(
  rampConcurrentUsers(0).to(100).during(Duration.ofMinutes(1)),
  constantConcurrentUsers(100).during(Duration.ofMinutes(5))
)
```

Most public APIs are Open; session-bound systems (databases, video streams)
are Closed.

## Assertions

Per [gatling-tutorial][tutorial], `setUp().assertions(...)` defines the CI
gate criteria. Every assertion is a chain of selectors:

| Selector                                                   | What it asserts                          |
|------------------------------------------------------------|------------------------------------------|
| `global().responseTime().percentile(95).lt(500)`            | Global p95 response time < 500 ms.       |
| `global().failedRequests().percent().lt(1.0)`               | < 1% of requests failed globally.        |
| `details("Create order").requestsPerSec().gte(20)`           | Specific request name throughput.        |
| `forAll().responseTime().mean().lt(300)`                     | Mean across every named request < 300ms. |

Failed assertions cause Gatling to exit non-zero - the canonical CI gate.

## Running

```bash
mvn gatling:test                                                # Maven: all simulations
mvn gatling:test -Dgatling.simulationClass=com.example.load.OrdersSimulation
./gradlew gatlingRun                                            # Gradle: all
./gradlew gatlingRun-com.example.load.OrdersSimulation          # Gradle: one
sbt 'Gatling/test'                                              # sbt (Scala)
```

The Maven plugin places HTML reports under
`target/gatling/<simulation>-<timestamp>/`.

## Reports

Per [gatling-readme][readme], each run produces an HTML report under
`<output>/<simulation>-<timestamp>/index.html` with per-request response-time
distributions and percentiles, a throughput timeline, an
active-users-over-time chart, and pass/fail status per assertion. For
machine-readable output, parse `<output>/.../js/stats.json` - it contains the
same data the HTML report renders.

## CI integration

A GitHub Actions workflow that runs the Gatling Maven build on pull requests
touching simulation files and on a nightly schedule. A failed
`setUp().assertions(...)` exits the Maven build non-zero and fails the job;
the HTML report is uploaded regardless via `if: always()`.

```yaml
# .github/workflows/gatling.yml
name: load-test

on:
  pull_request:
    paths: ['src/test/java/**/*Simulation.java']
  schedule:
    - cron: '0 4 * * *'

jobs:
  gatling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Run Gatling
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: mvn -B gatling:test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gatling-report
          path: target/gatling/
          retention-days: 14
```

For Gradle, swap the run step for `./gradlew gatlingRun`; for sbt,
`sbt 'Gatling/test'`.

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                    | Fix |
|---------------------------------------------------------------|------------------------------------------------------------------|-----|
| Using `injectClosed` for an open-traffic API                   | Models the wrong system; results don't predict prod behavior.   | Match the workload model: open API -> `injectOpen`; session-bound -> `injectClosed`. |
| Hardcoded URLs / tokens in the Simulation                      | Tests bind to one environment.                                   | `System.getenv("API_BASE_URL")` + `System.getenv("API_TOKEN")`. |
| Missing `pause()` between requests                             | Hammering at full rate doesn't model real users.                | `pause(1)` or `pause(Duration.ofSeconds(1), Duration.ofSeconds(3))` for randomized think time. |
| Asserting only `failedRequests`                                | A 30-second response that succeeds passes the gate but breaks UX. | Always pair with percentile latency assertions. |
| Open-workload with `rampUsersPerSec(0).to(1000)` over 10s      | Synthetic spike; not realistic; client-side bottlenecks corrupt metrics. | Realistic warm-up then sustained load; spike tests are a separate scenario. |
| Saving auth-token discovery inside the scenario                | Each VU re-authenticates on every iteration; auth endpoint becomes the bottleneck. | Authenticate once in `before { ... }` block; share the token across the whole simulation. |

## Limitations

- **JVM only** for native execution. JS / TS / Kotlin DSL are available but
  compile down to JVM bytecode under the hood.
- **Per-machine VU limits.** A single Gatling instance saturates one machine's
  outbound capacity; for higher loads, distribute via the open-source
  distributed mode or use Gatling Enterprise.
- **DSL learning curve.** Compared to k6's JavaScript, the Simulation class
  shape and instance-initializer block are unfamiliar to JS developers.

## References

- [gatling-readme][readme] - main repo: positioning, language support,
  supported protocols.
- [gatling-tutorial][tutorial] - DSL primitives: Simulation class,
  http() / scenario() / exec(), injectOpen vs injectClosed,
  setUp().assertions().
