---
name: gatling-load-testing
description: "Authors Gatling simulations in Java / Kotlin / Scala (or JS / TS) using the Simulation class plus http() / scenario() / exec() DSL builders, ramps virtual users via injectOpen (arrival rate) or injectClosed (concurrent count), runs via Maven / Gradle / sbt with the Gatling plugin, and gates CI on assertions defined in setUp(). Use when the project is on the JVM and the team prefers code-first load tests over JMeter's XML or k6's JavaScript-only authoring."
---

# gatling-load-testing

[readme]: https://github.com/gatling/gatling
[tutorial]: https://docs.gatling.io/tutorials/scripting-intro/

Gatling tests are **Simulation classes** in Java / Kotlin / Scala /
JS / TS that compose `http()` / `scenario()` / `exec()` DSL builders
and run via the Gatling Maven / Gradle / sbt plugin (per
[gatling-tutorial][tutorial]). Supported protocols span HTTP,
WebSocket, Server-Sent Events, JMS, gRPC, and MQTT
([gatling-readme][readme]).

## When to use

- The team is on the JVM and wants type-safe code-first load tests
  (vs. JMeter's XML or k6's JS).
- The project needs **non-HTTP** protocols (WebSocket, JMS, gRPC,
  MQTT) - Gatling's first-party support is broader than k6's.
- A team value is **scenario expressiveness** - Gatling's DSL
  composes naturally for multi-step user journeys with shared state.
- The project already uses Maven / Gradle / sbt; the Gatling plugin
  integrates cleanly.

For pure HTTP load testing on a non-JVM stack, prefer
`k6-load-testing` (JavaScript) or
`locust-load-testing` (Python).

## Install

The current version + matching plugin is documented at
[`docs.gatling.io`](https://docs.gatling.io/) - pin to a specific
release rather than `LATEST`. The minimum dependencies for a Maven
project are the Gatling Maven plugin (build) plus
`gatling-charts-highcharts` (test scope, for HTML report generation).

For Gradle / sbt setups, the equivalent plugins are
`gatling-gradle-plugin` and `sbt-gatling`. See
[gatling-tutorial][tutorial] for the canonical project-init flow.

## Authoring

### Simulation class structure

Per [gatling-tutorial][tutorial], every Gatling test extends
`Simulation` and uses three DSL builders:

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

### Open workload - `injectOpen`

New users **arrive continuously** during the test window. Use when
modeling realistic traffic that doesn't depend on user response time.

```java
ordersScenario.injectOpen(
  nothingFor(Duration.ofSeconds(5)),                        // warmup grace
  rampUsersPerSec(1).to(50).during(Duration.ofMinutes(1)),  // ramp to 50 RPS over 1 min
  constantUsersPerSec(50).during(Duration.ofMinutes(5))     // hold 50 RPS for 5 min
)
```

### Closed workload - `injectClosed`

A **fixed pool** of users repeats actions. Use when modeling
sessions / connection-pool behavior where total concurrency matters
more than arrival rate.

```java
ordersScenario.injectClosed(
  rampConcurrentUsers(0).to(100).during(Duration.ofMinutes(1)),
  constantConcurrentUsers(100).during(Duration.ofMinutes(5))
)
```

Most public APIs are Open; session-bound systems (databases, video
streams) are Closed.

## Assertions

Per [gatling-tutorial][tutorial], `setUp().assertions(...)` defines
the CI gate criteria. Every assertion is a chain of selectors:

| Selector                                                   | What it asserts                          |
|------------------------------------------------------------|------------------------------------------|
| `global().responseTime().percentile(95).lt(500)`            | Global p95 response time < 500 ms.       |
| `global().failedRequests().percent().lt(1.0)`               | < 1% of requests failed globally.        |
| `details("Create order").requestsPerSec().gte(20)`           | Specific request name throughput.        |
| `forAll().responseTime().mean().lt(300)`                     | Mean across every named request < 300ms. |

Failed assertions cause Gatling to exit non-zero - the canonical CI
gate.

## Running

### Maven

```bash
mvn gatling:test                                                # runs all simulations
mvn gatling:test -Dgatling.simulationClass=com.example.load.OrdersSimulation
```

The plugin places HTML reports under `target/gatling/<simulation>-<timestamp>/`.

### Gradle

```bash
./gradlew gatlingRun                                            # runs all
./gradlew gatlingRun-com.example.load.OrdersSimulation          # runs one
```

### sbt (Scala)

```bash
sbt 'Gatling/test'
```

## Reports

Per [gatling-readme][readme], each run produces an HTML report under
`<output>/<simulation>-<timestamp>/index.html` with:

- Per-request response-time distributions and percentiles.
- Throughput timeline.
- Active-users-over-time chart.
- Pass/fail status per assertion.

For machine-readable output, parse `<output>/.../js/stats.json` - 
contains the same data the HTML report renders.

## CI integration

Full GitHub Actions workflow (PR + nightly, report uploaded via
`if: always()`) in
[references/ci-integration.md](references/ci-integration.md). A failed
assertion exits the Maven build non-zero.

## Anti-patterns

See [references/anti-patterns.md](references/anti-patterns.md): wrong
injection model for the traffic, hardcoded URLs/tokens, missing
`pause()`, asserting only `failedRequests`, synthetic spikes, and
per-iteration re-authentication.

## Limitations

- **JVM only** for native execution. JS / TS / Kotlin DSL are
  available but compile down to JVM bytecode under the hood.
- **Per-machine VU limits.** A single Gatling instance saturates one
  machine's outbound capacity; for higher loads, distribute via the
  open-source distributed mode or use Gatling Enterprise.
- **DSL learning curve.** Compared to k6's JavaScript, the
  Simulation class shape and instance-initializer block are
  unfamiliar to JS developers.

## References

- [gatling-readme][readme] - main repo: positioning, language
  support, supported protocols.
- [gatling-tutorial][tutorial] - DSL primitives: Simulation class,
  http() / scenario() / exec(), injectOpen vs injectClosed,
  setUp().assertions().
- `k6-load-testing`,
  `jmeter-load-testing`,
  `locust-load-testing` - 
  alternatives by stack.
- `perf-budget-gate` - downstream
  gate that aggregates load-runner verdicts with frontend perf
  metrics.
