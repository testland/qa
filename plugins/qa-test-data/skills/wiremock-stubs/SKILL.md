---
name: wiremock-stubs
description: "Authors WireMock stub mappings for HTTP service mocking - `stubFor` with verb/path/header matchers + `willReturn` response shaping, lifecycle via `WireMockServer` (start / stop) or JUnit `WireMockExtension`, request verification via `verify()`, and dynamic-port allocation for parallel tests. Use when the project is JVM-based and tests need to mock HTTP dependencies (third-party APIs, internal microservices) at the network layer."
---

# wiremock-stubs

## Overview

WireMock is a flexible HTTP mock server that runs in-process or
standalone, supporting stub-mapping authoring (canned responses
keyed by request match) plus request recording / verification
([wiremock-quickstart][quickstart]).

[quickstart]: https://wiremock.org/docs/quickstart/java-junit/

This skill covers the JVM Java API. WireMock also has standalone
JAR + Docker modes for non-JVM consumers - the matching skill for
JS / TS is [`msw-handlers`](../msw-handlers/SKILL.md).

## When to use

- The project is JVM-based (Java / Kotlin / Scala) and tests need
  to mock HTTP dependencies.
- Integration tests must run without the real upstream (third-party
  API rate limits, billing, flaky network).
- The team needs **request recording** - WireMock records actual
  upstream calls during a "proxy mode" run, then replays them.
- Parallel test execution requires per-test ports - WireMock's
  dynamic-port mode handles this.

## Install

### Maven

```xml
<dependency>
  <groupId>org.wiremock</groupId>
  <artifactId>wiremock</artifactId>
  <version>3.13.2</version>
  <scope>test</scope>
</dependency>
```

(Per [wiremock-quickstart][quickstart]; pin to the team's chosen
release.)

### Gradle

```groovy
testImplementation 'org.wiremock:wiremock:3.13.2'
```

## Authoring stubs

### JUnit 4 with `@Rule`

Per [wiremock-quickstart][quickstart]:

```java
import com.github.tomakehurst.wiremock.junit.WireMockRule;
import org.junit.Rule;

public class MyServiceTest {

    @Rule
    public WireMockRule wireMockRule = new WireMockRule(8089);

    @Test
    public void example() {
        stubFor(post("/my/resource")
            .withHeader("Content-Type", containing("xml"))
            .willReturn(ok()
                .withHeader("Content-Type", "text/xml")
                .withBody("<response>SUCCESS</response>")));

        // ... test the SUT against http://localhost:8089
    }
}
```

### JUnit 5 with `@WireMockTest`

For JUnit 5, use `@WireMockTest` (or `WireMockExtension` for
finer control):

```java
import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import org.junit.jupiter.api.Test;

@WireMockTest(httpPort = 8089)
class MyServiceTest {

    @Test
    void example() {
        stubFor(get("/orders/42")
            .willReturn(jsonResponse(
                "{\"order_id\": 42, \"status\": \"shipped\"}", 200)));

        // exercise SUT against http://localhost:8089/orders/42
    }
}
```

Pair `@WireMockTest` with dynamic-port allocation
(`wireMockConfig().dynamicPort()`) for parallel tests, then read
the assigned port via `WireMockRuntimeInfo`.

## Stub matching

The `stubFor` DSL composes a request-matcher chain:

| Matcher                                | Purpose                                                  |
|----------------------------------------|----------------------------------------------------------|
| `get("/path")` / `post("/path")` / etc.| HTTP verb + path matcher.                                 |
| `urlPathMatching("/users/[0-9]+")`     | Regex on path.                                            |
| `withHeader("Content-Type", containing("json"))` | Header value matcher.                          |
| `withQueryParam("status", equalTo("active"))`     | Query parameter matcher.                       |
| `withRequestBody(matchingJsonPath("$.amount", greaterThan(0)))` | JSON-path body matcher.            |
| `withCookie("session", equalTo("abc"))` | Cookie matcher.                                           |

