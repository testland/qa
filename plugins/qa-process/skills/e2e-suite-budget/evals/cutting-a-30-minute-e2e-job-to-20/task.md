# Cut ten minutes off the E2E job before Thursday's eng-lead review

## Problem Description

Our end-to-end job runs 40 tests across three shards and lands just under 30
minutes of wall clock. It is now the top complaint in retro, and our VP has
asked for it under 20 by the end of the month. Thursday I have to stand in
front of the eng leads with a proposal.

Everything we hold is in the bundle. `data/e2e-stats.jsonl` is the weekly CI
export - per test, average runtime, the share of runs where it failed and then
passed on a retry, and how many PRs touched the spec in the last 90 days.
`data/value-tiers.json` is the 1-5 importance rating the owning team put on
each test at the start of the quarter. `data/regressions.json` is the
bug-attribution file our previous QA lead kept by hand; it is meant to record
how many real bugs each test has caught. There is also `incidents/` with the
postmortems we have written this year, and `data/feature-status.md`, which the
product manager keeps current with what has actually been removed from the
product.

Three shards means ten minutes of wall clock is roughly a third of the serial
total, so I need this to be concrete about where the time comes from, and I
need a recommendation per test rather than a list of names. The leads will push
back hard on anything that looks like it was picked to hit a number.

I do not want to spend the week doing archaeology across six months of Jira -
work with what is in the bundle.

## Output Specification

1. `scripts/rank-e2e.js` - reads the files under `data/`, writes
   `reports/ranking.json` with one entry per test carrying the input values it
   used and the score it produced, ordered worst-first.
2. `test/rank-e2e.test.js` - tests for the scoring, running under `npm test`
   alongside the test already in the repo. `npm test` must pass when you are
   done.
3. `reports/cut-list.md` - what I take to Thursday: which tests, what should
   happen to each one, what it saves, and anything I need to know before I
   present it.

