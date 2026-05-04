# qa-api-testing

API testing across Postman/Newman, RestAssured, Karate, Tavern; Schemathesis + RESTler fuzzing; and an API chaos runner that injects latency / error rates during test runs.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [postman-collections](skills/postman-collections/SKILL.md) | S1 | Author Postman collections; run via Newman CLI; configure JUnit / JSON reporters for CI gating. |
| skill | [restassured-testing](skills/restassured-testing/SKILL.md) | S1 | Author REST Assured (Java) given/when/then tests; status + JSON/XML path + OAuth2/Basic/API-key auth; run via JUnit 5 + Maven Failsafe. |
| skill | [karate-testing](skills/karate-testing/SKILL.md) | S1 | Author Karate `.feature` files; use the `match` keyword with fuzzy validators; run via JUnit 5 + Maven Surefire. |
| skill | [tavern-testing](skills/tavern-testing/SKILL.md) | S1 | YAML-based API tests (`test_*.tavern.yaml`) auto-discovered by pytest; built-in matchers + variable saving across stages. |
| skill | [schemathesis-fuzzing](skills/schemathesis-fuzzing/SKILL.md) | S1 | Property-based API fuzzing from OpenAPI / GraphQL schema; canonical checks (status / schema / content-type / headers / 5xx); CLI + pytest integration. |
| skill | [restler-fuzzing](skills/restler-fuzzing/SKILL.md) | S1 | Stateful API fuzzing with Microsoft RESTler: 4-stage workflow (compile → test → fuzz-lean → fuzz); bug buckets + replay logs. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-api-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
