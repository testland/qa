# qa-data-quality

Data quality testing for analytical pipelines: dbt-tests, Great Expectations, Soda, schema drift detection, and a data-quality engineer agent.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [dbt-testing](skills/dbt-testing/SKILL.md) | S1 | Author and run dbt data tests (generic, singular, custom-macro), parse run_results.json, gate `dbt build` on test results. |
| skill | [great-expectations](skills/great-expectations/SKILL.md) | S1 | Author GX Core ExpectationSuites + Checkpoints; run validations on Pandas/SQL/Spark batches; parse JSON results for CI gating. |
| skill | [soda-checks](skills/soda-checks/SKILL.md) | S1 | Author SodaCL checks against SQL warehouses; configure scan profiles; gate CI on `soda scan` exit code. |
| skill | [data-quality-gate](skills/data-quality-gate/SKILL.md) | S3 | Aggregate dbt / GX / Soda check results into a single severity-aware go/no-go gate with markdown + JSON artifact for CI. |
| agent | [schema-diff-reviewer](agents/schema-diff-reviewer.md) | A1 | Review a DB schema diff for breaking-vs-additive changes, missing data tests, and downstream consumer impact; returns a Critical/Warning/Info findings table. |
| agent | [data-anomaly-triager](agents/data-anomaly-triager.md) | A1 | Classify a data-quality failure (dbt/GX/Soda) into drift / outlier / missing / referential / freshness with owner routing and remediation. |
| agent | [data-quality-engineer](agents/data-quality-engineer.md) | A2 | Build an initial coverage suite for a data product: read schema + sample, generate dbt/GX/Soda artifacts, run once. |
| skill | [data-quality-conventions](skills/data-quality-conventions/SKILL.md) | S2 | Reference catalog: engine selection, column/table coverage, severity tiering, freshness/SLA conventions, anti-patterns. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-data-quality@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
