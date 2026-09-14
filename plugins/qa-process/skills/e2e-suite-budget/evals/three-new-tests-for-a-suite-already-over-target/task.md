# Review the test side of PR #1207 - saved payment methods

## Problem Description

PR #1207 ships saved payment methods. The feature work is reviewed and fine;
what is left is the test side, and that is what I want your eyes on.

The PR adds three end-to-end tests in `tests/saved-cards.spec.ts` and retires
nothing. Together they are 6.8 minutes of serial runtime: 2.9 for the purchase
test, 1.9 for the masking test, 2.0 for the expiry test. Yusuf writes good tests
and these read fine to me, though I have only skimmed them.

Context in the bundle: `docs/ci-policy.md` is our PR-feedback policy and where
the job actually is. `reports/e2e-ranking-w36.md` is last week's per-test
ranking, worst end only. `incidents/2026-incidents.md` and
`docs/removed-surfaces.md` are the two things I always forget to check before I
argue about test coverage. `src/payments/card.js` is the source the new tests
exercise, and the repo's existing unit tests are in the bundle too.

The release is Thursday. Yusuf will push back if I ask for rework, so whatever I
send has to be worth the argument and specific enough that he can do it
Wednesday morning without coming back to me.

## Output Specification

1. `reviews/pr-1207-review.md` - my review comment. A verdict on each of the
   three new tests, plus whatever else you think I should be saying.
2. Whatever code changes your review calls for, made in the repo, so Yusuf can
   take the branch as it stands on Wednesday morning.

