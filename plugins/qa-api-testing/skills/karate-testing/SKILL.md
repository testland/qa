---
name: karate-testing
description: "Authors Karate `.feature` files using its Gherkin-flavored DSL for HTTP API tests, leverages the `match` keyword with fuzzy validators (#number / #string / #regex / contains / arrays), runs the suite via JUnit 5 plus Maven Surefire, and produces JUnit XML for CI gating. Use when the project is on the JVM and prefers a feature-file authoring flow over Java-DSL fluent chains."
rating: 25
d6: 4
archetype: S1
---

# karate-testing

## Overview

Karate is "an open-source tool that combines API testing, mocks,
performance testing, and UI automation into a single, unified
framework" ([karate-readme][readme]). The authoring style is Gherkin-
flavored - every test is a `.feature` file with `Given / When / Then`
steps - but unlike Cucumber the steps are **executable directly**;
no glue code is required ([karate-docs][docs]).

[readme]: https://github.com/karatelabs/karate
[docs]: https://docs.karatelabs.io/

This skill covers the API-testing slice of Karate. The mock-server
and UI-automation modes are out of scope here.

## When to use

- The team wants feature-file-based authoring (Gherkin shape) without
  step-definition glue code (the Cucumber pain point).
- Multi-language test teams: Karate's DSL is approachable for non-
  Java developers (the `.feature` file IS the test; no Java to read).
- API + mock + perf in one tool - Karate's distinguishing feature is
  cross-mode reuse of feature files.
- Teams that need built-in JSON path + schema-fuzzy matching with
  one keyword (`match`).

If the team is already deep in REST Assured fluency, evaluate
[`restassured-testing`](../restassured-testing/SKILL.md). For
non-JVM stacks, use [`postman-collections`](../postman-collections/SKILL.md)
or [`tavern-testing`](../tavern-testing/SKILL.md).

## Install

Maven (consult [karate-docs][docs] for the current version - Karate
publishes regularly under group `io.karatelabs`, artifacts
`karate-core` and `karate-junit5`):

```xml
<dependency>
    <groupId>io.karatelabs</groupId>
    <artifactId>karate-junit5</artifactId>
    <version>${karate.version}</version>
    <scope>test</scope>
</dependency>
```

Pin `${karate.version}` to a specific release (e.g. `2.0.7` per the
GitHub release page as of 2026-05-04). Do not float on `LATEST` - 
DSL keywords have evolved across major versions.

## Authoring

### Feature file shape

Each `.feature` file lives under `src/test/java/<package>/` (yes,
under `java/` even though it's not Java - Maven's resource
conventions). Per [karate-docs][docs]:

```gherkin
Feature: Simple API test example

  Scenario: Get user details
    Given url 'https://api.example.com'
    When method GET
    Then status 200
    And match response == { id: '#number', name: '#string', email: '#string', active: true }
```

The keywords:

| Keyword | Purpose |
|---------|---------|
| `Feature:`           | One per file; describes the API surface under test. |
| `Scenario:`          | One per case; mirrors a single user / API journey. |
| `Background:`        | Steps that run before each Scenario (auth, base URL setup). |
| `Given url '...'`    | Set the request URL.                                |
| `Given path '...'`   | Append a path segment to the URL.                   |
| `Given header X = Y` | Set a request header.                                |
| `Given param X = Y`  | Set a query parameter.                               |
| `Given request {...}`| Set the JSON body.                                   |
| `When method <verb>` | Issue the HTTP request: `get`, `post`, `put`, `delete`. |
| `Then status N`      | Assert the response status code.                     |
| `And match expr`     | Assert response body / header / variable shape.     |

### The `match` keyword

`match` is Karate's superpower - fuzzy structural matching on JSON
or XML ([karate-docs][docs]):

```gherkin
# Equality on the whole response
And match response == { id: 1, name: 'Alice' }

# Type fuzzy: any number, any string
And match response == { id: '#number', name: '#string' }

# Regex constraint
And match response.email == '#regex .*@example\\.com'

# Array contains
And match response.items contains { sku: 'SKU-123' }

# Array length / shape
And match response.items == '#array'
And match response.items[0] == { sku: '#string', qty: '#number' }

# Optional / nullable fields
And match response == { id: '#number', deletedAt: '##string' }   # ## = optional
```

Match modifiers (`#number`, `#string`, `#boolean`, `#array`, `#object`,
`#null`, `#notnull`, `#present`, `#notpresent`, `#regex <pattern>`,
`##<type>` for optional) compose into a small but expressive matcher
language ([karate-docs][docs]).

### Background block

For shared setup across scenarios:

