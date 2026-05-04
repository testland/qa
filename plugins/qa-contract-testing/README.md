# qa-contract-testing

Contract testing for microservices: Pact (consumer + provider + broker + can-i-deploy in one), OpenAPI / GraphQL / Protobuf compat checking, and a contract drift investigator.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [pact-contract-testing](skills/pact-contract-testing/SKILL.md) | S1 | Author Pact consumer tests, publish pact files to the Broker, verify on the provider, gate deploys with `can-i-deploy`. |
| skill | [openapi-contract-diff](skills/openapi-contract-diff/SKILL.md) | S1 | Diff two OpenAPI specs with `oasdiff breaking`; classify findings ERR/WARN/INFO; gate CI with `--fail-on`. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-contract-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
