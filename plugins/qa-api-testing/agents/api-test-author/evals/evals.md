---
component: api-test-author
type: agent
archetype: A2
---

# api-test-author — evals

Companion eval cases for [`api-test-author`](../../api-test-author.md).
Three cases covering happy path (REST Assured POST) + branch (Karate GraphQL) +
adversarial (load-testing request out of scope).

## Eval 1: happy path — REST Assured test for a POST endpoint

**Input:**
- Tool override: `REST Assured`.
- Project root contains `pom.xml` with `io.rest-assured:rest-assured:5.4.0` dependency.
- Endpoint: `POST /orders` (REST).
- Behavior spec: "Submitting a valid order with `customer_id: 42` and `items: [{ sku: 'A1', qty: 2 }]` returns 201 Created with a non-null `id` field in the response body."

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25).

**Expected:** Emits one Java file at `src/test/java/com/example/api/OrdersTest.java` (path discovered from existing test structure) containing:
- `@Test public void postOrders_validPayload_returns201WithId()`
- `given().contentType(ContentType.JSON).body("{\"customer_id\": 42, ...}").when().post("/orders").then().statusCode(201).body("id", notNullValue());`
- Uses Hamcrest matchers (`notNullValue()`) imported correctly

**Pass condition:** Output contains the literal substrings `given()` AND `.post("/orders")` AND `.statusCode(201)` AND `notNullValue()` and does NOT contain hardcoded `http://localhost` URLs (should use base URI config).

## Eval 2: branch — Karate feature for a GraphQL mutation

**Input:**
- Tool override: `Karate`.
- Project root contains `src/test/java/karate-config.js` and existing `*.feature` files.
- Endpoint: `POST /graphql` (GraphQL mutation `createUser(input: { email, name })`).
- Behavior spec: "Mutating createUser with valid input returns the created user's `id` and `email`; mutating with a duplicate email returns a `USER_EXISTS` error."

**Target models:** sonnet (2026-05-25), haiku (2026-05-25).

**Expected:** Emits one Karate feature file at `src/test/java/users/create-user.feature` containing:
- `Feature: createUser GraphQL mutation`
- `Scenario: create a new user with valid input` (happy path) with `Given path '/graphql'`, `And request { query: 'mutation { createUser(input: { email: ..., name: ... }) { id email } }' }`, `When method POST`, `Then status 200`, `And match response.data.createUser.id == '#notnull'`
- `Scenario: duplicate email returns USER_EXISTS error` (error path) asserting on `response.errors[0].extensions.code == 'USER_EXISTS'`

**Pass condition:** Output contains the literal substrings `Feature:` AND `Scenario:` AND `path '/graphql'` AND `match response` AND (`mutation` OR `createUser`) and does NOT contain Jest / Mocha / pytest syntax (wrong tool).

## Eval 3: adversarial — load-testing request

**Input:**
- Endpoint: `GET /orders`.
- Behavior spec: "Test that the API can handle 500 concurrent requests per second for 10 minutes without latency degradation."

**Target models:** sonnet (2026-05-25).

**Expected:** Refuses to author a functional test. Explains that load testing is a separate concern handled by the qa-load-testing plugin (k6 / JMeter / Gatling / Locust — Wave 6). Does NOT emit a functional test that asserts on concurrency or RPS — functional tests check correctness, not throughput.

**Pass condition:** Output contains the literal substring `qa-load-testing` OR (`load testing` AND (`k6` OR `JMeter` OR `Gatling` OR `Locust`)) and does NOT contain `@Test` OR `given()` OR `Feature:` (no test code emitted).

## Notes

- Eval file lives outside the lint glob — no rating frontmatter needed.
- Pass conditions are literal-string checks; a reviewer can grep transcripts.
- Target-model dates are eval-authoring dates (2026-05-25), not execution dates.
