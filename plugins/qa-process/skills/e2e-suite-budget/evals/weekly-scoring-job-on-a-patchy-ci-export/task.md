# Weekly scoring job keeps dying at 6am on nulls in the CI export

## Problem Description

We score our 24 end-to-end tests every Monday so the leads can see which ones are
costing more than they return. Right now it is a spreadsheet somebody updates by
hand and it has not been touched since July. I want it as a job that runs at
06:00 Monday and drops a report in the repo.

The inputs are what CI gives us and they are not clean. `data/stats-export.json`
comes from the CI history API - per test it carries how many times the test ran
in the window, how many of those runs were on the lane that has retries switched
on, the average runtime, and the pass-after-retry rate.
`data/maintenance-export.json` is produced by a separate git bot that counts PRs
touching each spec over 90 days. `data/regressions.json` and
`data/value-tiers.json` are maintained by hand and are current.

What I need is a job that finishes and writes the report every Monday with
nobody in the loop. The last attempt threw on a null at 06:04 and the workflow
stayed red until somebody looked at it at nine. Take whatever is missing as zero
and keep going - I would rather have a ranking with a couple of soft numbers in
it than no ranking at all.

And do not hand me a report with half the suite missing from it either. The
attempt before that one dropped every test that had a zero anywhere in its row
and the leads binned it on sight.

Ticket is `docs/QA-411.md`.

## Output Specification

1. `scripts/weekly-roi.js` - reads the four files under `data/` and writes
   `reports/roi-2026-w37.json` and `reports/roi-2026-w37.md`. It must run to
   completion on the supplied export without throwing.
2. `test/weekly-roi.test.js` - tests for the scoring, running under `npm test`
   alongside the test already in the repo. `npm test` must pass when you are
   done.
3. `reports/roi-2026-w37.md` is what the leads read on Monday: the worst end of
   the ranking, what each number is made of, and anything about this week's
   inputs they should know before they act on it.

