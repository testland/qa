# First-run commands per functional tool

The default path (Postman + newman) stays in the SKILL.md spine. Below are the
shortest paths to one passing test for the other functional options. Point the
base URL at a locally running service or a staging instance, never production.

## REST Assured (Java)

Add the dependency, pinned to the current `io.rest-assured:rest-assured`
release ([rest-assured.io](https://rest-assured.io/)):

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

## Karate (JVM, feature files)

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

## Tavern (Python, pytest)

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

## Schemathesis (schema-driven, no test authoring)

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

## RESTler (stateful fuzzing, later)

RESTler needs Python 3.12.8 and .NET 8.0, and runs as four stages: compile a
grammar from the spec, test (a smoke pass measuring coverage), fuzz-lean (one
pass per endpoint with default checkers), then fuzz (breadth-first deep
exploration)
([github.com/microsoft/restler-fuzzer](https://github.com/microsoft/restler-fuzzer)).
The setup cost is real, so reach for it only after a functional suite exists
and the API is a genuine resource lifecycle.
