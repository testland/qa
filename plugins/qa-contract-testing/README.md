# qa-contract-testing

Contract testing for microservices: Pact (consumer + provider + broker + can-i-deploy in one), OpenAPI / GraphQL / Protobuf compat checking, and a contract drift investigator.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [pact-contract-testing](skills/pact-contract-testing/SKILL.md) | S1 | Author Pact consumer tests, publish pact files to the Broker, verify on the provider, gate deploys with `can-i-deploy`. |
| Skill | [openapi-contract-diff](skills/openapi-contract-diff/SKILL.md) | S1 | Diff two OpenAPI specs with `oasdiff breaking`; classify findings ERR/WARN/INFO; gate CI with `--fail-on`. |
| Skill | [graphql-schema-regression](skills/graphql-schema-regression/SKILL.md) | S1 | Diff GraphQL schemas with `graphql-inspector`; classify BREAKING/DANGEROUS/NON_BREAKING; apply deprecation-aware rules. |
| Skill | [protobuf-compat-checking](skills/protobuf-compat-checking/SKILL.md) | S1 | Wrap `buf breaking` with category selection (FILE/PACKAGE/WIRE_JSON/WIRE), ignore patterns, and CI gating. |
| Skill | [contract-compatibility-gate](skills/contract-compatibility-gate/SKILL.md) | S3 | Aggregate Pact / oasdiff / graphql-inspector / buf-breaking verdicts into a single severity-aware go/no-go gate with markdown + JSON artifact for CI. |
| Agent | [contract-drift-investigator](agents/contract-drift-investigator.md) | A1 | Diff current contracts vs last-known-green; categorize drift (provider-implementation / schema-rename / removal / narrowing / consumer-expectation / data-fixture / version-skew); route to owner. |
| Agent | [contract-test-scaffolder](agents/contract-test-scaffolder.md) | A4 | Read OpenAPI / GraphQL SDL / Protobuf / existing pact and emit scaffolded Pact consumer or provider tests, schemathesis fuzzing runners, or `buf breaking` baselines - never inventing example values the artifact does not declare. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-contract-testing@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