Do not change `lib/table.js`, `test/table.test.js`, or anything under `data/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "e2e-scoring",
  "private": true,
  "scripts": { "test": "node --test" }
}

=============== FILE: lib/table.js ===============
'use strict';

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.join(' | ')} |`;
  const rule = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${columns.map((c) => String(r[c] ?? '')).join(' | ')} |`);
  return [header, rule, ...body].join('\n');
}

module.exports = { toMarkdownTable };

=============== FILE: test/table.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toMarkdownTable } = require('../lib/table');

test('renders a header, a rule and one row per entry', () => {
  const out = toMarkdownTable([{ a: 1, b: 'x' }, { a: 2 }], ['a', 'b']);
  assert.deepEqual(out.split('\n'), ['| a | b |', '| --- | --- |', '| 1 | x |', '| 2 |  |']);
});

=============== FILE: docs/QA-411.md ===============
# QA-411 - automate the Monday scoring report

**Reporter:** @dmoreau (eng manager, platform)
**Priority:** P2

The spreadsheet is three months stale. Make it a job.

Acceptance:

- Runs Monday 06:00 from the scheduled workflow.
- Writes a JSON artefact and a markdown report into `reports/`.
- Does not fail the workflow. The last attempt threw on a null runtime and the
  workflow stayed red until someone looked at it at 09:00.

=============== FILE: data/stats-export.json ===============
{
  "_fields": "runs = executions in the window. retry_lane_runs = executions on the lane with retries enabled. runtime_min = mean minutes per execution. flake_rate = share of retry-lane runs that failed and then passed on retry.",
  "_window": "2026-09-01 to 2026-09-08",
  "tests": {
    "checkout.spec.ts > card-purchase-happy-path": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 3.8, "flake_rate": 0.02 },
    "checkout.spec.ts > saved-card-purchase": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 3.1, "flake_rate": 0.0 },
    "checkout.spec.ts > three-d-secure-challenge": { "runs": 41, "retry_lane_runs": 0, "runtime_min": 2.7 },
    "cart.spec.ts > line-item-edit": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 1.4, "flake_rate": 0.0 },
    "auth.spec.ts > login-with-password": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 1.0, "flake_rate": 0.01 },
    "auth.spec.ts > sso-redirect": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 2.4, "flake_rate": 0.09 },
    "auth.spec.ts > password-reset-email": { "runs": 41, "retry_lane_runs": 0, "runtime_min": 2.8 },
    "account.spec.ts > change-password": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 1.6, "flake_rate": 0.0 },
    "account.spec.ts > data-export-request": { "runs": 41, "retry_lane_runs": 0, "runtime_min": 2.9 },
    "account.spec.ts > avatar-upload": { "runs": 0, "retry_lane_runs": 0, "runtime_min": null },
    "search.spec.ts > keyword-results": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 1.3, "flake_rate": 0.0 },
    "search.spec.ts > facet-filters": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 1.8, "flake_rate": 0.06 },
    "search.spec.ts > sort-order-persistence": { "runs": 41, "retry_lane_runs": 0, "runtime_min": 1.5 },
    "reports.spec.ts > export-50k-rows": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 4.6, "flake_rate": 0.0 },
    "reports.spec.ts > scheduled-email-report": { "runs": 41, "retry_lane_runs": 0, "runtime_min": 3.3 },
    "admin.spec.ts > audit-log-download": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 2.4, "flake_rate": 0.06 },
    "admin.spec.ts > user-role-change": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 2.0, "flake_rate": 0.0 },
    "admin.spec.ts > bulk-invite-users": { "runs": 0, "retry_lane_runs": 0, "runtime_min": null },
    "orders.spec.ts > cancel-within-window": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 2.0, "flake_rate": 0.0 },
    "orders.spec.ts > print-packing-slip": { "runs": 0, "retry_lane_runs": 0, "runtime_min": null },
    "pricing.spec.ts > currency-switch": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 1.5, "flake_rate": 0.0 },
    "settings.spec.ts > api-key-rotation": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 2.1, "flake_rate": 0.0 },
    "notifications.spec.ts > digest-opt-out": { "runs": 2, "retry_lane_runs": 2, "runtime_min": 1.1, "flake_rate": 0.5 },
    "onboarding.spec.ts > sample-data-import": { "runs": 41, "retry_lane_runs": 41, "runtime_min": 3.4, "flake_rate": 0.0 }
  }
}

=============== FILE: data/maintenance-export.json ===============
{
  "_note": "PRs touching each spec, 2026-06-10 to 2026-09-08. Generated from the tree as of 2026-08-19.",
  "prs": {
    "checkout.spec.ts > card-purchase-happy-path": 2,
    "checkout.spec.ts > saved-card-purchase": 1,
    "checkout.spec.ts > three-d-secure-challenge": 3,
    "cart.spec.ts > line-item-edit": 0,
    "auth.spec.ts > login-with-password": 1,
    "auth.spec.ts > sso-redirect": 3,
    "auth.spec.ts > password-reset-email": 0,
    "account.spec.ts > change-password": 0,
    "account.spec.ts > data-export-request": 0,
    "account.spec.ts > avatar-upload": 4,
    "search.spec.ts > keyword-results": 0,
    "search.spec.ts > facet-filters": 0,
    "reports.spec.ts > export-50k-rows": 0,
    "reports.spec.ts > scheduled-email-report": 0,
    "admin.spec.ts > audit-log-download": 4,
    "admin.spec.ts > user-role-change": 0,
    "admin.spec.ts > bulk-invite-users": 0,
    "orders.spec.ts > print-packing-slip": 0,
    "settings.spec.ts > api-key-rotation": 0,
    "onboarding.spec.ts > sample-data-import": 2,
    "legacy.spec.ts > coupon-stacking": 6,
    "beta.spec.ts > invite-flow": 2
  }
}

=============== FILE: data/regressions.json ===============
{
  "checkout.spec.ts > card-purchase-happy-path": 4,
  "checkout.spec.ts > saved-card-purchase": 2,
  "checkout.spec.ts > three-d-secure-challenge": 1,
  "cart.spec.ts > line-item-edit": 1,
  "auth.spec.ts > login-with-password": 3,
  "auth.spec.ts > sso-redirect": 1,
  "auth.spec.ts > password-reset-email": 1,
  "account.spec.ts > change-password": 1,
  "account.spec.ts > data-export-request": 1,
  "account.spec.ts > avatar-upload": 0,
  "search.spec.ts > keyword-results": 2,
  "search.spec.ts > facet-filters": 1,
  "search.spec.ts > sort-order-persistence": 0,
  "reports.spec.ts > export-50k-rows": 0,
  "reports.spec.ts > scheduled-email-report": 0,
  "admin.spec.ts > audit-log-download": 0,
  "admin.spec.ts > user-role-change": 1,
  "admin.spec.ts > bulk-invite-users": 2,
  "orders.spec.ts > cancel-within-window": 2,
  "orders.spec.ts > print-packing-slip": 0,
  "pricing.spec.ts > currency-switch": 1,
  "settings.spec.ts > api-key-rotation": 1,
  "notifications.spec.ts > digest-opt-out": 0,
  "onboarding.spec.ts > sample-data-import": 0
}

=============== FILE: data/value-tiers.json ===============
{
  "checkout.spec.ts > card-purchase-happy-path": 5,
  "checkout.spec.ts > saved-card-purchase": 5,
  "checkout.spec.ts > three-d-secure-challenge": 5,
  "cart.spec.ts > line-item-edit": 4,
  "auth.spec.ts > login-with-password": 5,
  "auth.spec.ts > sso-redirect": 5,
  "auth.spec.ts > password-reset-email": 4,
  "account.spec.ts > change-password": 4,
  "account.spec.ts > data-export-request": 4,
  "account.spec.ts > avatar-upload": 2,
  "search.spec.ts > keyword-results": 3,
  "search.spec.ts > facet-filters": 3,
  "search.spec.ts > sort-order-persistence": 2,
  "reports.spec.ts > export-50k-rows": 2,
  "reports.spec.ts > scheduled-email-report": 3,
  "admin.spec.ts > audit-log-download": 2,
  "admin.spec.ts > user-role-change": 4,
  "admin.spec.ts > bulk-invite-users": 3,
  "orders.spec.ts > cancel-within-window": 4,
  "orders.spec.ts > print-packing-slip": 1,
  "pricing.spec.ts > currency-switch": 3,
  "settings.spec.ts > api-key-rotation": 4,
  "notifications.spec.ts > digest-opt-out": 2,
  "onboarding.spec.ts > sample-data-import": 2
}
