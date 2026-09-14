# Six weeks of green nights from three checks I am no longer sure ever ran

## Problem Description

After the duplicate-refund mess in July I wrote three assertions by hand as `.sql`
files and put them in `tests/`. That was 2026-07-29. Since then the nightly has
been green every single night — 43 for 43 — which I would like to believe and do
not, because last Tuesday finance pulled the refunds ledger and found 904 refunds
sharing a payment intent with another refund. Same shape as July. Nothing fired.

Attached: the three `.sql` files, `dbt_project.yml`, `selectors.yml`, the workflow,
the schema file that carries our column-level assertions, the tail of last
Thursday's console output, and a small Node lint we run over `tests/*.sql` in CI.

Two theories are in the air and I have no way to choose between them. Mine is that
my SQL is wrong — I have rewritten `assert_no_duplicate_refunds.sql` twice and
neither rewrite changed anything about the nightly, which is the part that has
started to bother me. Our warehouse lead is fairly confident it is a grants
problem: he thinks the nightly role cannot see the refunds schema, so the
assertions come back on an empty relation and report clean. He says that would
explain six weeks of green exactly. Nobody has checked either theory against the
console output, which is the thing I am asking you to do.

Then make all three of those assertions genuinely run, and satisfy yourself that
each one would actually do its job on the first night it runs rather than looking
like it would. If any of them would not, fix it and say what was wrong with it.

Two constraints. The column-level assertions in `models/schema.yml` are not what
this is about — leave them. And I have a board review on Monday morning, so I need
to know now if turning these on is going to put the nightly red between here and
then, because if it is I will need to tell somebody rather than have them find out.

One more thing, because I will be asked. Of the three assertions as written, which
one would have caught last Tuesday's duplicates, and would it have caught them on
the night they first appeared or only after they accumulated? Answer that from the
SQL in front of you, not from what the file names promise.

## Output Specification

1. Make whatever repository changes are required for all three `.sql` assertions
   to be collected and executed by the nightly, and for each of them to report
   correctly when it is. `node --test` must still pass.
2. Write `docs/why-nothing-fired.md`: what the nightly actually executed on the
   attached run against what exists in the repository, the root cause, which of
   the two theories above the console output rules out and on what line, and the
   answer to the question about which assertion would have caught the duplicates.
3. `scripts/check-test-sql.mjs` is the CI lint over `tests/*.sql`. Whatever you
   had to change inside those files, give the lint the ability to catch it next
   time, with a test for it.

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

      - run: pip install 'dbt-core>=1.8' 'dbt-snowflake'

      - run: dbt deps

      - name: nightly build
        run: dbt build --selector nightly

      - name: upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dbt-artifacts
          path: target/run_results.json
          retention-days: 14

=============== FILE: selectors.yml ===============
selectors:
  - name: nightly
    description: what the 03:00 warehouse job builds
    default: false
    definition:
      union:
        - 'path:models'
        - 'test_type:generic'

=============== FILE: dbt_project.yml ===============
name: 'ledger'
version: '2.4.0'
config-version: 2

profile: 'ledger'

