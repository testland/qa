# qa-data-quality

Data quality testing for analytical pipelines: dbt-tests, Great Expectations, Soda, schema drift detection, anomaly triage, and schema-diff review.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [dbt-testing](skills/dbt-testing/SKILL.md) | Author and run dbt data tests (generic, singular, custom-macro), parse run_results.json, gate `dbt build` on test results. |
| Skill | [great-expectations](skills/great-expectations/SKILL.md) | Author GX Core ExpectationSuites + Checkpoints; run validations on Pandas/SQL/Spark batches; parse JSON results for CI gating. |
| Skill | [soda-checks](skills/soda-checks/SKILL.md) | Author SodaCL checks against SQL warehouses; configure scan profiles; gate CI on `soda scan` exit code. |
| Skill | [data-quality-gate](skills/data-quality-gate/SKILL.md) | Aggregate dbt / GX / Soda check results into a single severity-aware go/no-go gate with markdown + JSON artifact for CI. |
| Agent | [schema-diff-reviewer](agents/schema-diff-reviewer.md) | Review a DB schema diff for breaking-vs-additive changes, missing data tests, and downstream consumer impact; returns a Critical/Warning/Info findings table. |
| Agent | [data-anomaly-triager](agents/data-anomaly-triager.md) | Classify a data-quality failure (dbt/GX/Soda) into drift / outlier / missing / referential / freshness with owner routing and remediation. |
| Skill | [data-quality-conventions](skills/data-quality-conventions/SKILL.md) | Reference catalog: engine selection, column/table coverage, severity tiering, freshness/SLA conventions, anti-patterns. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-data-quality@testland-qa
```
