---
name: api-testing-overview
description: "Teaches API testing from zero: what functional API testing covers, how it differs from contract testing and load testing, and a decision table that picks one tool from observable project facts (language and build file, whether an OpenAPI or GraphQL schema exists, functional vs spec-conformance fuzzing vs stateful security fuzzing, whether non-engineers read the tests). Names the real options (Postman with newman, REST Assured, Karate, Tavern, Schemathesis, RESTler), gives install and first-run commands with what a passing run looks like, and the traps that bite first: asserting only on HTTP status, order-dependent tests sharing server state, and hardcoded environment URLs and secrets. Use when an HTTP API needs automated tests and no tool has been chosen, or when an inherited suite only checks status codes."
---

# api-testing-overview

## What API testing covers

An API test sends a real HTTP request to a running service and asserts on the
response: the status code, the headers, and the body. It is not a unit test
(no in-process function calls, no mocking the HTTP layer) and not a UI test
(no browser). It exercises one deployed service through its public interface,
so it catches serialization bugs, wrong status codes, missing fields, broken
auth, and schema drift that unit tests structurally cannot see.

Three consequences shape everything below. The service runs at some URL, so
environment configuration is a first-class concern. The service has state, so
two tests hitting the same database can interfere. And the response is data
rather than a return value, so how well you assert on it is the whole skill.

## Functional vs contract vs load: three different disciplines

Newcomers merge these three and then pick a tool that cannot do the job. They
answer different questions and use different tools.

| Question you are actually asking | Discipline | Typical tools |
|---|---|---|
| Does `GET /orders/42` return 200 with the right body, and 404 when it is missing? | Functional API testing | Postman/newman, REST Assured, Karate, Tavern, Schemathesis, RESTler |
| Will the consumer service still work when the provider deploys tomorrow? | Contract testing | Pact |
| Does the service hold up at 500 requests per second for 30 minutes? | Load / performance testing | k6, JMeter |

**Functional** is what this skill teaches. One service, one live URL, request
in, assertions on the response.

**Contract testing** is a separate discipline whose distinguishing feature is
that no shared environment is involved. Pact is "a code-first consumer-driven
contract testing tool" where "the contract is generated during the execution
of the automated consumer tests" ([docs.pact.io](https://docs.pact.io/)),
letting teams "safely confirm that your applications will work together
without having to deploy the world first" (same source). The contract is
"contract by example": concrete request/response pairs the consumer actually
depends on, replayed against the provider in the provider's own CI (same
source). If your problem is "team A's deploy broke team B", functional API
tests will not solve it, because they test one side at a time.