model-paths: ["models"]
seed-paths: ["seeds"]
test-paths: ["tests"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  ledger:
    +materialized: view
    marts:
      +materialized: table

=============== FILE: tests/assert_no_duplicate_refunds.sql ===============
{#
  One row per (payment_intent_id) that has more than one refund against it.
  Rewritten 2026-08-14 and again 2026-08-27 - neither changed the nightly.
#}

select
    payment_intent_id,
    count(*) as refund_count
from {{ ref('stg_refunds') }}
where payment_intent_id is not null
group by payment_intent_id
having count(*) > 1;

=============== FILE: tests/assert_refund_not_exceeding_payment.sql ===============
{# A refund may never be larger than the payment it is issued against. #}

select
    r.refund_id,
    r.amount        as refund_amount,
    p.amount        as payment_amount
from {{ ref('stg_refunds') }} as r
join {{ ref('stg_payments') }} as p
  on p.payment_intent_id = r.payment_intent_id
where r.amount > p.amount;

=============== FILE: tests/assert_refund_has_payment.sql ===============
{# A refund with no payment behind it is an accounting hole. #}

select
    r.refund_id,
    r.payment_intent_id
from {{ ref('stg_refunds') }} as r
left join {{ ref('stg_payments') }} as p
  on p.payment_intent_id = r.payment_intent_id
where p.payment_intent_id is null;

=============== FILE: models/schema.yml ===============
version: 2

models:
  - name: stg_refunds
    columns:
      - name: refund_id
        data_tests:
          - unique
          - not_null
      - name: amount
        data_tests:
          - not_null

  - name: stg_payments
    columns:
      - name: payment_id
        data_tests:
          - unique
          - not_null
      - name: payment_intent_id
        data_tests:
          - not_null

=============== FILE: logs/nightly-2026-09-11.log ===============
03:00:11  Running with dbt=1.9.2
03:00:14  Registered adapter: snowflake=1.9.0
03:00:19  Found 6 models, 25 data tests, 2 sources, 0 exposures, 0 metrics, 471 macros
03:00:19
03:00:21  Concurrency: 4 threads (target='prod')
03:00:21
03:00:22  1 of 28 START sql view model analytics.stg_refunds .............. [RUN]
03:00:22  2 of 28 START sql view model analytics.stg_payments ............. [RUN]
03:00:48  1 of 28 OK created sql view model analytics.stg_refunds ......... [SUCCESS 1 in 26.11s]
03:00:51  2 of 28 OK created sql view model analytics.stg_payments ........ [SUCCESS 1 in 28.94s]
03:01:02  7 of 28 START test not_null_stg_refunds_amount ................. [RUN]
03:01:04  7 of 28 PASS not_null_stg_refunds_amount ....................... [PASS in 1.88s]
03:01:04  8 of 28 START test not_null_stg_refunds_refund_id ............. [RUN]
03:01:06  8 of 28 PASS not_null_stg_refunds_refund_id .................... [PASS in 1.51s]
03:06:38 27 of 28 PASS not_null_stg_payments_payment_intent_id ........... [PASS in 1.44s]
03:06:41 28 of 28 PASS unique_stg_payments_payment_id .................... [PASS in 1.02s]
03:06:42
03:06:42  Finished running 6 view models, 22 data tests in 0 hours 6 minutes and 20.11s.
03:06:43
03:06:43  Completed successfully
03:06:43
03:06:43  Done. PASS=28 WARN=0 ERROR=0 SKIP=0 TOTAL=28

=============== FILE: scripts/check-test-sql.mjs ===============
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function lintTestSql(name, sql) {
  const problems = [];
  if (!/\{\{\s*(ref|source)\s*\(/.test(sql)) {
    problems.push(`${name}: no ref() or source() - it will not be wired into the graph`);
  }
  if (!sql.trim()) {
    problems.push(`${name}: file is empty`);
  }
  return problems;
}

export function lintDir(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .flatMap((f) => lintTestSql(f, readFileSync(join(dir, f), 'utf8')));
}

const direct = process.argv[1] && process.argv[1].endsWith('check-test-sql.mjs');
if (direct) {
  const problems = lintDir(process.argv[2] ?? 'tests');
  problems.forEach((p) => console.error(p));
  process.exit(problems.length ? 1 : 0);
}

=============== FILE: scripts/check-test-sql.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintTestSql } from './check-test-sql.mjs';

test('accepts an assertion wired to a model', () => {
  const sql = "select id from {{ ref('stg_refunds') }} where amount < 0";
  assert.deepEqual(lintTestSql('ok.sql', sql), []);
});

test('rejects raw SQL with no graph reference', () => {
  const problems = lintTestSql('loose.sql', 'select id from analytics.stg_refunds');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no ref\(\) or source\(\)/);
});

test('rejects an empty file', () => {
  const problems = lintTestSql('blank.sql', '   \n');
  assert.equal(problems.length, 2);
});
