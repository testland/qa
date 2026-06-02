---
name: sqlmesh-migrations
description: "Authors and runs SQLMesh - data-transformation framework with version control, virtual data environments, automatic breaking-vs-non-breaking change classification, and downstream impact analysis; supports `sqlmesh init` / `plan` / `apply` / `run` / `audit` / `test` lifecycle; covers DuckDB, Postgres, Snowflake, BigQuery, Redshift, Databricks. Use when the user works with SQL data pipelines (warehouse + dbt-adjacent ELT), needs safer model evolution than dbt's deploy-and-pray, or wants the strongest impact-analysis story in the OSS data tooling space."
rating: 23
d6: 4
archetype: S1
---

# sqlmesh-migrations

## Overview

Per [sqlmesh.readthedocs.io/en/stable/quickstart/cli/][sm-cli]:

[sm-cli]: https://sqlmesh.readthedocs.io/en/stable/quickstart/cli/

SQLMesh is a data transformation tool that enables version control
and testing for SQL pipelines. Its distinguishing features vs
schema-only tools (Flyway / Liquibase / Atlas):

- **Virtual data environments**: per [sm-cli][sm-cli], "A SQLMesh
  environment is an isolated namespace containing models and the
  data they generated." Develop changes in a `dev` env without
  touching `prod` data.
- **Breaking-change classification**: per [sm-cli][sm-cli], SQLMesh
  categorizes changes as "**breaking** or **non-breaking**. Breaking
  changes invalidate existing data (e.g., adding a `WHERE` clause).
  Non-breaking changes preserve validity of existing data (e.g.,
  adding a new column)."
- **Downstream impact analysis**: per [sm-cli][sm-cli], "SQLMesh
  automatically detects when modifications to upstream models affect
  downstream dependents." Both "Directly Modified" and "Indirectly
  Modified" models surfaced before deploy.

## When to use

- The repo has SQL/Python data models (warehouse-side ELT) and
  needs version control + impact analysis beyond dbt.
