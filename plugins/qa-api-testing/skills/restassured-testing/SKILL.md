---
name: restassured-testing
description: "Use whenever Java/JVM API tests need writing or fixing: loose assertions that let an empty 200 pass, slow sequential suites, or hand-rolled HTTP clients. Writes REST Assured given/when/then tests: status, JSON and XML path checks, auth, reusable specs, schema checks, Maven or Gradle and CI reports."
---

# restassured-testing

## Overview

REST Assured is a Java DSL for HTTP API testing with a BDD-style
`given().when().then()` chain ([restassured-readme][readme]). It runs
inside any JUnit / TestNG suite and consumes JSON, XML, and other
content types via path expressions backed by Hamcrest matchers
([restassured-usage][usage]).

[readme]: https://github.com/rest-assured/rest-assured
[usage]: https://github.com/rest-assured/rest-assured/wiki/Usage
[changelog]: https://github.com/rest-assured/rest-assured/blob/master/changelog.txt

This is the JVM-native counterpart to
`postman-collections`. Use REST
Assured when the team's primary stack is Java / Kotlin / Scala and
type-safe authoring + same-language refactoring matter.

## When to use

- The project is a Maven or Gradle Java project.
- The team wants API tests in the same language as the application
  (refactor-safe, IDE-aware).
- Tests need to compose fluently with JUnit 5 / TestNG fixtures.
- Authentication patterns required: Basic (preemptive), OAuth2
  (bearer token), API key in header - all first-class.

If the team is non-JVM, evaluate
`postman-collections` (JSON-driven),
`tavern-testing` (Python YAML), or
`karate-testing` (cross-platform DSL).

## Install

REST Assured 6.3.0 (2026-10-23) is current; per the [changelog][changelog],
6.0.0 set the "New minimum Java baseline" to 17.

### Maven

```xml
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <version>6.3.0</version>
    <scope>test</scope>
</dependency>
<!-- Optional: body(matchesJsonSchemaInClasspath(..)) -->
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>6.3.0</version>
    <scope>test</scope>
</dependency>
```

(Per [restassured-usage][usage].) Keep every `io.rest-assured` module on
the same version: with two or more modules, import
`io.rest-assured:rest-assured-bom` in `dependencyManagement` instead of
repeating the version. Spring Boot's dependency management can pin an
older REST Assured; set the `rest-assured.version` property to override
it.

### Gradle

```kotlin
testImplementation(platform("io.rest-assured:rest-assured-bom:6.3.0"))
testImplementation("io.rest-assured:rest-assured")
testImplementation("io.rest-assured:json-schema-validator")
```

### Upgrading from 5.x

Per the [changelog][changelog]:

- **6.0.0** raises the baselines to Java 17 and Groovy 5.x and adds
  Jackson 3 object mapping.
- **6.2.0** changes specification behavior. A spec from
  `RequestSpecBuilder.build()` can no longer send a request itself
  (`spec.when().get(..)` throws `IllegalStateException`; use
  `given(spec)`), and per [usage][usage], merging a spec "only overwrites
  values that the merged specification sets itself" where "Before REST
  Assured 6.2.0 values such as the base URI, port and authentication were
  reset by a merge". Re-run suites that layer several specs.
- **6.3.0** adds an OpenRewrite recipe,
  `io.restassured.MigrateRestAssured6Deprecations`, in the
  `rest-assured-openrewrite` module, that moves code off APIs deprecated
  in 6.x. It also publishes `json-path-gpath` and `xml-path-gpath`, the
  REST Assured 7.0.0 names of `json-path` and `xml-path`; switch
  explicit `json-path` dependencies to them before 7.0.

## Authoring

### Imports

The canonical static imports for fluent authoring
([restassured-usage][usage]):

```java
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import static io.restassured.matcher.RestAssuredMatchers.*;
```

These bring `given()`, `get()`, `post()`, etc. plus Hamcrest matchers
(`equalTo`, `hasItems`, `containsString`, `nullValue`, etc.) into
scope.

### given() / when() / then() chain

The basic shape ([restassured-readme][readme]):

```java
given().
    param("key1", "value1").
when().
    post("/somewhere").
then().
    body(containsString("OK"));
```

`given()` configures the request (params, headers, body, auth);
`when()` issues the HTTP verb; `then()` asserts the response.

