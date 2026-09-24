# Answer the rescoring notes before Tuesday's review

## Problem Description

I own the quarterly review of our 24 end-to-end tests. Q2's published ranking is
in the bundle along with the raw inputs it was built from, and Q3 runs next
Tuesday in front of the leads.

Two people wrote to me this week wanting changes in before I compute it. Both
notes are in `requests/2026-09-rescoring.md`. Dmitri Osei manages the platform
team; Nadia Brandt is the payments tech lead. I have to write back to both of
them by Friday, and I have to hand the leads the Q3 numbers on Tuesday, so I
need to know exactly what I am doing with each thing they have raised, and I
need the Q3 ranking computed under whatever I end up with.

Dmitri attached his own twelve-month churn figures for the whole suite, which
are in the bundle. So are the release notes for the last six months and the
note we keep on which paths have only one end-to-end test covering them.

I would rather not have this argument again in January, so whatever I decide
needs a reason attached that will still hold up then.

## Output Specification

1. `docs/rescoring-decision.md` - my reply to the two of them.
2. `data/value-tiers.json` - whatever it should say when I run Q3.
3. `reports/2026-q3-bottom.md` - the worst end of the Q3 ranking computed under
   the inputs I end up with, showing per row the input values it was computed
   from and the score they produce.

`npm test` must pass when you are done. Do not change `lib/tiers.js`,
`test/tiers.test.js`, `data/e2e-stats.json`, `data/regressions.json`,
`reports/2026-q2-ranking.md`, or anything under `requests/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "e2e-review",
  "private": true,
  "scripts": { "test": "node --test" }
}

=============== FILE: lib/tiers.js ===============
'use strict';

function validateTiers(testIds, tiers) {
  const problems = [];
  for (const id of testIds) {
    if (!(id in tiers)) problems.push(`no tier for ${id}`);
  }
  for (const [id, tier] of Object.entries(tiers)) {
    if (!testIds.includes(id)) problems.push(`tier for unknown test ${id}`);
    if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
      problems.push(`tier out of range for ${id}: ${tier}`);
    }
  }
  return problems.sort();
}

module.exports = { validateTiers };

=============== FILE: test/tiers.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { validateTiers } = require('../lib/tiers');

test('flags gaps, strays and out-of-range tiers', () => {
  const problems = validateTiers(['a', 'b'], { a: 9, c: 3 });
  assert.deepEqual(problems, ['no tier for b', 'tier for unknown test c', 'tier out of range for a: 9']);
});

test('shipped tier file matches the stats file', () => {
  const root = join(__dirname, '..');
  const stats = JSON.parse(readFileSync(join(root, 'data', 'e2e-stats.json'), 'utf8'));
  const tiers = JSON.parse(readFileSync(join(root, 'data', 'value-tiers.json'), 'utf8'));
  assert.deepEqual(validateTiers(Object.keys(stats.tests), tiers), []);
});

=============== FILE: data/e2e-stats.json ===============
{
  "_window": "runtime and flake: rolling 4 weeks to 2026-09-08. prs_90d: PRs touching the test since 2026-06-10.",
  "_file_totals_90d": {
    "checkout.spec.ts": 5,
    "cart.spec.ts": 3,
    "auth.spec.ts": 6,
    "account.spec.ts": 2,
    "search.spec.ts": 6,
    "reports.spec.ts": 3,
    "admin.spec.ts": 14,
    "orders.spec.ts": 4,
    "notifications.spec.ts": 3,
    "promo.spec.ts": 5,
    "pricing.spec.ts": 2,
    "settings.spec.ts": 1
  },
  "tests": {
    "checkout.spec.ts > card-purchase-happy-path": { "runtime_min": 3.8, "flake_rate": 0.02, "prs_90d": 2 },
    "checkout.spec.ts > saved-card-purchase": { "runtime_min": 3.1, "flake_rate": 0.03, "prs_90d": 1 },
    "checkout.spec.ts > apply-discount-code": { "runtime_min": 2.2, "flake_rate": 0.04, "prs_90d": 2 },
    "cart.spec.ts > line-item-edit": { "runtime_min": 1.4, "flake_rate": 0.01, "prs_90d": 1 },
    "cart.spec.ts > persist-cart-across-sessions": { "runtime_min": 2.3, "flake_rate": 0.07, "prs_90d": 2 },
    "auth.spec.ts > login-with-password": { "runtime_min": 1.0, "flake_rate": 0.01, "prs_90d": 1 },
    "auth.spec.ts > sso-redirect": { "runtime_min": 2.4, "flake_rate": 0.09, "prs_90d": 3 },
    "auth.spec.ts > password-reset-email": { "runtime_min": 2.8, "flake_rate": 0.08, "prs_90d": 2 },
    "account.spec.ts > change-password": { "runtime_min": 1.6, "flake_rate": 0.02, "prs_90d": 1 },
    "account.spec.ts > data-export-request": { "runtime_min": 2.9, "flake_rate": 0.06, "prs_90d": 1 },
    "search.spec.ts > keyword-results": { "runtime_min": 1.3, "flake_rate": 0.04, "prs_90d": 1 },
    "search.spec.ts > facet-filters": { "runtime_min": 1.8, "flake_rate": 0.06, "prs_90d": 2 },
    "search.spec.ts > empty-state-copy": { "runtime_min": 0.9, "flake_rate": 0.03, "prs_90d": 3 },
    "reports.spec.ts > export-50k-rows": { "runtime_min": 4.6, "flake_rate": 0.02, "prs_90d": 1 },
    "reports.spec.ts > scheduled-email-report": { "runtime_min": 3.3, "flake_rate": 0.12, "prs_90d": 2 },
    "admin.spec.ts > audit-log-download": { "runtime_min": 2.4, "flake_rate": 0.06, "prs_90d": 4 },
    "admin.spec.ts > user-role-change": { "runtime_min": 2.0, "flake_rate": 0.03, "prs_90d": 1 },
    "admin.spec.ts > bulk-import-10k-rows": { "runtime_min": 4.5, "flake_rate": 0.12, "prs_90d": 2 },
    "orders.spec.ts > refund-to-original-method": { "runtime_min": 3.6, "flake_rate": 0.10, "prs_90d": 3 },
    "orders.spec.ts > cancel-within-window": { "runtime_min": 2.0, "flake_rate": 0.03, "prs_90d": 1 },
    "notifications.spec.ts > in-app-toast": { "runtime_min": 0.8, "flake_rate": 0.11, "prs_90d": 3 },
    "promo.spec.ts > seasonal-banner": { "runtime_min": 1.6, "flake_rate": 0.19, "prs_90d": 5 },
    "pricing.spec.ts > currency-switch": { "runtime_min": 1.5, "flake_rate": 0.05, "prs_90d": 2 },
    "settings.spec.ts > api-key-rotation": { "runtime_min": 2.1, "flake_rate": 0.04, "prs_90d": 1 }
  }
}

=============== FILE: data/regressions.json ===============
{
  "_window": "Real defects attributed to the test over the 12 months to 2026-09-08. Fractional values are near-misses caught in review because the test went red.",
  "catches": {
    "checkout.spec.ts > card-purchase-happy-path": 4,
    "checkout.spec.ts > saved-card-purchase": 2,
    "checkout.spec.ts > apply-discount-code": 1,
    "cart.spec.ts > line-item-edit": 1,
    "cart.spec.ts > persist-cart-across-sessions": 2,
    "auth.spec.ts > login-with-password": 3,
    "auth.spec.ts > sso-redirect": 1,
    "auth.spec.ts > password-reset-email": 1,
    "account.spec.ts > change-password": 1,
    "account.spec.ts > data-export-request": 1,
    "search.spec.ts > keyword-results": 2,
    "search.spec.ts > facet-filters": 1,
    "search.spec.ts > empty-state-copy": 0.5,
    "reports.spec.ts > export-50k-rows": 1,
    "reports.spec.ts > scheduled-email-report": 1,
    "admin.spec.ts > audit-log-download": 1,
    "admin.spec.ts > user-role-change": 1,
    "admin.spec.ts > bulk-import-10k-rows": 2,
    "orders.spec.ts > refund-to-original-method": 0.5,
    "orders.spec.ts > cancel-within-window": 2,
    "notifications.spec.ts > in-app-toast": 0,
    "promo.spec.ts > seasonal-banner": 0,
    "pricing.spec.ts > currency-switch": 1,
    "settings.spec.ts > api-key-rotation": 1
  }
}

=============== FILE: data/value-tiers.json ===============
{
  "checkout.spec.ts > card-purchase-happy-path": 5,
  "checkout.spec.ts > saved-card-purchase": 5,
  "checkout.spec.ts > apply-discount-code": 4,
  "cart.spec.ts > line-item-edit": 4,
  "cart.spec.ts > persist-cart-across-sessions": 4,
  "auth.spec.ts > login-with-password": 5,
  "auth.spec.ts > sso-redirect": 5,
  "auth.spec.ts > password-reset-email": 4,
  "account.spec.ts > change-password": 4,
  "account.spec.ts > data-export-request": 4,
  "search.spec.ts > keyword-results": 3,
  "search.spec.ts > facet-filters": 3,
  "search.spec.ts > empty-state-copy": 2,
  "reports.spec.ts > export-50k-rows": 2,
  "reports.spec.ts > scheduled-email-report": 3,
  "admin.spec.ts > audit-log-download": 3,
  "admin.spec.ts > user-role-change": 3,
  "admin.spec.ts > bulk-import-10k-rows": 3,
  "orders.spec.ts > refund-to-original-method": 2,
  "orders.spec.ts > cancel-within-window": 4,
  "notifications.spec.ts > in-app-toast": 1,
  "promo.spec.ts > seasonal-banner": 1,
  "pricing.spec.ts > currency-switch": 3,
  "settings.spec.ts > api-key-rotation": 4
}

=============== FILE: reports/2026-q2-ranking.md ===============
# Q2 2026 per-test ranking - published 2026-06-30

Input definitions used, unchanged since the review started in Q4 2025:

- Catches: real defects attributed to the test over the trailing **12 months**.
- Churn: PRs touching the test over the trailing **90 days**, compared against
  the suite's own median for the same window, which was 2.
- Tier: 1-5, assigned by the owning team at the start of the quarter.
- Runtime and flake: rolling four-week CI averages.

Ranked worst first. 24 tests.

| # | Test                                          | Score |
|--:|-----------------------------------------------|------:|
| 1 | `notifications.spec.ts > in-app-toast`         | 0.00 |
| 2 | `promo.spec.ts > seasonal-banner`              | 0.00 |
| 3 | `orders.spec.ts > refund-to-original-method`   | 0.10 |
| 4 | `reports.spec.ts > export-50k-rows`            | 0.28 |
| 5 | `admin.spec.ts > audit-log-download`           | 0.39 |
| 6 | `reports.spec.ts > scheduled-email-report`     | 0.41 |
| 7 | `search.spec.ts > empty-state-copy`            | 0.43 |
| 8 | `admin.spec.ts > bulk-import-10k-rows`         | 0.60 |
| 9 | `auth.spec.ts > password-reset-email`          | 0.66 |
|10 | `auth.spec.ts > sso-redirect`                  | 0.76 |
|11 | `search.spec.ts > facet-filters`               | 0.79 |
|12 | `account.spec.ts > data-export-request`        | 0.87 |
|13 | `checkout.spec.ts > apply-discount-code`       | 0.87 |
|14 | `pricing.spec.ts > currency-switch`            | 0.95 |
|15 | `admin.spec.ts > user-role-change`             | 0.97 |
|16 | `settings.spec.ts > api-key-rotation`          | 1.22 |
|17 | `cart.spec.ts > persist-cart-across-sessions`  | 1.63 |
|18 | `account.spec.ts > change-password`            | 1.63 |
|19 | `cart.spec.ts > line-item-edit`                | 1.89 |
|20 | `checkout.spec.ts > saved-card-purchase`       | 2.09 |
|21 | `checkout.spec.ts > card-purchase-happy-path`  | 2.58 |
|22 | `orders.spec.ts > cancel-within-window`        | 2.59 |
|23 | `search.spec.ts > keyword-results`             | 2.96 |
|24 | `auth.spec.ts > login-with-password`           | 9.90 |

=============== FILE: data/coverage-notes.md ===============
# Paths with only one end-to-end test covering them - checked 2026-09-05

| Path                          | Sole cover                                     |
|-------------------------------|------------------------------------------------|
| `/checkout/refund`             | `orders.spec.ts > refund-to-original-method`   |
| `/auth/sso`                    | `auth.spec.ts > sso-redirect`                  |
| `/account/export`              | `account.spec.ts > data-export-request`        |
| `/admin/import`                | `admin.spec.ts > bulk-import-10k-rows`         |
| `/promo/seasonal`              | `promo.spec.ts > seasonal-banner`              |
| `/reports/export`              | `reports.spec.ts > export-50k-rows`            |

Everything else in the suite shares its path with at least one other test.
`notifications.spec.ts > in-app-toast` asserts a toast component on
`/dashboard`, which five other tests exercise.

=============== FILE: requests/2026-09-rescoring.md ===============
# Notes received ahead of the Q3 review

---

**From:** Dmitri Osei (engineering manager, platform)
**Date:** 2026-09-09
**Subject:** the admin import churn number, and the window

`admin.spec.ts > bulk-import-10k-rows` has cost my team more hours than any
other test this year and it keeps surviving the review. Two things.

**One: the churn number for it is simply wrong.** Your stats file has it at 2
PRs in the ninety days. Nine PRs touched that test inside your window and I
have listed all nine in the attachment with dates and numbers. Check it against
your own file if you do not believe me - the per-file total for
`admin.spec.ts` in that same export is 14, and the three rows you have for
that file add up to 7.

**Two: ninety days is the wrong window anyway.** Even at nine it reads as a
recent problem. Over twelve months it is fourteen PRs against a twelve-month
suite median of four, and that is the honest picture of what this test has cost
us. I have attached the twelve-month figures for the whole suite so you can run
it that way. I am not asking you to delete the test today, only to score it
under a window that shows what it actually is.

---

**From:** Nadia Brandt (payments tech lead)
**Date:** 2026-09-10
**Subject:** refund test tier, and the migration PRs

Two things from me as well.

**One: `orders.spec.ts > refund-to-original-method` is tiered wrong.** It is at
tier 2. That tier was set in March, when refunds could go back to store credit
and the original-method path was one option among several. Since the 2026-07-01
release it is the only route a refund can take for an EU account. Tier 4.

**Two: drop the churn on `orders.spec.ts` for this quarter.** The PRs against
that spec were the fixture migration, not the test being fragile. Counting
mechanical churn as maintenance cost punishes the teams who did the migration
work properly. I would rather not have my refund test dragged down the list by
a rename.

=============== FILE: requests/admin-import-prs.md ===============
# PRs touching `admin.spec.ts > bulk-import-10k-rows`, 2026-06-10 to 2026-09-08

| PR    | Merged     | What                                            |
|-------|------------|-------------------------------------------------|
| #7714 | 2026-06-17 | widen the upload timeout                        |
| #7802 | 2026-06-29 | re-point the fixture at the new seed loader     |
| #7851 | 2026-07-06 | retry the row-count assertion                   |
| #7908 | 2026-07-20 | split the assertion after the dry-run preview   |
| #7963 | 2026-08-04 | update the expected error copy                  |
| #7991 | 2026-08-05 | move onto the shared checkout fixture helper    |
| #8020 | 2026-08-13 | widen the upload timeout again                  |
| #8077 | 2026-08-24 | update for the column-mapping UI                |
| #8115 | 2026-09-02 | retry the row-count assertion again             |

=============== FILE: requests/churn-12m.json ===============
{
  "_window": "PRs touching the test over the 12 months to 2026-09-08. Compiled by D. Osei, 2026-09-09.",
  "prs_12m": {
    "checkout.spec.ts > card-purchase-happy-path": 7,
    "checkout.spec.ts > saved-card-purchase": 4,
    "checkout.spec.ts > apply-discount-code": 6,
    "cart.spec.ts > line-item-edit": 3,
    "cart.spec.ts > persist-cart-across-sessions": 4,
    "auth.spec.ts > login-with-password": 3,
    "auth.spec.ts > sso-redirect": 9,
    "auth.spec.ts > password-reset-email": 4,
    "account.spec.ts > change-password": 2,
    "account.spec.ts > data-export-request": 4,
    "search.spec.ts > keyword-results": 3,
    "search.spec.ts > facet-filters": 6,
    "search.spec.ts > empty-state-copy": 8,
    "reports.spec.ts > export-50k-rows": 4,
    "reports.spec.ts > scheduled-email-report": 6,
    "admin.spec.ts > audit-log-download": 11,
    "admin.spec.ts > user-role-change": 3,
    "admin.spec.ts > bulk-import-10k-rows": 14,
    "orders.spec.ts > refund-to-original-method": 9,
    "orders.spec.ts > cancel-within-window": 2,
    "notifications.spec.ts > in-app-toast": 8,
    "promo.spec.ts > seasonal-banner": 12,
    "pricing.spec.ts > currency-switch": 4,
    "settings.spec.ts > api-key-rotation": 3
  }
}

=============== FILE: CHANGELOG.md ===============
# Release notes - last six months

## 2026-08-12
- Admin console bulk import: column mapping and a dry-run preview added at
  `/admin/import`.

## 2026-08-05
- Test fixtures: every spec moved onto the shared checkout fixture helper. One
  PR per spec file, 24 PRs merged between 2026-08-03 and 2026-08-07.

## 2026-07-01
- Refunds: for accounts in the EU a refund returns to the original payment
  method. The store-credit option was removed from that path.

## 2026-06-18
- Reports: the 50k-row export moved to a background worker. The synchronous
  path is gone; the export now polls for completion.

## 2026-05-14
- Seasonal promo banner removed. `/promo/seasonal` returns 404 and the
  component was deleted.

## 2026-04-22
- Dashboard: toast notifications restyled. No behaviour change.
