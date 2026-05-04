# qa-api-testing

API testing across Postman/Newman, RestAssured, Karate, Tavern; Schemathesis + RESTler fuzzing; and an API chaos runner that injects latency / error rates during test runs.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [postman-collections](skills/postman-collections/SKILL.md) | S1 | Author Postman collections; run via Newman CLI; configure JUnit / JSON reporters for CI gating. |
| skill | [restassured-testing](skills/restassured-testing/SKILL.md) | S1 | Author REST Assured (Java) given/when/then tests; status + JSON/XML path + OAuth2/Basic/API-key auth; run via JUnit 5 + Maven Failsafe. |

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