### Status code assertion

```java
get("/x").then().assertThat().statusCode(200);
```

(Per [restassured-usage][usage].)

`statusCode(int)` is equivalent to `statusCode(equalTo(int))`. For
ranges, use `statusCode(allOf(greaterThanOrEqualTo(200), lessThan(300)))`.

### JSON path assertions

```java
get("/lotto").then().body("lotto.lottoId", equalTo(5));
get("/lotto").then().body("lotto.winners.winnerId", hasItems(23, 54));
```

(Per [restassured-usage][usage].)

The first argument is a Groovy-style JSON path
(`models[0].author.name`); the second is a Hamcrest matcher.

### XML path assertions

```java
given().parameters("firstName", "John", "lastName", "Doe").
when().post("/greetXML").
then().body("greeting.firstName", equalTo("John"));
```

(Per [restassured-usage][usage].)

### Reuse request and response specifications

Per [usage][usage] (Specification Re-use), build shared setup once with
`RequestSpecBuilder` and shared expectations with `ResponseSpecBuilder`:

```java
RequestSpecification api = new RequestSpecBuilder()
    .setBaseUri(System.getProperty("api.baseURI", "http://localhost:8080"))
    .setContentType(ContentType.JSON)
    .addHeader("Authorization", "Bearer " + System.getenv("API_TOKEN"))
    .build();

ResponseSpecification okJson = new ResponseSpecBuilder()
    .expectStatusCode(200)
    .expectContentType(ContentType.JSON)
    .build();

given(api).
when().get("/orders/42").
then().spec(okJson).body("status", equalTo("shipped"));
```

Per-test values set on `given()` merge on top of the spec. Since 6.2.0 a
merge keeps values the spec does not set (see "Upgrading from 5.x").

### Extract values for the next call

Per [usage][usage], `extract()` returns a value after validation, which
chains a create call into a read call without a second client:

```java
String id =
    given(api).body(Map.of("sku", "BOOK0001", "qty", 1)).
    when().post("/orders").
    then().statusCode(201).extract().path("id");

given(api).when().get("/orders/{id}", id).then().spec(okJson);
```

### Validate against a JSON Schema

With the `json-schema-validator` module, per [usage][usage]:

```java
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;

get("/products").then().assertThat().body(matchesJsonSchemaInClasspath("products-schema.json"));
```

The schema file lives in `src/test/resources/`. A schema check catches a
renamed or dropped field that field-by-field assertions never looked at.

### Log only when a check fails

Per [usage][usage] ("Log if validation fails"), log the request and the
response only for failing tests, so CI output shows the failing exchange
without flooding passing runs:

```java
// Per request
given().log().ifValidationFails().when().get("/orders/42").then().log().ifValidationFails();

// Once for the whole suite
RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
```

### Combined status + body assertion

```java
given().header("Accept", "application/json").
when().get("/orders/42").
then().
    statusCode(200).
    body("order_id", equalTo(42)).
    body("status", equalTo("shipped")).
    body("items", hasSize(greaterThan(0)));
```

## Authentication

REST Assured ships first-class auth support
([restassured-usage][usage]):

### OAuth2 / Bearer token

```java
given().auth().oauth2(accessToken).when().get("/secured").then().statusCode(200);
```

### Preemptive Basic Auth

```java
given().auth().preemptive().basic("username", "password").
when().get("/secured/hello").
then().statusCode(200);
```

`preemptive()` sends the `Authorization` header on the first request
without waiting for a 401 challenge - required for most modern APIs
that don't issue WWW-Authenticate.

### API Key in header

```java
given().header("X-API-KEY", "your-api-key").when().get("/endpoint");
```

For any custom auth scheme, fall through to the `header()` form - 
REST Assured doesn't impose a structure beyond the standard Basic /
OAuth1/2 patterns.

## Worked example: full JUnit 5 test

