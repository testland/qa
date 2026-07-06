# qa-api-testing

API testing across Postman/Newman, RestAssured, Karate, Tavern; Schemathesis + RESTler fuzzing; and an API chaos runner that injects latency / error rates during test runs.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [postman-collections](skills/postman-collections/SKILL.md) | Author Postman collections; run via Newman CLI; configure JUnit / JSON reporters for CI gating. |
| Skill | [restassured-testing](skills/restassured-testing/SKILL.md) | Author REST Assured (Java) given/when/then tests; status + JSON/XML path + OAuth2/Basic/API-key auth; run via JUnit 5 + Maven Failsafe. |
| Skill | [karate-testing](skills/karate-testing/SKILL.md) | Author Karate `.feature` files; use the `match` keyword with fuzzy validators; run via JUnit 5 + Maven Surefire. |
| Skill | [tavern-testing](skills/tavern-testing/SKILL.md) | YAML-based API tests (`test_*.tavern.yaml`) auto-discovered by pytest; built-in matchers + variable saving across stages. |
| Skill | [schemathesis-fuzzing](skills/schemathesis-fuzzing/SKILL.md) | Property-based API fuzzing from OpenAPI / GraphQL schema; canonical checks (status / schema / content-type / headers / 5xx); CLI + pytest integration. |
| Skill | [restler-fuzzing](skills/restler-fuzzing/SKILL.md) | Stateful API fuzzing with Microsoft RESTler: 4-stage workflow (compile → test → fuzz-lean → fuzz); bug buckets + replay logs. |
| Skill | [api-chaos-runner](skills/api-chaos-runner/SKILL.md) | Run API tests under Toxiproxy-injected latency / timeout / bandwidth / reset_peer; produce a resilience matrix. |
| Agent | [api-test-tool-selector](agents/api-test-tool-selector.md) | Reads target API project markers (`*.openapi.yaml` / `*.proto` / `*.graphql` / Postman collection / language stack) plus testing goal (functional vs fuzzing vs chaos) and recommends one tool from the 7 skills above with rationale and the matching SKILL.md to read next. |
| Agent | [api-test-author](agents/api-test-author.md) | Authors one API test artifact per endpoint + scenario in the chosen tool's idiomatic shape (Postman request, REST Assured Java test, Karate feature, Tavern YAML stage, Schemathesis test, RESTler grammar, or Chaos Runner scenario). Sibling of qa-mobile/mobile-test-author. |
| Skill | [api-testing-getting-started](skills/api-testing-getting-started/SKILL.md) | Junior on-ramp: what API testing is, which tool to pick, and a first request + assertion. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-api-testing@testland-qa
```