- The team migrates from dbt and wants stronger schema-evolution
  semantics (vs dbt's "rebuild-everything" default).
- The user works with DuckDB, Postgres, Snowflake, BigQuery,
  Redshift, or Databricks.
- A staging-to-prod promotion needs explicit breaking-vs-non-breaking
  review before apply.

## Step 1 - Install

Per [sm-cli][sm-cli]:

```bash
pip install sqlmesh
```

Optionally with extras for specific engines (e.g.,
`pip install sqlmesh[bigquery]`).

## Step 2 - Initialize a project

Per [sm-cli][sm-cli]:

```bash
sqlmesh init <dialect>
# example:
sqlmesh init duckdb
```

Generates project skeleton: `config.yaml`, `models/`, `macros/`,
`tests/`, `audits/`, `seeds/`.

## Step 3 - Author a model

A SQLMesh model is a SQL (or Python) file in `models/` with a
`MODEL` directive header:

```sql
-- models/sales/orders_summary.sql
MODEL (
  name sales.orders_summary,
  kind FULL,
  cron '@daily',
  owner 'data-team@example.com',
  description 'Daily summary of orders by customer'
);

SELECT
  customer_id,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount
FROM sales.orders
GROUP BY customer_id;
```

Model kinds (per SQLMesh docs): `FULL` (rebuild every run),
`INCREMENTAL_BY_TIME_RANGE` (process new time partitions),
`INCREMENTAL_BY_UNIQUE_KEY` (upsert by key), `VIEW` (no persisted
table), `SEED` (static data).

## Step 4 - Plan + apply (the core workflow)

Per [sm-cli][sm-cli]:

```bash
sqlmesh plan dev
```

`plan` shows:
- Modified models (Directly + Indirectly)
- Each change classified as **breaking** or **non-breaking**
- Backfill plan (how much data needs reprocessing)

The user reviews the plan, then confirms - `plan` is **integrated
with apply**: confirming the plan applies it.

```bash
sqlmesh plan prod  # promote dev to prod
```

The promotion is virtual until apply: `prod` continues serving
existing data until the new env is built.

## Step 5 - Run scheduled execution

```bash
sqlmesh run
```

Runs models per their `cron` schedule. Typically scheduled in CI/CD
(daily / hourly), `sqlmesh run` checks each model and executes if
its cron is due.

## Step 6 - Audits

Audits are SQL-based data-quality checks attached to models:

```sql
-- audits/no_null_amounts.sql
AUDIT (
  name no_null_amounts,
);
SELECT * FROM @this_model WHERE amount IS NULL;
```

```bash
sqlmesh audit
```

Returns failures if the audit query returns any rows.

Compare with [`great-expectations`](../../qa-data-quality/skills/great-expectations/SKILL.md)
and [`soda-checks`](../../qa-data-quality/skills/soda-checks/SKILL.md):
SQLMesh audits are tightly coupled to SQLMesh models; GE/Soda are
standalone data-quality frameworks. Choose audits when you're
already in SQLMesh; GE/Soda for cross-framework data quality.

## Step 7 - Tests (unit tests on models)

Unlike audits (which run on real data), tests run on synthetic
input → synthetic output:

```yaml
# tests/test_orders_summary.yaml
test_orders_summary:
  model: sales.orders_summary
  inputs:
    sales.orders:
      - { customer_id: 1, amount: 100.00 }
      - { customer_id: 1, amount: 200.00 }
      - { customer_id: 2, amount: 50.00 }
  outputs:
    query:
      - { customer_id: 1, order_count: 2, total_amount: 300.00 }
      - { customer_id: 2, order_count: 1, total_amount: 50.00 }
```

```bash
sqlmesh test
```

## Step 8 - CI integration

```yaml
- run: pip install sqlmesh
- run: sqlmesh test                                 # unit tests
- run: sqlmesh plan ci-${{ github.run_id }} --no-prompts  # build a per-PR env
- run: sqlmesh audit                                # data-quality checks
# Promotion to prod is a separate workflow with manual approval gate
```

The per-PR env approach gives full data-pipeline isolation: each PR
materializes its own copy of the models, audits run against real
PR data, and merge-then-promote is the production path.

## Step 9 - Composition with sister tools

Pair with [`migration-blast-radius-reviewer`](../../agents/migration-blast-radius-reviewer.md)
for adversarial review of breaking changes - `sqlmesh plan` already
classifies, but the reviewer adds estimation of downstream consumer
impact (BI dashboards, downstream services) that SQLMesh's model
graph alone doesn't capture.

For underlying schema migrations (DDL on the warehouse, separate
from SQLMesh model changes), use [`flyway-migrations`](../flyway-migrations/SKILL.md)
or [`atlas-migrations`](../atlas-migrations/SKILL.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `sqlmesh apply` directly to prod without dev plan | No review of breaking-vs-non-breaking; broken pipelines | Always `plan dev` first (Step 4) |
| Use `kind FULL` for everything | Full rebuilds expensive on large tables | Pick `INCREMENTAL_BY_TIME_RANGE` / `BY_UNIQUE_KEY` per model semantics |
| Skip audits on critical models | Data drift goes undetected | Audit every transformation (Step 6) |
| Write tests against production data instead of synthetic | Tests pass-by-accident; brittle | Use the `inputs`/`outputs` test format (Step 7) |
| Treat SQLMesh as schema-migration tool | SQLMesh manages data models, not raw DDL | Pair with Flyway/Atlas for raw schema (Step 9) |

## Limitations

- Newer than dbt; smaller community + ecosystem (extensions,
  adapters).
- Steeper learning curve for the virtual environments concept (vs
  dbt's "single shared dev/prod" default).
- Engine support is broader than dbt's (DuckDB-first), but
  vendor-specific feature coverage varies by engine.
- Migration-from-dbt is non-trivial - model metadata maps roughly
  but tests / macros / sources / packages need translation.

## References

- [sm-cli][sm-cli] - quickstart CLI walkthrough
- sqlmesh.readthedocs.io - full documentation
- github.com/TobikoData/sqlmesh - repository
- [`flyway-migrations`](../flyway-migrations/SKILL.md),
  [`liquibase-migrations`](../liquibase-migrations/SKILL.md),
  [`atlas-migrations`](../atlas-migrations/SKILL.md) - sister tools
  (DDL-focused; SQLMesh complements them at the data-model layer)
- [`dbt-testing`](../../qa-data-quality/skills/dbt-testing/SKILL.md),
  [`great-expectations`](../../qa-data-quality/skills/great-expectations/SKILL.md),
  [`soda-checks`](../../qa-data-quality/skills/soda-checks/SKILL.md) - sister data-quality frameworks
- [`migration-blast-radius-reviewer`](../../agents/migration-blast-radius-reviewer.md) - adversarial reviewer