```java
package com.example.api;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

class OrdersApiIT {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = System.getProperty("api.baseURI", "http://localhost:8080");
  }

  @Test
  @DisplayName("GET /orders/42 returns the expected order")
  void getOrder() {
    given().
        auth().oauth2(System.getenv("API_TOKEN")).
        accept(ContentType.JSON).
    when().
        get("/orders/42").
    then().
        statusCode(200).
        contentType(ContentType.JSON).
        body("order_id",  equalTo(42)).
        body("status",    isOneOf("placed", "shipped", "completed", "returned")).
        body("items",     hasSize(greaterThan(0))).
        body("items[0].sku", matchesPattern("^[A-Z0-9]{8}$"));
  }
}
```

## CI integration

```yaml
# .github/workflows/api-tests.yml
name: api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  restassured:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-java@v6
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Run integration tests
        env:
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
        run: |
          mvn -B verify \
            -Dapi.baseURI=https://staging.example.com \
            -Dfailsafe.includes='**/*IT.java'

      - name: Surface JUnit results
        if: always()
        uses: dorny/test-reporter@v3
        with:
          name: REST Assured tests
          path: target/failsafe-reports/TEST-*.xml
          reporter: java-junit

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: failsafe-reports
          path: target/failsafe-reports/
          retention-days: 14
```

The `*IT.java` suffix is the Maven Failsafe convention for
**integration tests** (separate from `*Test.java` unit tests). Failsafe
uploads JUnit XML to `target/failsafe-reports/` automatically - same
format as Newman's `--reporter-junit-export`.

## Anti-patterns

| Anti-pattern                                              | Why it fails                                                         | Fix |
|-----------------------------------------------------------|----------------------------------------------------------------------|-----|
| Hard-coded `RestAssured.baseURI` in source                 | Tests bind to one environment; can't run against staging vs local.   | Read from system property: `RestAssured.baseURI = System.getProperty("api.baseURI", default);`. |
| Inline tokens in source                                    | Secrets leak; PRs flag; rotation pain.                              | Read from env var: `System.getenv("API_TOKEN")`. |
| `.basic()` without `.preemptive()`                         | Sends an unauthorized request first; doubles round trips and may fail on APIs that don't issue WWW-Authenticate. | Use `auth().preemptive().basic(...)`. |
| Asserting only status code without body shape              | Status 200 with garbage body still passes. | Always assert at least one body field, ideally schema-validated (`matchesJsonSchemaInClasspath`). |
| Copying base URI, auth and content type into every test     | One header change means editing every test.                          | `RequestSpecBuilder` + `ResponseSpecBuilder` specs. |
| Mixed `io.rest-assured` module versions                     | Mismatched modules fail at run time.                                  | `rest-assured-bom`. |
| Logging every request and response in CI                    | Logs bury the one failing exchange.                                   | `enableLoggingOfRequestAndResponseIfValidationFails()`. |
| One mega-assertion `body(equalTo(jsonString))`             | Diff is uninterpretable on failure.                                  | Multiple field-level `body(path, matcher)` calls; fail-fast naming surfaces which field is wrong. |
| Mixing unit-test (`*Test.java`) and integration (`*IT.java`) by name only | Maven Surefire vs Failsafe gets confused; integration tests run during the unit-test phase. | Strict naming: `*Test.java` for unit (`mvn test`); `*IT.java` for integration (`mvn verify`). |

## Limitations

- **Java-only.** Kotlin and Scala work but the syntax overhead is
  notable (especially Kotlin trailing-lambda style); the canonical
  examples are Java.
- **No native parallelism.** Use JUnit 5's `@Execution(CONCURRENT)`
  or TestNG's `parallel="methods"` to parallelize at the framework
  level.
- **Schema validation is a separate jar.** Add
  `io.rest-assured:json-schema-validator` if you want
  `body(matchesJsonSchema(file))` style assertions.

## References

- [restassured-readme][readme] - main repo README; basic given/when/then
  + Maven groupId.
- [restassured-usage][usage] - full DSL reference: Maven dep XML,
  imports, status code, JSON/XML path, OAuth2, preemptive Basic,
  API-key header, specification re-use and 6.2.0 merge rules,
  `extract()`, JSON Schema validation, log if validation fails.
- [changelog][changelog] - 6.0.0 Java 17 baseline, 6.2.0 specification
  changes, 6.3.0 OpenRewrite recipe and `json-path-gpath` names.
- `postman-collections` - 
  JSON-driven counterpart for non-JVM teams.
- `schemathesis-fuzzing` - 
  property-based fuzzing complement (different approach to coverage).
