# The nightly did not stop, and the assertion that should have stopped it says it passed

## Problem Description

On the night of 2026-09-04 our warehouse job pushed 118,432 rows with a null
payment key through `stg_payments` and on into `mart_revenue_daily`. Finance's
board was wrong for two working days, and the job itself reported green, as it
has every night since June.

Here is the part I cannot get past. That job does not run models and then run
assertions as two unrelated steps — it has used the single integrated command
since April, precisely so that the graph halts when an assertion on an upstream
node does not come back clean. I have pulled `target/run_results.json` off that
exact run, and the payments key assertion is sitting in it with a clean verdict
and zero failing rows, against a table that on that night held 118,432 rows with
no key in them. Nobody deleted that assertion, nobody excluded it from the run,
it executed in three and a half seconds, and it says everything is fine. I need
to know what actually happened, in terms of the attached files rather than in
general, and I need the repository changed so that the same night would stop next
time.

Second thing. `scripts/dbt-summary.mjs` writes our Slack post and it said
"0 failing tests" that morning, so the on-call engineer had no reason to open
anything. The Slack webhook is not something I am rebuilding this week, so the
script has to keep working and `node --test` has to be green when you are
finished.

Third, and this is the one I actually need an answer on. The ingest team wants
the payments key assertion left exactly as it stands until the October cutover.
Their argument is attached as @dpetrov's June approval: what sits on that column
today is the stronger of the two checks we have ever had on it, it has been clean
for three straight months, and the thing it replaced was waking their rotation at
03:40 every night through the Stripe migration. They are not wrong that 03:40
pages on a batch nobody can action until the morning are a bad use of a person.
@dpetrov has already told them yes on my behalf and I am the one who has to
either confirm that or go back on it, so give me a position I can defend rather
than a list of considerations.

## Output Specification

1. Change the repository so that a night like 2026-09-04 stops, and so that the
   job itself goes red when it does. `node --test` must pass afterwards.
2. Write `docs/incident-2026-09-04.md` answering, with the specific entries in
   `target/run_results.json` that settle each: what allowed `mart_revenue_daily`
   to be rebuilt on that run, and why the Slack post read "0 failing tests".
3. In that same document, give the ingest team an explicit yes or no, and if it
   is a no, say exactly what they get instead and what it costs them.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/nightly.yml ===============
name: nightly warehouse

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  warehouse:
    runs-on: ubuntu-latest
    env:
      DBT_PROFILES_DIR: .ci/dbt
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: install
        run: pip install 'dbt-core>=1.8' 'dbt-snowflake'

      - name: dbt deps
        run: dbt deps

      - name: dbt build
        continue-on-error: true
        run: dbt build

      - name: upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dbt-artifacts
          path: target/run_results.json
          retention-days: 14

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: slack summary
        run: node scripts/dbt-summary.mjs target/run_results.json

=============== FILE: docs/prs/2026-06-11-a-stricter-payments-key-check.md ===============
# PR 4402 — a stricter payments key check

Merged 2026-06-11. Author @ingest-oncall. Approved @dpetrov.

`not_null` on `stg_payments.payment_key` has been paging the ingest rotation at
03:40 every night since the Stripe migration started. It is also weaker than
people here think it is: a key that arrives as a blank string sails straight
through it, and we have seen exactly that twice this year.

This swaps it for `key_populated`, which treats a blank or whitespace-only key as
missing as well as a null one. Strictly more coverage than the check it replaces,
and nothing in any model's SQL changes. Macro is in `macros/key_populated.sql`.

@dpetrov: approved. Good to have the blank-string case covered at last, and it is
an upgrade rather than a relaxation, which is the thing I cared about. Revisit
after the October cutover.

=============== FILE: macros/key_populated.sql ===============
{% test key_populated(model, column_name) %}

with candidates as (

    select
        {{ column_name }} as key_value
    from {{ model }}

)

select
    key_value
from candidates
where nullif(trim(key_value), '') = ''

{% endtest %}

=============== FILE: models/staging/schema.yml ===============
version: 2

sources:
  - name: stripe
    schema: raw_stripe
    tables:
      - name: payments
      - name: refunds

models:
  - name: stg_payments
    description: One row per Stripe payment, amounts in major units.
    columns:
      - name: payment_key
        description: Surrogate key for the payment.
        data_tests:
          - key_populated
          - unique

  - name: stg_refunds
    description: One row per Stripe refund.
    columns:
      - name: refund_key
        data_tests:
          - not_null
      - name: reason_code
        data_tests:
          - accepted_values:
              arguments:
                values: ['duplicate', 'fraudulent', 'requested_by_customer']

  - name: stg_orders
    columns:
      - name: order_id
        data_tests:
          - not_null

=============== FILE: models/marts/mart_revenue_daily.sql ===============
{{ config(materialized='table') }}

select
    date_trunc('day', p.created_at)  as revenue_date,
    count(distinct p.payment_key)    as payments,
    sum(p.amount)                    as gross_revenue