**Load testing** varies concurrency and duration, then reports latency
percentiles and error rates. k6 is "an open-source, developer-friendly, and
extensible performance testing tool" that is "optimized for minimal resource
consumption and designed for running high-load performance tests" including
spike, stress, and soak tests
([grafana.com/docs/k6](https://grafana.com/docs/k6/latest/)). A functional
suite run in a loop is not a load test: no concurrency model, no ramp, no
latency reporting. Apache JMeter is the long-standing alternative, "a 100%
pure Java application designed to load test functional behavior and measure
performance" ([jmeter.apache.org](https://jmeter.apache.org/)).

A healthy project usually has all three eventually. Start with functional.

## Choosing a tool

Read down the "What you can observe" column and stop at the first row that
matches your project. Every row names a tool you can install today.

| What you can observe | Your goal | Start with | Why this one |
|---|---|---|---|
| `pom.xml` or `build.gradle`, tests already run under JUnit, engineers write and read the tests | Functional | **REST Assured** | Tests are plain Java in the existing `src/test/java` tree, so the build, CI, and IDE already work. No new runtime. |
| JVM project, but testers or analysts who do not write Java must read or edit the tests | Functional | **Karate** | Tests are `.feature` files in Gherkin shape and are directly executable: no step-definition glue code to maintain ([github.com/karatelabs/karate](https://github.com/karatelabs/karate)). |
| `package.json`, or the team already has a Postman collection JSON in the repo | Functional | **Postman + newman** | Author in the GUI, run the exact same collection headlessly in CI with `newman run` ([github.com/postmanlabs/newman](https://github.com/postmanlabs/newman)). |
| `requirements.txt` or `pyproject.toml`, pytest is already the runner | Functional | **Tavern** | Tests are YAML files collected by pytest itself, so existing pytest fixtures, markers, and reporting keep working ([tavern.readthedocs.io](https://tavern.readthedocs.io/en/stable/)). |
| An OpenAPI (2.0/3.x) or GraphQL schema is committed or served, and you want broad coverage without hand-writing per-endpoint tests | Spec conformance | **Schemathesis** | It "tests OpenAPI and GraphQL APIs by generating inputs from your schema" ([github.com/schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)). Coverage grows automatically as the schema grows. |
| An OpenAPI spec **and** the API is a resource lifecycle (`POST` creates, `GET` reads, `DELETE` removes), and you want security and reliability bugs | Stateful fuzzing | **RESTler** | "the first stateful REST API fuzzing tool ... finding security and reliability bugs", inferring request dependencies to reach deeper service states ([github.com/microsoft/restler-fuzzer](https://github.com/microsoft/restler-fuzzer)). |
| Consumer and provider are separate deployables owned by different teams | Contract | **Pact** | See the section above. Not a functional-testing problem. |
| The requirement mentions users per second, throughput, latency, or an SLA | Load | **k6** | See the section above. Not a functional-testing problem. |

Tie-breakers when two rows match:

- **Match the service's own language** unless a row above overrides it. Your CI
  image already has that runtime, and the people fixing failures already read
  that language.
- **A schema flips the answer only for coverage goals.** Having an OpenAPI file
  does not mean you should skip hand-written tests. Schemathesis checks that
  responses conform to the schema; it does not check that the business answer
  is correct. Most teams end up with a small hand-written suite plus
  Schemathesis, not one instead of the other.
- **Fuzzers are additive, never first.** Schemathesis and RESTler tell you the
  API violated its own spec or returned 5xx. They cannot tell you `/orders/42`
  returned the wrong customer. Get a functional suite green first.
- **If nothing matches**, use Postman and newman. It needs only Node, works
  against any HTTP API, and the collection JSON is portable if you later
  migrate.

## First runnable path

Below is the shortest path to one passing test for each functional option.
Pick the row you landed on. Point `baseUrl` at a locally running service or a
staging instance, never production.

### Postman and newman (default if unsure)

In the **Tests** tab of a request, assert both the status and the body
([learning.postman.com](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/)):

```js
pm.test("Status test", function () {
    pm.response.to.have.status(200);
});

pm.test("body has expected field", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
});
```

Then run the saved collection headlessly
([github.com/postmanlabs/newman](https://github.com/postmanlabs/newman)):

```bash
npm install -g newman
newman run collection.json -e environment.json -r cli,junit
```

`-e/--environment` supplies "a set of variables that one can use within
collections"; `-r/--reporters` accepts `cli, json, junit, progress and
emojitrain` (same source). `junit` is the one CI ingests.

**Success looks like:** newman prints an assertions table with 0 failures and
exits 0. Verify it can fail: change `200` to `201`, rerun, confirm a non-zero
exit.

### REST Assured (Java)

Add the dependency; `io.rest-assured:rest-assured` is at 6.0.1, released
2026-07-10 ([rest-assured.io](https://rest-assured.io/)):

```xml
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <version>6.0.1</version>
    <scope>test</scope>
</dependency>
```

The usage guide recommends statically importing `io.restassured.RestAssured.*`,
`io.restassured.matcher.RestAssuredMatchers.*`, and `org.hamcrest.Matchers.*`,
and writing assertions as `given() / when() / then()` with `statusCode(...)`
plus a `body(...)` matcher
([rest-assured wiki](https://github.com/rest-assured/rest-assured/wiki/Usage)):

```java
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@Test
public void returns_200_with_id() {
    given()
        .baseUri(System.getenv("API_BASE_URL"))
    .when()
        .get("/items/1")
    .then()
        .statusCode(200)
        .body("id", equalTo(1));
}
```

**Success looks like:** `mvn test` reports the test as passing. Verify it can
fail by asserting `equalTo(2)`.

### Karate (JVM, feature files)

Add `io.karatelabs:karate-junit5` as a test dependency, pinned to a release
listed on the repository, and write a `.feature` file. `match` is the
assertion keyword, and `#number` / `#string` are type placeholders so the test
does not bind to volatile values
([github.com/karatelabs/karate](https://github.com/karatelabs/karate),
[docs.karatelabs.io](https://docs.karatelabs.io/)):

```gherkin
Feature: Items API

  Scenario: Get an item
    Given url baseUrl
    And path 'items/1'
    When method GET
    Then status 200
    And match response == { id: '#number', name: '#string' }
```

**Success looks like:** `mvn test` passes and an HTML report appears under
`target/karate-reports/`.

### Tavern (Python, pytest)

Install, then write one YAML file
([github.com/taverntesting/tavern](https://github.com/taverntesting/tavern)):

```bash
pip install tavern[pytest]
```

```yaml
test_name: GET /items/1 returns 200 with expected id

stages:
  - name: fetch item
    request:
      url: "{host}/items/1"
      method: GET
    response:
      status_code: 200
      json:
        id: 1
```

Run it with `py.test test_items.tavern.yaml -v`, or without pytest via
`tavern-ci --stdout test_items.tavern.yaml`
([tavern.readthedocs.io](https://tavern.readthedocs.io/en/stable/)).

**Success looks like:** pytest reports 1 passed. Verify it can fail by
changing the expected `id`.

### Schemathesis (schema-driven, no test authoring)

There is nothing to author. `uvx` runs it without installing; `uv pip install`
makes it permanent. Both forms and the `schemathesis run <schema-url>` command
are from the README
([github.com/schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)):

```bash
uvx schemathesis run https://your-api.example.com/openapi.json
# or: uv pip install schemathesis && schemathesis run <schema-url>
```

**Success looks like:** a per-endpoint summary with no failures. A failure
prints the generated request that broke conformance, so treat the first run
as a discovery pass rather than a gate.

### RESTler (stateful fuzzing, later)

RESTler needs Python 3.12.8 and .NET 8.0, and runs as four stages: compile a
grammar from the spec, test (a smoke pass measuring coverage), fuzz-lean (one
pass per endpoint with default checkers), then fuzz (breadth-first deep
exploration)
([github.com/microsoft/restler-fuzzer](https://github.com/microsoft/restler-fuzzer)).
The setup cost is real, so reach for it only after a functional suite exists
and the API is a genuine resource lifecycle.

## Traps that bite first

**1. Asserting only on the status code.** A handler that catches its own
exception and returns `200 {"error": "user not found"}` passes a status-only
test forever. So does an endpoint that starts returning an empty array. Assert
on at least one field of the body too, which is why the Postman docs' own
example pairs a status assertion with a body assertion
([learning.postman.com](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/)).
The counterpart trap is over-asserting: pinning a server-generated `id` or
timestamp to a literal fails on every run. Assert the type, not the value, via
Karate's `'#number'` placeholder
([docs.karatelabs.io](https://docs.karatelabs.io/)) or a Hamcrest matcher such
as `notNullValue()` ([rest-assured wiki](https://github.com/rest-assured/rest-assured/wiki/Usage)).

**2. Tests that only pass in one order.** Unlike unit tests, API tests share a
live database. Test 1 creates `alice@example.com`, test 2 asserts the user
count is 3, test 3 deletes Alice. Run them alone, shuffled, or in parallel and
they fail. Symptoms: "it passes locally but not in CI", or a test that fails
only when you run the file directly. The fixes, in order of preference:

- Each test creates the data it needs with a unique key (a UUID or timestamp
  suffix in the email), and asserts only on that record.
- Never assert on global aggregates (total counts, "the first item in the
  list") unless the test owns the whole dataset.
- Clean up in teardown, but do not depend on cleanup having run.
- Detect the problem deliberately: reverse the file order or run in parallel
  and see whether the suite still passes. This ordering check is a
  practitioner convention, not a documented tool feature.

**3. Hardcoded environment URLs and secrets.** `https://staging.example.com`
pasted into 40 requests means the suite can never run anywhere else, and a
token committed in a collection is a leak that survives in git history. Every
tool in the table has a supported mechanism, so use it from the first test:

| Tool | Base URL | Secret |
|---|---|---|
| Postman/newman | environment file via `-e` ([github.com/postmanlabs/newman](https://github.com/postmanlabs/newman)) | environment variable in the same file, injected from CI secrets |
| REST Assured | `baseUri(System.getenv("API_BASE_URL"))` | `System.getenv` in the test |
| Karate | a variable read from a system property, e.g. `karate.properties['api.token']` ([docs.karatelabs.io](https://docs.karatelabs.io/)) | same mechanism, passed as `-D` on the Maven command |
| Tavern | a `{host}` format variable supplied by an included config file ([github.com/taverntesting/tavern](https://github.com/taverntesting/tavern)) | same mechanism, sourced from the environment |
| Schemathesis | `schemathesis run <schema-url>` where the URL is a CI variable ([github.com/schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)) | auth header passed on the command line from a CI secret |

A useful rule: if `grep -rE 'https?://|Bearer ' tests/` returns anything, the
suite is not yet environment-portable.

**4. Pointing any of it at production.** Functional tests create and delete
data, and fuzzers do so at volume, generating requests designed to be unusual.
Target a local instance or staging.

## Going deeper

Companion material, if it is available alongside this file:
`postman-collections`,
`restassured-testing`,
`karate-testing`,
`tavern-testing`,
`schemathesis-fuzzing`,
`restler-fuzzing`,
`api-chaos-runner`.
