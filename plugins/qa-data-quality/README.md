# qa-data-quality

Data quality testing for analytical pipelines: dbt-tests, Great Expectations, Soda, schema drift detection, and a data-quality engineer agent.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [dbt-testing](skills/dbt-testing/SKILL.md) | S1 | Author and run dbt data tests (generic, singular, custom-macro), parse run_results.json, gate `dbt build` on test results. |

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
