# qa-api-testing

API testing across Postman/Newman, RestAssured, Karate; Schemathesis + RESTler fuzzing; and an API chaos runner that injects latency / error rates during test runs.

## Choosing a tool

Functional API testing (request in, assertions on status + body) is what this
plugin covers. Two neighbor disciplines are easy to confuse with it: **contract
testing** ("will the consumer still work when the provider deploys?") is Pact's
job - see the qa-contract-testing plugin; **load testing** ("does it hold up at
500 rps?") is k6 / JMeter - see qa-load-testing. A functional suite run in a
loop is not a load test.

Read down the "What you can observe" column and stop at the first row that
matches your project:

| What you can observe | Your goal | Start with | Why this one |
|---|---|---|---|
| `pom.xml` or `build.gradle`, tests already run under JUnit, engineers write and read the tests | Functional | `restassured-testing` | Tests are plain Java in the existing `src/test/java` tree, so the build, CI, and IDE already work. No new runtime. |
| JVM project, but testers or analysts who do not write Java must read or edit the tests | Functional | `karate-testing` | Tests are `.feature` files in Gherkin shape and are directly executable: no step-definition glue code to maintain. |
| `package.json`, or the team already has a Postman collection JSON in the repo | Functional | `postman-collections` | Author in the GUI, run the exact same collection headlessly in CI with `newman run`. |
| An OpenAPI (2.0/3.x) or GraphQL schema is committed or served, and you want broad coverage without hand-writing per-endpoint tests | Spec conformance | `schemathesis-fuzzing` | Generates inputs from your schema; coverage grows automatically as the schema grows. |
| An OpenAPI spec **and** the API is a resource lifecycle (`POST` creates, `GET` reads, `DELETE` removes), and you want security and reliability bugs | Stateful fuzzing | `restler-fuzzing` | Stateful REST API fuzzing; infers request dependencies to reach deeper service states. |
| The suite is green and you want to know how it behaves under network faults | Resilience | `api-chaos-runner` | Runs the functional suite under Toxiproxy-injected latency / timeouts / resets. |

Tie-breakers when two rows match: match the service's own language; a schema
flips the answer only for coverage goals (most teams end up with a small
hand-written suite **plus** Schemathesis, not one instead of the other);
fuzzers are additive, never first - get a functional suite green before
fuzzing; if nothing matches, use Postman + newman (needs only Node, works
against any HTTP API, portable collection JSON).

Universal traps regardless of tool: asserting only on the status code (assert
at least one body field too), order-dependent tests sharing server state
(create per-test data with unique keys), hardcoded environment URLs and
secrets (every tool has an environment mechanism - use it from the first
test), and pointing any of it at production (fuzzers generate requests
designed to be unusual - target local or staging).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [postman-collections](skills/postman-collections/SKILL.md) | Author Postman collections; run via Newman CLI; configure JUnit / JSON reporters for CI gating. |
| Skill | [restassured-testing](skills/restassured-testing/SKILL.md) | Author REST Assured (Java) given/when/then tests; status + JSON/XML path + OAuth2/Basic/API-key auth; run via JUnit 5 + Maven Failsafe. |
| Skill | [karate-testing](skills/karate-testing/SKILL.md) | Author Karate `.feature` files; use the `match` keyword with fuzzy validators; run via JUnit 5 + Maven Surefire. |
| Skill | [schemathesis-fuzzing](skills/schemathesis-fuzzing/SKILL.md) | Property-based API fuzzing from OpenAPI / GraphQL schema; canonical checks (status / schema / content-type / headers / 5xx); CLI + pytest integration. |
| Skill | [restler-fuzzing](skills/restler-fuzzing/SKILL.md) | Stateful API fuzzing with Microsoft RESTler: 4-stage workflow (compile → test → fuzz-lean → fuzz); bug buckets + replay logs. |
| Skill | [api-chaos-runner](skills/api-chaos-runner/SKILL.md) | Run API tests under Toxiproxy-injected latency / timeout / bandwidth / reset_peer; produce a resilience matrix. |
| Agent | [api-test-author](agents/api-test-author.md) | Authors one API test artifact per endpoint + scenario in the chosen tool's idiomatic shape (Postman request, REST Assured Java test, Karate feature, Schemathesis test, or RESTler grammar). Picks the tool from the decision table above when not specified. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-api-testing@testland-qa
```
