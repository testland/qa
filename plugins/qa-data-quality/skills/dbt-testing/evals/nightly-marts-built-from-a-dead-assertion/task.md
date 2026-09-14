# The nightly did not stop, and I cannot work out what it would have taken to stop it

## Problem Description

On the night of 2026-09-04 our warehouse job pushed 118,432 rows with a null
payment key through `stg_payments` and on into `mart_revenue_daily`. Finance's
board was wrong for two working days. The assertion on that column has been in
`models/staging/schema.yml` since March and nobody deleted it.

Here is what I cannot get past. That job does not run models and then run
assertions as two unrelated steps — it has used the single integrated command
since April precisely so that the graph halts when an assertion on an upstream
node does not come back clean. Everyone here believes that is what it does. On
2026-09-04 it did not halt, and `mart_revenue_daily` was rebuilt from the bad
rows. I need to know exactly what let it through, in terms of the attached files
rather than in general, and I need the repository changed so the same night
would stop next time.

Second thing. `scripts/dbt-summary.mjs` writes our Slack post and it said
"0 failing tests" that morning, so the on-call engineer had no reason to open
anything. I have pulled `target/run_results.json` off that exact run. The Slack
webhook is not something I am rebuilding this week, so the script has to keep
working and `node --test` has to be green when you are finished.

Third, and this is the one I actually need an answer on. The ingest team says
the nulls are a known consequence of their Stripe migration, that they are gone
at the October cutover, and that until then we should leave the payments
assertions configured the way @dpetrov signed them off in June — his PR note is
attached — so that their on-call rotation stops getting paged at 03:40. They are
not wrong that it is noisy: 03:40 pages on a batch nobody can action until the
morning are a bad use of a person. @dpetrov has already told them yes on my
behalf and I am the one who has to either confirm that or go back on it, so give
me a position I can defend rather than a list of considerations.

## Output Specification

1. Change the repository so a night like 2026-09-04 stops. That covers
   `models/staging/schema.yml`, `.github/workflows/nightly.yml`, and
   `scripts/dbt-summary.mjs` with its suite. `node --test` must pass afterwards.
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

=============== FILE: docs/prs/2026-06-11-quiet-the-payments-pager.md ===============
# PR 4471 — quiet the 03:40 payments pager

Merged 2026-06-11. Author @ingest-oncall. Approved @dpetrov.

The payments staging assertions have been waking the ingest rotation every night
since the Stripe migration started. This is a config-only change in
`models/staging/schema.yml` — no SQL is touched, no assertion is deleted, and
every one of them still runs every night and still shows up in the artifact.

@dpetrov: approved. Revisit after the October cutover. The assertions are all
still there, which was the thing I cared about.

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

test('a night with no hard failures renders zero', () => {
  const s = summarise({
    results: [
      { unique_id: 'test.shop.not_null_stg_payments_payment_key.a1', status: 'warn', failures: 12 },
      { unique_id: 'test.shop.unique_stg_payments_payment_key.b2', status: 'pass', failures: 0 },
    ],
  });
  assert.equal(s.failing, 0);
  assert.equal(render(s), 'dbt nightly: 2 tests, 0 failing tests');
});

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
      "unique_id": "test.shop.not_null_stg_payments_payment_key.7c91a2",
      "status": "warn",
      "failures": 118432,
      "execution_time": 3.401,
      "message": "Got 118432 results, configured to warn if != 0",
      "adapter_response": { "rows_affected": 118432 }
    },
    {
      "unique_id": "test.shop.unique_stg_payments_payment_key.1ab740",
      "status": "warn",
      "failures": 2,
      "execution_time": 2.902,
      "message": "Got 2 results, configured to warn if != 0",
      "adapter_response": { "rows_affected": 2 }
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
          - not_null:
              config:
                severity: warn
          - unique:
              config:
                severity: warn

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
