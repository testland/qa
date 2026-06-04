---
name: getting-started
description: "Orients a junior engineer who is new to API testing in the qa-api-testing plugin: explains what API testing is, maps each tool in the plugin to its stack, and walks through the literal first steps to write and run a minimal request with a status and schema assertion. Use when a junior engineer is new to API testing and does not know where to start in this plugin."
rating: 23
d6: 2
keywords: [api-testing, onboarding, getting-started, postman, rest-assured, tavern]
---

# getting-started

## What is API testing?

API testing verifies that the HTTP interfaces between components behave
according to their specification - checking that every endpoint returns the
correct status code, response shape, and data under both normal and abnormal
inputs. Per the ISTQB Glossary (v4.0, "component integration testing"),
integration testing validates interactions between integrated components or
systems ([glossary.istqb.org](https://glossary.istqb.org/en_US/term/component-integration-testing-1-1)).
API tests sit at the integration layer: they call a live (or stubbed) service
over the network rather than invoking code in-process.

## Which tool should I start with?

If you are unsure which of the seven skills in this plugin fits your project,
run the `api-test-tool-selector` agent first. It reads project markers
(`*.openapi.yaml`, language stack, testing goal) and recommends one tool with
rationale.

If you already know your stack, the first skill to read is:

| Stack | First skill to read |
|---|---|
| GUI-first / REST / team already using Postman | [`postman-collections`](../postman-collections/SKILL.md) |
| Java / Maven or Gradle project | [`restassured-testing`](../restassured-testing/SKILL.md) |
| Python / pytest project | [`tavern-testing`](../tavern-testing/SKILL.md) |

Once you have chosen a tool, use the `api-test-author` agent to generate your
first test artifact for an endpoint and scenario.

## First steps - writing a minimal test

These three steps work regardless of which tool you choose. The pattern is
always: send one request, assert the status code, assert one field in the body.

### Postman (GUI + Newman)

In the **Tests** tab of a request, add
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

Run it in the Postman desktop app first, then headlessly via
`newman run collection.json`. See [`postman-collections`](../postman-collections/SKILL.md)
for the full Newman CLI and CI wiring.

### REST Assured (Java)

Add the dependency ([rest-assured.io](https://rest-assured.io/)):

```xml
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <version>6.0.0</version>
    <scope>test</scope>
</dependency>
```

Write the test using the static imports also listed at
[rest-assured.io](https://rest-assured.io/):

```java
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@Test
public void returns_200_with_id() {
    given()
        .baseURI("http://localhost:8080")
    .when()
        .get("/items/1")
    .then()
        .statusCode(200)
        .body("id", equalTo(1));
}
```

See [`restassured-testing`](../restassured-testing/SKILL.md) for auth,
XML path, and Maven Failsafe integration.

### Tavern (Python / pytest)

Install ([tavern.readthedocs.io](https://tavern.readthedocs.io/en/stable/)):

```bash
pip install tavern[pytest]
```

Create `test_items.tavern.yaml`:

```yaml
test_name: GET /items/1 returns 200 with expected id

stages:
  - name: fetch item
    request:
      url: http://localhost:8080/items/1
      method: GET
    response:
      status_code: 200
      json:
        id: 1
```

Run with `py.test test_items.tavern.yaml -v`
([tavern.readthedocs.io](https://tavern.readthedocs.io/en/stable/)).
See [`tavern-testing`](../tavern-testing/SKILL.md) for variable saving,
built-in matchers, and CI discovery.

## Next steps

After your first test passes:

1. Add a second assertion for an error case (e.g., 404 for a missing resource).
2. Move base URLs and tokens to environment / config files - never hard-code
   them in test artifacts.
3. Hook the run into CI so the test gates every PR.

For fuzzing and resilience testing, see
[`schemathesis-fuzzing`](../schemathesis-fuzzing/SKILL.md) and
[`api-chaos-runner`](../api-chaos-runner/SKILL.md) - those complement,
not replace, the functional tests above.