Do not edit anything under `data/` or `incidents/`, and do not change
`lib/jsonl.js` or `test/jsonl.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "qa-metrics",
  "private": true,
  "scripts": { "test": "node --test" }
}

=============== FILE: lib/jsonl.js ===============
'use strict';

function parseJsonl(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`line ${i + 1}: ${e.message}`);
      }
    });
}

module.exports = { parseJsonl };

=============== FILE: test/jsonl.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJsonl } = require('../lib/jsonl');

test('reads one object per line and ignores blanks', () => {
  const rows = parseJsonl('{"a":1}\n\n{"a":2}\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].a, 2);
});

test('names the offending line', () => {
  assert.throws(() => parseJsonl('{"a":1}\nnope\n'), /line 2/);
});

=============== FILE: data/e2e-stats.jsonl ===============
{"test":"checkout.spec.ts > card-purchase-happy-path","runtime_min":3.8,"flake_rate":0.02,"maintenance_prs":2}
{"test":"checkout.spec.ts > saved-card-purchase","runtime_min":3.1,"flake_rate":0.03,"maintenance_prs":1}
{"test":"checkout.spec.ts > three-d-secure-challenge","runtime_min":2.7,"flake_rate":0.11,"maintenance_prs":3}
{"test":"checkout.spec.ts > apply-discount-code","runtime_min":2.2,"flake_rate":0.04,"maintenance_prs":2}
{"test":"checkout.spec.ts > shipping-address-validation","runtime_min":1.9,"flake_rate":0.05,"maintenance_prs":3}
{"test":"cart.spec.ts > add-and-remove-line-item","runtime_min":1.4,"flake_rate":0.01,"maintenance_prs":0}
{"test":"cart.spec.ts > quantity-stepper-limits","runtime_min":1.1,"flake_rate":0.02,"maintenance_prs":1}
{"test":"cart.spec.ts > persist-cart-across-sessions","runtime_min":2.3,"flake_rate":0.07,"maintenance_prs":2}
{"test":"account.spec.ts > data-export-request","runtime_min":2.9,"flake_rate":0.06,"maintenance_prs":1}
{"test":"account.spec.ts > change-password","runtime_min":1.6,"flake_rate":0.02,"maintenance_prs":0}
{"test":"account.spec.ts > avatar-upload","runtime_min":2.1,"flake_rate":0.13,"maintenance_prs":4}
{"test":"account.spec.ts > email-preferences-toggle","runtime_min":1.2,"flake_rate":0.03,"maintenance_prs":2}
{"test":"auth.spec.ts > login-with-password","runtime_min":1.0,"flake_rate":0.01,"maintenance_prs":1}
{"test":"auth.spec.ts > sso-redirect","runtime_min":2.4,"flake_rate":0.09,"maintenance_prs":3}
{"test":"auth.spec.ts > password-reset-email","runtime_min":2.8,"flake_rate":0.08,"maintenance_prs":2}
{"test":"auth.spec.ts > session-timeout-banner","runtime_min":1.7,"flake_rate":0.15,"maintenance_prs":5}
{"test":"search.spec.ts > keyword-results","runtime_min":1.3,"flake_rate":0.04,"maintenance_prs":1}
{"test":"search.spec.ts > empty-state-copy","runtime_min":0.9,"flake_rate":0.03,"maintenance_prs":3}
{"test":"search.spec.ts > facet-filters","runtime_min":1.8,"flake_rate":0.06,"maintenance_prs":2}
{"test":"search.spec.ts > sort-order-persistence","runtime_min":1.5,"flake_rate":0.05,"maintenance_prs":1}
{"test":"reports.spec.ts > export-50k-rows","runtime_min":4.6,"flake_rate":0.02,"maintenance_prs":1}
{"test":"reports.spec.ts > date-range-picker","runtime_min":1.4,"flake_rate":0.07,"maintenance_prs":3}
{"test":"reports.spec.ts > scheduled-email-report","runtime_min":3.3,"flake_rate":0.12,"maintenance_prs":2}
{"test":"admin.spec.ts > audit-log-download","runtime_min":2.4,"flake_rate":0.06,"maintenance_prs":4}
{"test":"admin.spec.ts > user-role-change","runtime_min":2.0,"flake_rate":0.03,"maintenance_prs":1}
{"test":"admin.spec.ts > bulk-invite-users","runtime_min":2.6,"flake_rate":0.10,"maintenance_prs":2}
{"test":"promo.spec.ts > seasonal-banner","runtime_min":1.6,"flake_rate":0.19,"maintenance_prs":5}
{"test":"promo.spec.ts > referral-invite-flow","runtime_min":2.5,"flake_rate":0.16,"maintenance_prs":3}
{"test":"orders.spec.ts > order-history-pagination","runtime_min":1.9,"flake_rate":0.04,"maintenance_prs":1}
{"test":"orders.spec.ts > print-packing-slip","runtime_min":2.2,"flake_rate":0.05,"maintenance_prs":2}
{"test":"orders.spec.ts > cancel-within-window","runtime_min":2.0,"flake_rate":0.03,"maintenance_prs":1}
{"test":"orders.spec.ts > reorder-previous-order","runtime_min":1.8,"flake_rate":0.06,"maintenance_prs":2}
{"test":"notifications.spec.ts > in-app-toast","runtime_min":0.8,"flake_rate":0.11,"maintenance_prs":3}
{"test":"notifications.spec.ts > digest-opt-out","runtime_min":1.1,"flake_rate":0.04,"maintenance_prs":2}
{"test":"pricing.spec.ts > currency-switch","runtime_min":1.5,"flake_rate":0.05,"maintenance_prs":2}
{"test":"pricing.spec.ts > tax-line-rendering","runtime_min":1.3,"flake_rate":0.04,"maintenance_prs":3}
{"test":"onboarding.spec.ts > first-run-checklist","runtime_min":2.7,"flake_rate":0.14,"maintenance_prs":4}
{"test":"onboarding.spec.ts > sample-data-import","runtime_min":3.4,"flake_rate":0.09,"maintenance_prs":2}
{"test":"settings.spec.ts > timezone-change","runtime_min":1.2,"flake_rate":0.03,"maintenance_prs":1}
{"test":"settings.spec.ts > api-key-rotation","runtime_min":2.1,"flake_rate":0.04,"maintenance_prs":1}

=============== FILE: data/value-tiers.json ===============
{
  "checkout.spec.ts > card-purchase-happy-path": 5,
  "checkout.spec.ts > saved-card-purchase": 5,
  "checkout.spec.ts > three-d-secure-challenge": 5,
  "checkout.spec.ts > apply-discount-code": 4,
  "checkout.spec.ts > shipping-address-validation": 3,
  "cart.spec.ts > add-and-remove-line-item": 4,
  "cart.spec.ts > quantity-stepper-limits": 2,
  "cart.spec.ts > persist-cart-across-sessions": 4,
  "account.spec.ts > data-export-request": 4,
  "account.spec.ts > change-password": 4,
  "account.spec.ts > avatar-upload": 2,
  "account.spec.ts > email-preferences-toggle": 2,
  "auth.spec.ts > login-with-password": 5,
  "auth.spec.ts > sso-redirect": 5,
  "auth.spec.ts > password-reset-email": 4,
  "auth.spec.ts > session-timeout-banner": 2,
  "search.spec.ts > keyword-results": 3,
  "search.spec.ts > empty-state-copy": 2,
  "search.spec.ts > facet-filters": 3,
  "search.spec.ts > sort-order-persistence": 2,
  "reports.spec.ts > export-50k-rows": 2,
  "reports.spec.ts > date-range-picker": 2,
  "reports.spec.ts > scheduled-email-report": 3,
  "admin.spec.ts > audit-log-download": 2,
  "admin.spec.ts > user-role-change": 4,
  "admin.spec.ts > bulk-invite-users": 3,
  "promo.spec.ts > seasonal-banner": 1,
  "promo.spec.ts > referral-invite-flow": 1,
  "orders.spec.ts > order-history-pagination": 3,
  "orders.spec.ts > print-packing-slip": 1,
  "orders.spec.ts > cancel-within-window": 4,
  "orders.spec.ts > reorder-previous-order": 3,
  "notifications.spec.ts > in-app-toast": 1,
  "notifications.spec.ts > digest-opt-out": 2,
  "pricing.spec.ts > currency-switch": 3,
  "pricing.spec.ts > tax-line-rendering": 3,
  "onboarding.spec.ts > first-run-checklist": 2,
  "onboarding.spec.ts > sample-data-import": 2,
  "settings.spec.ts > timezone-change": 2,
  "settings.spec.ts > api-key-rotation": 4
}

=============== FILE: data/regressions.json ===============
{
  "checkout.spec.ts > card-purchase-happy-path": 4,
  "checkout.spec.ts > apply-discount-code": 1,
  "cart.spec.ts > persist-cart-across-sessions": 2,
  "auth.spec.ts > login-with-password": 3,
  "admin.spec.ts > user-role-change": 1,
  "settings.spec.ts > api-key-rotation": 1
}

=============== FILE: data/notes.md ===============
# Where these files come from

- `e2e-stats.jsonl` - regenerated every Monday from the CI history API. Trusted.
- `value-tiers.json` - set by the owning team at the start of each quarter.
- `regressions.json` - maintained by hand by our previous QA lead, who left in
  May. It was only updated when somebody remembered to tell him, and nobody has
  touched it since. Its numbers cover roughly the last twelve months.
- `feature-status.md` - maintained by the PM, current as of last week.
- `incidents/` - the postmortem record. Every priority-1 and priority-2
  incident since January has one, and writing it is mandatory before the
  incident can be closed.

=============== FILE: data/feature-status.md ===============
# Product surface status - updated 2026-09-02

| Surface               | Status                                                           |
|-----------------------|------------------------------------------------------------------|
| Seasonal promo banner | Removed in release 2026-04-30. All code paths deleted.            |
| Referral invite beta  | Ended 2026-03-15. The entry point renders for no account.         |
| Print packing slip    | Replaced by the PDF label service 2026-06-11; the old page 302s.  |
| Everything else       | Shipping.                                                         |

=============== FILE: incidents/2026-postmortems.md ===============
# Incident postmortems - 2026 to date

## INC-2101 - 2026-04-02 - duplicate charge on stored cards
Severity 1. A token reuse bug double-charged 11 accounts in staging.
Caught before release: the e2e job went red on the release branch and the
failing test was `checkout.spec.ts > saved-card-purchase`.

## INC-2118 - 2026-04-19 - 3DS challenge iframe blocked for one issuer
Severity 1. A CSP change broke the challenge iframe for one card issuer.
Caught by `checkout.spec.ts > three-d-secure-challenge` on the release branch.

## INC-2126 - 2026-04-27 - data export produced an empty archive
Severity 2. A storage client upgrade silently returned zero objects.
Caught on main by `account.spec.ts > data-export-request` the morning after the
upgrade merged. Legal has asked that this path stay covered end to end.

## INC-2140 - 2026-05-08 - SSO redirect loop after an IdP metadata change
Severity 1. Two enterprise accounts affected in staging only.
The nightly run caught it - `auth.spec.ts > sso-redirect` failed 14 times in a
row, which is what prompted the investigation.

## INC-2152 - 2026-05-21 - stored card token not refreshed on expiry
Severity 2. Renewals failed for cards issued before 2024.
Caught in CI by `checkout.spec.ts > saved-card-purchase`.

## INC-2163 - 2026-06-04 - discount stacking allowed two percentage codes
Severity 2. Caught by `checkout.spec.ts > apply-discount-code`.

## INC-2170 - 2026-06-18 - audit log recorded no actor for role changes
Severity 2. Caught by `admin.spec.ts > user-role-change`.

## INC-2181 - 2026-07-02 - price rounding wrong for NOK
Severity 2. Reached production, customer-reported after four days. No
automated test covered per-currency rounding at any layer.

## INC-2195 - 2026-07-19 - search facet counts stale after a reindex
Severity 2. Reached production. No test covered facet counts.

## INC-2204 - 2026-08-05 - notification digest delivered twice
Severity 3. Reached production. No test covered digest scheduling.

## INC-2212 - 2026-08-23 - timezone change dropped the DST offset
Severity 2. Reached production. No test covered DST boundaries.
