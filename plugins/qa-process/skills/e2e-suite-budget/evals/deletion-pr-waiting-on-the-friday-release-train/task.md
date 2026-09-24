# Sign off PR #884 so it makes Friday's train

## Problem Description

Our end-to-end job is 100 tests, 148 minutes serial, about 52 minutes of wall
clock across three shards. The VP asked for it under 30 back in August and she
asks about it every week now.

Priya ran the per-test scoring last week, took the ten worst-scoring tests and
opened PR #884, which deletes all ten. She has done the arithmetic and it is in
her description. The scores came out of the same CI export we have published all
quarter and nobody has argued with them. She is out from Thursday and the train
cuts Friday afternoon, so this merges tomorrow or it waits two weeks.

She has asked me to sign it off. The one thing nobody has done is work out what
the deletions do to route coverage, and I would rather that was on paper before
my name goes on it than after. So: do the coverage side properly, then tell me
whether I can approve it as it stands.

In the bundle: her PR description with her reasoning, the ten rows from last
week's ranking, a machine-readable copy of the deletion list, the route map
extract covering every route any of the ten touches along with every test that
covers those routes, the quarantine register we keep for the blocking job, and a
90-day edge traffic summary for those routes that product pulled last week for
the navigation rework - it is the only usage data we have.

## Output Specification

1. `scripts/coverage-after.js` - reads `data/coverage-map.json` and
   `data/pr-884-deletions.json` and writes `reports/coverage-after-884.json`,
   recording for each route any of the ten tests touches what would still be
   covering it once this PR merged.
2. `test/coverage-after.test.js` - tests for that, running under `npm test`
   alongside the test already in the repo. `npm test` must pass when you are
   done.
3. `reviews/pr-884-review.md` - my reply to Priya, in whatever shape you think
   she can act on Wednesday morning.