`npm test` must pass when you are done, with the tests already in the repo still
green. Do not change `src/payments/card.js`, `docs/ci-policy.md`,
`reports/e2e-ranking-w36.md`, `incidents/2026-incidents.md`, or
`docs/removed-surfaces.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront",
  "private": true,
  "scripts": { "test": "node --test" }
}

=============== FILE: src/payments/card.js ===============
'use strict';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function maskPan(pan) {
  const digits = String(pan).replace(/\D/g, '');
  if (digits.length < 12) throw new Error(`pan too short: ${digits.length} digits`);
  const groups = [];
  let buf = '';
  for (let i = 0; i < digits.length - 4; i += 1) {
    buf += '•';
    if (buf.length === 4) {
      groups.push(buf);
      buf = '';
    }
  }
  if (buf) groups.push(buf);
  groups.push(digits.slice(-4));
  return groups.join(' ');
}

function expiryMessage(expiry, now) {
  const [year, month] = String(expiry).split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) throw new Error(`bad expiry: ${expiry}`);
  const firstOfNextMonth = Date.UTC(year, month, 1);
  if (now.getTime() < firstOfNextMonth) return null;
  return `This card expired in ${MONTHS[month - 1]} ${year}`;
}

module.exports = { maskPan, expiryMessage };

=============== FILE: test/card.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { maskPan } = require('../src/payments/card');

test('masks a 16-digit pan down to its last four', () => {
  assert.equal(maskPan('4242424242424242'), '•••• •••• •••• 4242');
});

=============== FILE: src/pricing/vat.js ===============
'use strict';

const RATES = { GB: 0.20, NO: 0.25, DK: 0.25, PL: 0.23, DE: 0.19 };
const ROUNDING = { GB: 'half-up', NO: 'half-even', DK: 'half-even', PL: 'half-up', DE: 'half-up' };

function round(value, mode) {
  if (mode === 'half-even') {
    const floor = Math.floor(value);
    const diff = value - floor;
    if (diff !== 0.5) return Math.round(value);
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.floor(value + 0.5);
}

function taxLineMinor(country, netMinor) {
  const rate = RATES[country];
  if (rate === undefined) throw new Error(`no rate for ${country}`);
  return round(netMinor * rate, ROUNDING[country]);
}

module.exports = { taxLineMinor, RATES, ROUNDING };

=============== FILE: src/support/contact-form.js ===============
'use strict';

const PLACEHOLDERS = {
  subject: 'What is this about?',
  body: 'Tell us what happened and we will come back to you',
};

function placeholder(field) {
  if (!(field in PLACEHOLDERS)) throw new Error(`unknown field: ${field}`);
  return PLACEHOLDERS[field];
}

module.exports = { placeholder };

=============== FILE: src/support/contact-form.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { placeholder } = require('./contact-form');

test('contact form placeholder copy', () => {
  assert.equal(placeholder('subject'), 'What is this about?');
  assert.equal(placeholder('body'), 'Tell us what happened and we will come back to you');
});

test('unknown field throws', () => {
  assert.throws(() => placeholder('nope'), /unknown field/);
});

=============== FILE: tests/saved-cards.spec.ts ===============
import { test, expect } from '@playwright/test';

test('pay with a saved card', async ({ page }) => {
  await page.goto('/checkout/payment');
  await page.getByRole('radio', { name: 'Visa ending 4242' }).click();
  page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  expect(page.getByTestId('charged-amount')).toHaveText('£48.20');
});

test('saved card list masks all but the last four', async ({ page }) => {
  await page.goto('/account/payment-methods');
  await expect(page.getByTestId('saved-card-0')).toHaveText('•••• •••• •••• 4242');
});

test('expired saved card shows an error', async ({ page }) => {
  await page.goto('/checkout/payment');
  await page.getByRole('radio', { name: 'Visa ending 1881' }).click();
  await expect(page.getByRole('alert')).toHaveText('This card expired in March 2026');
});

=============== FILE: docs/ci-policy.md ===============
# CI policy - PR feedback

- **Target:** PR feedback completes within 30 minutes. Agreed at the
  engineering all-hands on 2026-03-04 and not revised since.
- **Now:** 41 minutes wall clock. 118 end-to-end tests, 152 minutes serial,
  four shards.
- We have been over the target since week 31 - five weeks.
- **Feature exemption (added week 32):** a PR shipping customer-facing work may
  add end-to-end tests without retiring or moving any. The suite is brought
  back under the target at the quarterly review. Added so feature delivery
  would stop being held up by the state of the suite.
- Standing note pinned in the CI channel since week 32: *"suite review
  scheduled for next quarter, please do not add more shards."*
- Feature PRs that have used the exemption: #1163 (+4.1 min), #1184 (+3.3 min),
  #1199 (+5.2 min). None of the three retired or moved anything.

=============== FILE: reports/e2e-ranking-w36.md ===============
# Per-test ranking, week 36 - worst twelve of 118

Suite median score 1.7. Serial runtime 152 min over 118 tests.

| Test                                        | Score | Runtime |
|---------------------------------------------|------:|--------:|
| `promo.spec.ts > seasonal-banner`            |  0.00 |   1.6m  |
| `help.spec.ts > contact-form-placeholder`    |  0.00 |   1.4m  |
| `pricing.spec.ts > vat-rounding-by-country`  |  0.00 |   2.3m  |
| `reports.spec.ts > export-50k-rows`          |  0.00 |   4.6m  |
| `onboarding.spec.ts > tour-tooltips`         |  0.06 |   2.4m  |
| `notifications.spec.ts > in-app-toast`       |  0.09 |   0.8m  |
| `settings.spec.ts > theme-toggle`            |  0.11 |   1.2m  |
| `search.spec.ts > empty-state-copy`          |  0.14 |   0.9m  |
| `account.spec.ts > avatar-crop`              |  0.17 |   2.1m  |
| `reports.spec.ts > date-range-picker`        |  0.21 |   1.4m  |
| `admin.spec.ts > audit-log-download`         |  0.24 |   2.4m  |
| `orders.spec.ts > reorder-previous-order`    |  0.29 |   1.8m  |

=============== FILE: incidents/2026-incidents.md ===============
# Production incidents, 2026 to date

## INC-2181 - VAT rounding, Norway - 2026-07-09
Norwegian orders rounded the tax line to the wrong minor unit on any basket
whose pre-tax total landed exactly on a half. Live for six days; found by a
customer, not by us. Root cause was the per-country rounding mode table in
`src/pricing/vat.js`. The check written afterwards was
`pricing.spec.ts > vat-rounding-by-country`, which walks the storefront once
per country in the table. The table has been edited twice since: 2026-07-28
(Denmark) and 2026-08-19 (Poland).

## INC-2174 - saved-card tokens returned to the wrong session - 2026-06-02
Reported to us by the payments provider. Fixed the same day. No test was
written; the feature was behind a flag and is what PR #1207 is now shipping.

## INC-2160 - report export timed out above 30k rows - 2026-05-11
Fixed by moving the export onto a background worker on 2026-06-18. The worker
path has had an integration test in the API repo since that release.

=============== FILE: docs/removed-surfaces.md ===============
# Surfaces removed from the product

| Surface                 | Removed    | Notes                                    |
|-------------------------|------------|------------------------------------------|
| Seasonal promo banner    | 2026-05-14 | `/promo/seasonal` returns 404.           |
| Legacy coupon stacking   | 2026-02-20 | Route and feature flag both deleted.     |
| Public wishlist sharing  | 2025-11-30 | Replaced by shared carts.                |
