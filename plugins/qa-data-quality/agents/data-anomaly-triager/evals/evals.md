---
component: data-anomaly-triager
type: agent
---

# data-anomaly-triager - evals

Companion eval cases for [`data-anomaly-triager`](../../data-anomaly-triager.md).
Three cases cover happy path / branch / adversarial: a dbt `not_null`
failure on 47 rows (verdict `missing`), a GX range check failing on
12.2% of rows (verdict `drift`), and a non-data-quality input (a CI
pipeline error log) that has no failure record to classify - the agent
must refuse to assign one of the five categories. Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

Target models for re-runs: `sonnet`, `haiku`, `opus`. Dates recorded
below are the eval-authoring date - each case is designed to be
reproducible against any tier.

## Eval 1 - happy path - dbt not_null fails (missing)

**Input:**

```
Triage this data-quality failure.

Engine: dbt
Failure record from `target/run_results.json`:

{
  "unique_id": "test.shop.not_null_customers_email",
  "status": "fail",
  "failures": 47,
  "message": "Got 47 failed records",
  "execution_time": 0.83
}

Total rows in customers: ~120,000.
Failed-row count: 47 (<<1% of rows).

`git blame models/customers.sql` on the `email` column line:
  commit abc1234 (@etl-team, 2 weeks ago)
  Author: etl-team@example.com
  Subject: "Add email passthrough from raw_customers"

schema.yml for the customers model declares:
  meta:
    owner: "@etl-team"

Last passing run of this test: 3 days ago (per `target/run_results.json`
history in CI artifacts).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 classifies as `missing` per the classification
table: "not_null / missing_count failure; ExpectColumnValuesToNotBeNull
fails → Ingestion gap or upstream NULL; check the source extractor
first." Step 3 identifies `@etl-team` as the owner (via git blame +
meta:owner). Step 4 emits the triage record with verdict `missing`,
subject `customers.email`, failures 47, owner `@etl-team`,
recommendation to inspect the upstream extractor first (per the
table's "Typical remediation" column). Matches the "Example 1"
pattern in the agent body.

**Pass condition:** Output contains the literal string `verdict: missing`
(or `verdict: \`missing\``) AND the literal string `@etl-team` AND
mentions one of `upstream extractor` / `ingestion` / `source` /
`extractor` as the recommended next step. Output does NOT classify the
finding as `drift` or `outlier` or `referential` or `freshness`.

## Eval 2 - branch - GX range check fails on 12.2% of rows (drift)

**Input:**

```
Triage this data-quality failure.

Engine: gx
Failure record from a saved validation result:

{
  "success": false,
  "expectation_config": {
    "type": "expect_column_values_to_be_between",
    "kwargs": {
      "column": "discount_pct",
      "min_value": 0,
      "max_value": 100
    }
  },
  "result": {
    "element_count": 50000,
    "unexpected_count": 6100,
    "unexpected_percent": 12.2
  }
}

Suite metadata:
  meta:
    owner: "@analytics-eng"

Table: orders.discount_pct
Last passing run: unknown (Data Docs history truncated).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 classifies as `drift` per the classification table:
"Range / distribution check fails with **high** row count (>1% of
rows) → systemic upstream business logic change; loop in the
data-product owner." (12.2% of 50000 rows is well above the 1%
threshold called out in the agent body.) Step 3 identifies
`@analytics-eng` as the owner (suite metadata). Step 4 emits the
triage record with verdict `drift`, subject `orders.discount_pct`,
failures 6100 / 50000 (12.2%), recommendation to loop in the
data-product owner and inspect the unexpected-values list with
`result_format: COMPLETE`. Matches the "Example 2" pattern in the
agent body.

**Pass condition:** Output contains the literal string `verdict: drift`
(or `verdict: \`drift\``) AND the literal string `12.2` (or
`6100 / 50000`) AND mentions one of `data-product owner` / `business
logic` / `systemic` / `upstream`. Output does NOT classify the finding
as `missing` AND does NOT classify it as `outlier` (which is the
small-count counterpart explicitly distinguished by scale in the agent
body).

## Eval 3 - adversarial - input is a CI pipeline error, not a data-quality failure (refuse)

**Input:**

```
Triage this failure.

CI pipeline log (excerpt):

[10:42:15] dbt run --select orders+
[10:42:15] Running with dbt=1.7.4
[10:42:16] Found 12 models, 0 tests, 0 snapshots
[10:42:18] Concurrency: 4 threads
[10:42:18] 1 of 12 START sql view model staging.stg_orders
[10:42:18] 1 of 12 ERROR creating sql view model staging.stg_orders
            ............................................. [ERROR in 0.07s]

[10:42:18] Database Error in model stg_orders (models/staging/stg_orders.sql)
[10:42:18]   could not connect to server: Connection refused
[10:42:18]   Is the server running on host "warehouse.internal" (10.0.4.7)
            and accepting TCP/IP connections on port 5432?

Engine: dbt (but this is a `dbt run` failure, not a `dbt test` failure —
no entry in run_results.json with status=fail on a TEST).

The team is asking: please classify this anomaly into one of
missing / referential / freshness / outlier / drift.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** The agent recognizes that the input is NOT a data-quality
failure record. It is a database connectivity error during model
materialization (`dbt run`), not a `dbt test` failure with
`status == "fail"` on a not_null / relationships / range / freshness
check. None of the five categories
(`missing` / `referential` / `freshness` / `outlier` / `drift`)
applies - this is an infrastructure issue. The agent refuses to assign
a category, explains the input shape it expected (a `dbt test` failure
with `status: fail` per the run-results JSON, a GX validation result
with `success: false`, or a Soda `FAIL` scan line), and routes the
failure to the appropriate owner (data-platform / DevOps / SRE) rather
than the data-product owner.

**Pass condition:** Output mentions one of `not a data-quality
failure` / `not a test failure` / `connectivity` / `infrastructure` /
`materialization` / `dbt run` (distinguishing it from `dbt test`) AND
does NOT contain a `verdict: missing` line, a `verdict: drift` line,
a `verdict: outlier` line, a `verdict: referential` line, or a
`verdict: freshness` line.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to run dbt / GX / Soda.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (verdict category names are
  defined verbatim in the agent's classification table).
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(jq *)`, `Bash(git log|blame *)`) is read-only - eval re-runs
  cannot modify the warehouse, the dbt project, or git history.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
