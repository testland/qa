# qa-contract-testing

Contract testing for microservices: Pact (consumer + provider + broker + can-i-deploy in one), OpenAPI / GraphQL / Protobuf compat checking, and a contract drift investigator.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [pact-contract-testing](skills/pact-contract-testing/SKILL.md) | Author Pact consumer tests, publish pact files to the Broker, verify on the provider, gate deploys with `can-i-deploy`. |
| Skill | [openapi-contract-diff](skills/openapi-contract-diff/SKILL.md) | Diff two OpenAPI specs with `oasdiff breaking`; classify findings ERR/WARN/INFO; gate CI with `--fail-on`. |
| Skill | [graphql-schema-regression](skills/graphql-schema-regression/SKILL.md) | Diff GraphQL schemas with `graphql-inspector`; classify BREAKING/DANGEROUS/NON_BREAKING; apply deprecation-aware rules. |
| Skill | [protobuf-compat-checking](skills/protobuf-compat-checking/SKILL.md) | Wrap `buf breaking` with category selection (FILE/PACKAGE/WIRE_JSON/WIRE), ignore patterns, and CI gating. |
| Skill | [contract-compatibility-gate](skills/contract-compatibility-gate/SKILL.md) | Aggregate Pact / oasdiff / graphql-inspector / buf-breaking verdicts into a single severity-aware go/no-go gate with markdown + JSON artifact for CI. |
| Agent | [contract-drift-investigator](agents/contract-drift-investigator.md) | Diff current contracts vs last-known-green; categorize drift (provider-implementation / schema-rename / removal / narrowing / consumer-expectation / data-fixture / version-skew); route to owner. |
| Agent | [contract-test-scaffolder](agents/contract-test-scaffolder.md) | Read OpenAPI / GraphQL SDL / Protobuf / existing pact and emit scaffolded Pact consumer or provider tests, schemathesis fuzzing runners, or `buf breaking` baselines - never inventing example values the artifact does not declare. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-contract-testing@testland-qa
```