```gherkin
Feature: Orders API

  Background:
    Given url 'https://api.example.com'
    And header Authorization = 'Bearer ' + karate.properties['api.token']

  Scenario: Get an order
    Given path 'orders/42'
    When method GET
    Then status 200
    And match response.order_id == 42

  Scenario: Create an order
    Given path 'orders'
    And request { sku: 'SKU-1', qty: 2 }
    When method POST
    Then status 201
    And match response == { order_id: '#number', sku: 'SKU-1', qty: 2 }
```

`karate.properties['api.token']` reads a system property (passed via
`mvn test -Dapi.token=...`) - the canonical pattern for secret
injection without hard-coding.

### Variables and chaining

```gherkin
Scenario: Create then read
  Given path 'orders'
  And request { sku: 'SKU-1', qty: 2 }
  When method POST
  Then status 201
  * def newId = response.order_id

  Given path 'orders/' + newId
  When method GET
  Then status 200
  And match response.sku == 'SKU-1'
```

`* def name = expr` declares a variable usable in subsequent steps.
`*` is a step prefix (synonym of `Given/When/Then` - Karate keywords
are documentation only when not asserting).

## Running via JUnit 5

Karate ships a JUnit 5 runner that picks up `.feature` files
adjacent to a Java runner class. Convention:

```java
package com.example.api;

import com.intuit.karate.junit5.Karate;

class OrdersApiRunner {

    @Karate.Test
    Karate orders() {
        return Karate.run("orders").relativeTo(getClass());
    }
}
```

`Karate.run("orders")` resolves to `orders.feature` next to the
runner. For multi-feature suites, add more `@Karate.Test` methods
or use `Karate.run().relativeTo(getClass())` to pick up every
`.feature` in the same directory.

Run via Maven:

```bash
mvn test -Dapi.token=$API_TOKEN
```

(Per [karate-docs][docs].)

## Reporting

Karate emits Cucumber-style HTML reports under
`target/karate-reports/`, plus JUnit XML under
`target/karate-reports/karate-summary.xml`. The JUnit XML is
canonical for CI ingestion (same shape as Newman / REST Assured /
JUnit's own `*Test.java` output).

## CI integration

```yaml
# .github/workflows/karate.yml
name: api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  karate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Run Karate suite
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: mvn -B test -Dapi.token=$API_TOKEN

      - name: Upload Karate reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: karate-reports
          path: target/karate-reports/
          retention-days: 14

      - name: Surface JUnit results
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Karate API tests
          path: target/karate-reports/karate-summary.xml
          reporter: java-junit
```

## Anti-patterns

| Anti-pattern                                                     | Why it fails                                                                | Fix |
|------------------------------------------------------------------|-----------------------------------------------------------------------------|-----|
| Hard-coded URLs and tokens in `.feature` files                    | Tests bind to one environment; secrets leak.                                | Use `karate.properties['api.url']` and `karate.properties['api.token']`. |
| `match response == ...` with literal IDs from a non-deterministic source | Test fails on every run because the ID changes.                       | Use `'#number'` instead of a literal; OR capture the ID with `* def id = response.id` and assert on it explicitly. |
| Combining UI + API + mock in one Feature                           | When one mode breaks, the unrelated assertions become noise.                | One mode per Feature; cross-link with `* call read('helper.feature')`. |
| Missing `Background` for shared auth                               | Every Scenario duplicates auth steps; rotation pain.                        | Pull auth into `Background`. |
| Skipping `--bail` equivalent in CI                                 | A failed scenario doesn't stop subsequent scenarios; long failure logs.    | Karate doesn't bail mid-Feature by design; for fast-fail, run each Feature in its own JUnit class and use `mvn -fae` or `-Dsurefire.failIfNoTests=false` patterns. |

## Limitations

- **JVM only.** Karate runs on the JVM; non-JVM teams should look at
  [`tavern-testing`](../tavern-testing/SKILL.md) (Python) or
  [`postman-collections`](../postman-collections/SKILL.md) (Node).
- **DSL learning curve for non-Gherkin users.** The `match` keyword's
  modifier vocabulary takes a session to internalize.
- **`.feature` files under `src/test/java`.** Maven convention is
  surprising for first-timers; misplacing them under `src/test/resources`
  breaks the JUnit 5 runner's auto-discovery.
- **Cucumber-style reports are HTML-heavy.** Combine with the
  `karate-summary.xml` for CI gating; the HTML is for human triage,
  not machine consumption.

## References

- [karate-readme][readme] - main repo: positioning, dependency name,
  release cadence.
- [karate-docs][docs] - canonical DSL reference: feature-file syntax,
  match keyword, scenario / background / scenario outline, JUnit 5
  runner pattern.
- [`postman-collections`](../postman-collections/SKILL.md) - JSON-driven
  alternative.
- [`restassured-testing`](../restassured-testing/SKILL.md) - Java
  fluent-DSL alternative on the same JVM stack.
