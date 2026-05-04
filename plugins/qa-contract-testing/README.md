# qa-contract-testing

Contract testing for microservices: Pact (consumer + provider + broker + can-i-deploy in one), OpenAPI / GraphQL / Protobuf compat checking, and a contract drift investigator.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [pact-contract-testing](skills/pact-contract-testing/SKILL.md) | S1 | Author Pact consumer tests, publish pact files to the Broker, verify on the provider, gate deploys with `can-i-deploy`. |
| skill | [openapi-contract-diff](skills/openapi-contract-diff/SKILL.md) | S1 | Diff two OpenAPI specs with `oasdiff breaking`; classify findings ERR/WARN/INFO; gate CI with `--fail-on`. |
| skill | [graphql-schema-regression](skills/graphql-schema-regression/SKILL.md) | S1 | Diff GraphQL schemas with `graphql-inspector`; classify BREAKING/DANGEROUS/NON_BREAKING; apply deprecation-aware rules. |
| skill | [protobuf-compat-checking](skills/protobuf-compat-checking/SKILL.md) | S1 | Wrap `buf breaking` with category selection (FILE/PACKAGE/WIRE_JSON/WIRE), ignore patterns, and CI gating. |
| skill | [contract-compatibility-gate](skills/contract-compatibility-gate/SKILL.md) | S3 | Aggregate Pact / oasdiff / graphql-inspector / buf-breaking verdicts into a single severity-aware go/no-go gate with markdown + JSON artifact for CI. |
| agent | [contract-drift-investigator](agents/contract-drift-investigator.md) | A1 | Diff current contracts vs last-known-green; categorize drift (provider-implementation / schema-rename / removal / narrowing / consumer-expectation / data-fixture / version-skew); route to owner. |

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