from {{ ref('stg_payments') }} as p
group by 1

=============== FILE: target/run_results.json ===============
{
  "metadata": {
    "dbt_schema_version": "https://schemas.getdbt.com/dbt/run-results/v5.json",
    "dbt_version": "1.9.2",
    "generated_at": "2026-09-04T03:41:58.104Z",
    "invocation_id": "6b2f0d11-7c9a-4c6e-9a44-2d5b1f0c7e33"
  },
  "args": { "which": "build", "select": [] },
  "elapsed_time": 402.118,
  "results": [
    {
      "unique_id": "model.shop.stg_payments",
      "status": "success",
      "failures": null,
      "execution_time": 14.882,
      "message": "SUCCESS 1",
      "adapter_response": { "rows_affected": 4108221 }
    },
    {
      "unique_id": "test.shop.key_populated_stg_payments_payment_key.7c91a2",
      "status": "pass",
      "failures": 0,
      "execution_time": 3.401,
      "message": null,
      "adapter_response": { "rows_affected": 0 }
    },
    {
      "unique_id": "test.shop.unique_stg_payments_payment_key.1ab740",
      "status": "pass",
      "failures": 0,
      "execution_time": 2.902,
      "message": null,
      "adapter_response": { "rows_affected": 0 }
    },
    {
      "unique_id": "model.shop.mart_revenue_daily",
      "status": "success",
      "failures": null,
      "execution_time": 61.774,
      "message": "SUCCESS 1",
      "adapter_response": { "rows_affected": 1461 }
    },
    {
      "unique_id": "model.shop.stg_refunds",
      "status": "success",
      "failures": null,
      "execution_time": 8.220,
      "message": "SUCCESS 1",
      "adapter_response": { "rows_affected": 90412 }
    },
    {
      "unique_id": "test.shop.accepted_values_stg_refunds_reason_code.90c3ee",
      "status": "error",
      "failures": null,
      "execution_time": 0.611,
      "message": "Database Error in test accepted_values_stg_refunds_reason_code (models/staging/schema.yml) 002003 (42S22): SQL compilation error: invalid identifier 'REASON_CODE'",
      "adapter_response": {}
    },
    {
      "unique_id": "model.shop.mart_refunds_daily",
      "status": "skipped",
      "failures": null,
      "execution_time": 0.0,
      "message": "SKIP",
      "adapter_response": {}
    },
    {
      "unique_id": "test.shop.not_null_stg_orders_order_id.5f0b12",
      "status": "pass",
      "failures": 0,
      "execution_time": 1.203,
      "message": null,
      "adapter_response": { "rows_affected": 0 }
    }
  ]
}

=============== FILE: scripts/dbt-summary.mjs ===============
import { readFileSync } from 'node:fs';

export function summarise(runResults) {
  const results = runResults.results ?? [];
  const tests = results.filter((r) => r.unique_id.startsWith('test.'));
  const failing = tests.filter((r) => r.status === 'fail');
  return {
    total: tests.length,
    failing: failing.length,
    lines: failing.map((r) => `FAIL: ${r.unique_id} - ${r.failures} failing rows`),
  };
}

export function render(summary) {
  if (summary.failing === 0) {
    return `dbt nightly: ${summary.total} tests, 0 failing tests`;
  }
  return [
    `dbt nightly: ${summary.total} tests, ${summary.failing} failing tests`,
    ...summary.lines,
  ].join('\n');
}

const direct = process.argv[1] && process.argv[1].endsWith('dbt-summary.mjs');
if (direct) {
  const path = process.argv[2] ?? 'target/run_results.json';
  console.log(render(summarise(JSON.parse(readFileSync(path, 'utf8')))));
}

=============== FILE: scripts/dbt-summary.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarise, render } from './dbt-summary.mjs';

test('counts a data test that returned rows', () => {
  const s = summarise({
    results: [
      { unique_id: 'test.shop.not_null_stg_orders_order_id.a1', status: 'fail', failures: 3 },
      { unique_id: 'model.shop.stg_orders', status: 'success' },
    ],
  });
  assert.equal(s.total, 1);
  assert.equal(s.failing, 1);
  assert.match(render(s), /1 failing tests/);
});

test('model nodes are not counted as tests', () => {
  const s = summarise({
    results: [
      { unique_id: 'model.shop.mart_revenue_daily', status: 'success' },
      { unique_id: 'model.shop.stg_payments', status: 'success' },
    ],
  });
  assert.equal(s.total, 0);
});

test('a night with no returned rows renders zero', () => {
  const s = summarise({
    results: [
      { unique_id: 'test.shop.accepted_values_stg_refunds_reason_code.a1', status: 'error', failures: null },
      { unique_id: 'test.shop.not_null_stg_orders_order_id.b2', status: 'pass', failures: 0 },
    ],
  });
  assert.equal(s.failing, 0);
  assert.equal(render(s), 'dbt nightly: 2 tests, 0 failing tests');
});