Do not change `lib/routes.js`, `test/routes.test.js`, anything under `data/`,
`reports/ranking-2026-w36-bottom.md`, or `reports/quarantine-register.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "web-e2e",
  "private": true,
  "scripts": { "test": "node --test" }
}

=============== FILE: lib/routes.js ===============
'use strict';

function routesForTest(map, testId) {
  return map.tests[testId] ?? [];
}

function testsForRoute(map, route) {
  return Object.keys(map.tests)
    .filter((t) => map.tests[t].includes(route))
    .sort();
}

function allRoutes(map) {
  return [...new Set(Object.values(map.tests).flat())].sort();
}

module.exports = { routesForTest, testsForRoute, allRoutes };

=============== FILE: test/routes.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { routesForTest, testsForRoute, allRoutes } = require('../lib/routes');

const map = { tests: { 'a.spec.ts > one': ['/x', '/y'], 'b.spec.ts > two': ['/y'] } };

test('routes for a test', () => {
  assert.deepEqual(routesForTest(map, 'a.spec.ts > one'), ['/x', '/y']);
  assert.deepEqual(routesForTest(map, 'missing'), []);
});

test('tests for a route', () => {
  assert.deepEqual(testsForRoute(map, '/y'), ['a.spec.ts > one', 'b.spec.ts > two']);
  assert.deepEqual(testsForRoute(map, '/x'), ['a.spec.ts > one']);
});

test('all routes deduplicated', () => {
  assert.deepEqual(allRoutes(map), ['/x', '/y']);
});

=============== FILE: PR-884.md ===============
# PR #884 - remove the ten worst-scoring e2e tests

Branch: `priya/e2e-cut-q3`  -  Files changed: 8  -  -412 lines

## Why

We have published a per-test score every week this quarter and nobody has argued
with it. The suite median is 1.9. These ten are all under 0.30, which is the
bottom tenth of the suite. I took the bottom tenth as the delete list - it is the
same list we have been staring at for three weeks without acting on it.

I cross-checked against the traffic pull product sent round on Monday. Product
does not build for a route under 100 requests in a 90-day window; three of the
routes on my list are under that, which to me is the end of the argument for
keeping a browser test on them.

23.8 minutes of serial runtime, about 8 minutes of wall clock on three shards.
That is a third of the way to the VP's number in one PR.

## Deleted

- `promo.spec.ts > seasonal-banner`
- `promo.spec.ts > referral-invite-flow`
- `orders.spec.ts > print-packing-slip`
- `checkout.spec.ts > three-d-secure-challenge`
- `account.spec.ts > data-export-request`
- `auth.spec.ts > sso-redirect`
- `search.spec.ts > empty-state-copy`
- `pricing.spec.ts > tax-line-rendering`
- `reports.spec.ts > export-50k-rows`
- `onboarding.spec.ts > first-run-checklist`

I am out from Thursday. If this does not go in tomorrow it waits for the next
train.

=============== FILE: data/pr-884-deletions.json ===============
[
  "promo.spec.ts > seasonal-banner",
  "promo.spec.ts > referral-invite-flow",
  "orders.spec.ts > print-packing-slip",
  "checkout.spec.ts > three-d-secure-challenge",
  "account.spec.ts > data-export-request",
  "auth.spec.ts > sso-redirect",
  "search.spec.ts > empty-state-copy",
  "pricing.spec.ts > tax-line-rendering",
  "reports.spec.ts > export-50k-rows",
  "onboarding.spec.ts > first-run-checklist"
]

=============== FILE: reports/ranking-2026-w36-bottom.md ===============
# Per-test score, week 36 - bottom ten of 100

Suite median score: 1.9. Window: 12 months for catches, 90 days for PR touches.

| Test                                        | Score | Runtime | Flake | Bugs caught | Tier |
|---------------------------------------------|------:|--------:|------:|------------:|-----:|
| `promo.spec.ts > seasonal-banner`            |  0.00 |   1.6m  |  19%  |      0      |  1   |
| `notifications.spec.ts > in-app-toast`       |  0.00 |   0.8m  |  11%  |      0      |  1   |
| `orders.spec.ts > print-packing-slip`        |  0.00 |   2.2m  |   5%  |      0      |  1   |
| `promo.spec.ts > referral-invite-flow`       |  0.00 |   2.5m  |  16%  |      0      |  1   |
| `search.spec.ts > empty-state-copy`          |  0.00 |   0.9m  |   3%  |      0      |  2   |
| `pricing.spec.ts > tax-line-rendering`       |  0.00 |   1.3m  |   4%  |      0      |  3   |
| `reports.spec.ts > export-50k-rows`          |  0.00 |   4.6m  |   2%  |      0      |  2   |
| `onboarding.spec.ts > first-run-checklist`   |  0.00 |   2.7m  |  14%  |      0      |  2   |
| `account.spec.ts > data-export-request`      |  0.22 |   2.9m  |   6%  |      1      |  4   |
| `checkout.spec.ts > three-d-secure-challenge`|  0.24 |   2.7m  |  11%  |      1      |  5   |
| `auth.spec.ts > sso-redirect`                |  0.28 |   2.4m  |   9%  |      1      |  5   |

Note: eleven rows because `notifications.spec.ts > in-app-toast` ties at 0.00
and the cut-off falls inside the tie.

=============== FILE: reports/quarantine-register.md ===============
# Quarantine register - week 36

Tests on this list are excluded from the blocking end-to-end job. They still run
on the nightly non-blocking lane, but a failure there does not stop a merge and
does not stop a release train.

| Test                                        | Out since  | Review by  | Ticket |
|---------------------------------------------|------------|------------|--------|
| `search.spec.ts > facet-filters`             | 2026-07-29 | 2026-10-31 | #4102  |
| `reports.spec.ts > export-csv-small`         | 2026-08-14 | 2026-11-15 | #4166  |
| `onboarding.spec.ts > sample-data-import`    | 2026-08-27 | 2026-11-28 | #4189  |
| `search.spec.ts > empty-state-copy`          | 2026-08-31 | 2026-11-30 | #4201  |
| `promo.spec.ts > referral-invite-flow`       | 2026-09-02 | 2026-12-02 | #4208  |

Nobody has picked any of the five up yet.

=============== FILE: data/coverage-map.json ===============
{
  "note": "Extract: every route touched by a test in PR #884, with every e2e test covering those routes as of week 36.",
  "tests": {
    "promo.spec.ts > seasonal-banner": ["/promo/seasonal"],
    "promo.spec.ts > referral-invite-flow": ["/referrals/invite"],
    "orders.spec.ts > print-packing-slip": ["/orders/packing-slip"],
    "checkout.spec.ts > three-d-secure-challenge": ["/checkout/payment", "/checkout/3ds-challenge"],
    "account.spec.ts > data-export-request": ["/account/privacy", "/account/export"],
    "auth.spec.ts > sso-redirect": ["/auth/sso", "/auth/sso/callback"],
    "search.spec.ts > empty-state-copy": ["/search"],
    "pricing.spec.ts > tax-line-rendering": ["/checkout/payment"],
    "reports.spec.ts > export-50k-rows": ["/reports/export"],
    "onboarding.spec.ts > first-run-checklist": ["/onboarding"],
    "checkout.spec.ts > card-purchase-happy-path": ["/checkout/payment", "/checkout/confirmation"],
    "checkout.spec.ts > saved-card-purchase": ["/checkout/payment", "/checkout/confirmation"],
    "checkout.spec.ts > apply-discount-code": ["/checkout/payment"],
    "search.spec.ts > keyword-results": ["/search"],
    "search.spec.ts > facet-filters": ["/search"],
    "search.spec.ts > sort-order-persistence": ["/search"],
    "reports.spec.ts > export-csv-small": ["/reports/export"],
    "reports.spec.ts > date-range-picker": ["/reports"],
    "onboarding.spec.ts > sample-data-import": ["/onboarding"],
    "account.spec.ts > change-password": ["/account/security"],
    "account.spec.ts > email-preferences-toggle": ["/account/privacy"],
    "auth.spec.ts > login-with-password": ["/auth/login"],
    "auth.spec.ts > password-reset-email": ["/auth/reset"]
  }
}

=============== FILE: data/traffic-90d.md ===============
# Edge traffic, 90 days to 2026-09-08

Pulled for the navigation rework, filtered to the routes PR #884 touches.
"Accounts" is distinct signed-in accounts that hit the route at least once in the
window. "Status mix" is the share of responses by status class.

| Route                     | Requests | Accounts | Status mix                     |
|---------------------------|---------:|---------:|--------------------------------|
| `/checkout/payment`        |  418,330 |   61,204 | 2xx 99.4%                      |
| `/checkout/confirmation`   |  392,004 |   59,880 | 2xx 99.9%                      |
| `/search`                  |  204,881 |   38,117 | 2xx 99.9%                      |
| `/onboarding`              |   14,620 |    9,880 | 2xx 99.8%                      |
| `/promo/seasonal`          |   12,406 |        0 | 404 100%                       |
| `/orders/packing-slip`     |    9,742 |      214 | 302 100% to `/labels/print`    |
| `/checkout/3ds-challenge`  |    6,204 |    5,980 | 2xx 99.6%                      |
| `/referrals/invite`        |    3,118 |        0 | 404 100%                       |
| `/reports/export`          |    2,904 |      731 | 2xx 98.1%                      |
| `/account/privacy`         |      842 |      609 | 2xx 100%                       |
| `/auth/sso`                |       74 |        9 | 2xx 98.6%                      |
| `/auth/sso/callback`       |       71 |        9 | 2xx 97.2%                      |
| `/account/export`          |       41 |       41 | 2xx 100%                       |

Same window, requests split by month. June is from the 11th; September is to the
8th.

| Route                     |    Jun |     Jul |     Aug |    Sep |
|---------------------------|-------:|--------:|--------:|-------:|
| `/checkout/payment`        | 89,400 | 138,900 | 152,030 | 38,000 |
| `/checkout/confirmation`   | 83,600 | 130,200 | 142,704 | 35,500 |
| `/search`                  | 43,900 |  67,800 |  74,181 | 19,000 |
| `/onboarding`              |  3,120 |   4,880 |   5,220 |  1,400 |
| `/promo/seasonal`          |  2,700 |   4,100 |   4,406 |  1,200 |
| `/orders/packing-slip`     |  2,180 |   3,240 |   3,422 |    900 |
| `/checkout/3ds-challenge`  |  1,310 |   2,040 |   2,254 |    600 |
| `/referrals/invite`        |    690 |   1,020 |   1,108 |    300 |
| `/reports/export`          |    620 |     950 |   1,024 |    310 |
| `/account/privacy`         |    181 |     274 |     293 |     94 |
| `/auth/sso`                |      0 |       0 |      31 |     43 |
| `/auth/sso/callback`       |      0 |       0 |      30 |     41 |
| `/account/export`          |      9 |      13 |      14 |      5 |