Stubs are **first-match-wins** by default; the most specific stub
should be registered first.

## Response shaping

```java
stubFor(get("/orders/42")
    .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("{\"order_id\": 42}")
        .withFixedDelay(500)               // simulate latency
        // OR
        .withChunkedDribbleDelay(5, 1000)  // simulate slow chunked transfer
    ));
```

Common helper response builders:

| Helper                                | Effect                                           |
|---------------------------------------|--------------------------------------------------|
| `ok()`                                | 200 OK with empty body.                          |
| `okJson("...")`                       | 200 + `Content-Type: application/json` + body.   |
| `notFound()`, `badRequest()`, `serverError()` | 404 / 400 / 500.                       |
| `temporaryRedirect("/new")`           | 307 + Location.                                  |

## Request verification

After exercising the SUT, assert on requests received:

```java
verify(postRequestedFor(urlEqualTo("/orders"))
    .withRequestBody(matchingJsonPath("$.sku", equalTo("SKU-1"))));

verify(exactly(1), getRequestedFor(urlPathEqualTo("/health")));
```

`verify()` throws on mismatch - fails the test with a clear
explanation of expected vs. actual requests.

## Stateful stubs (scenarios)

For workflows that depend on prior state (e.g. "first call returns
empty cart, second call returns populated cart"):

```java
stubFor(get("/cart")
    .inScenario("Add to cart")
    .whenScenarioStateIs(STARTED)
    .willReturn(okJson("[]")));

stubFor(post("/cart/add")
    .inScenario("Add to cart")
    .whenScenarioStateIs(STARTED)
    .willSetStateTo("Added")
    .willReturn(ok()));

stubFor(get("/cart")
    .inScenario("Add to cart")
    .whenScenarioStateIs("Added")
    .willReturn(okJson("[{\"sku\":\"SKU-1\"}]")));
```

## CI integration

```yaml
# .github/workflows/integration.yml (excerpt)
- name: Run integration tests
  run: mvn -B verify   # WireMock starts in-process per @WireMockTest annotation

- name: Upload WireMock logs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: wiremock-logs
    path: |
      target/wiremock-*.log
      target/surefire-reports/
    retention-days: 14
```

WireMock writes to JUL by default; route to your project's logger
to capture stub-match misses (a common cause of "test passed
locally, failed on CI" puzzles).

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Hard-coded port 8089 across many test classes                  | Port collisions in parallel test execution.                       | Use `wireMockConfig().dynamicPort()`; read the assigned port from runtime info. |
| Stubs that match everything (`get(anyUrl())`)                  | Hides bugs - your SUT calls a wrong URL and the test still passes. | Match on specific paths; use `verify()` to assert exact URLs. |
| Skipping `verify()` after exercising the SUT                   | The test passes if the SUT skips the call entirely (broken control flow). | Always `verify()` the expected request was made. |
| Standalone WireMock as a separate process in CI                | Race conditions on startup; harder to debug.                       | Prefer in-process WireMock via `@WireMockTest`; standalone only when you must mock from outside the JVM. |
| Recording from production                                      | Captures real PII; hard to scrub.                                  | Record from staging only; if from prod, post-process to strip PII. |

## Limitations

- **JVM-focused.** Standalone mode works from any language but
  loses the type-safety of the Java DSL.
- **In-memory state only.** Scenario state resets when the WireMock
  server restarts; persistent state requires the standalone mode +
  on-disk file storage.
- **HTTP-only.** No WebSocket / gRPC - for those, use a different
  mock server.

## References

- [wiremock-quickstart][quickstart] - install, JUnit 4 / 5 setup,
  stub-mapping DSL, dynamic ports, request matching.
- WireMock Docs - https://wiremock.org/docs/
- [`msw-handlers`](../msw-handlers/SKILL.md) - JS / TS counterpart
  (for browser + Node).
- [`mountebank-imposters`](../mountebank-imposters/SKILL.md) - 
  multi-protocol alternative (HTTP + TCP + SMTP).
