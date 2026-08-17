# Campaign budget rules are tested at one arbitrary pair of values

## Problem Description

`src/campaign.js` validates the two budget fields on an ad campaign. Both are
whole cents. One of them has fixed limits. The other does not: its floor is
whatever the first field was set to on the same request, so where that floor
sits changes from request to request.

An advertiser on our largest daily cap had a campaign rejected with a message
about the total budget being too low, for a total that would have been fine on
a smaller cap. Nobody could say whether that was correct behaviour, because
the only test we have uses one comfortable pair of numbers and the moving
floor has never been exercised anywhere except at whatever value that test
happens to use.

## Output Specification

1. Add `src/campaign.test.js` giving every limit in this module systematic
   edge coverage.
2. The limit that moves must be covered where it actually moves to - not at a
   single convenient setting of the field it depends on.
3. Every rejecting case asserts the specific code, not merely that the request
   was refused.
4. Run `npm test` before you finish; it must pass.
5. Do not edit `src/campaign.js`, and leave `src/campaign.smoke.test.js` in
   place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ads-campaigns",
  "version": "5.6.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/campaign.js ===============
'use strict';

// All amounts are whole cents.
//   dailyCapCents:    1000 to 100000, both endpoints included.
//   totalBudgetCents: at least dailyCapCents, at most 10000000, both
//                     endpoints included. Its floor is not a constant - it is
//                     whatever dailyCapCents is on the same request.
const MIN_DAILY_CAP = 1000;
const MAX_DAILY_CAP = 100000;
const MAX_TOTAL_BUDGET = 10000000;

function validateCampaign(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, code: 'MALFORMED' };
  }
  const { dailyCapCents, totalBudgetCents } = input;
  if (!Number.isInteger(dailyCapCents)) {
    return { ok: false, code: 'DAILY_CAP_NOT_INTEGER' };
  }
  if (!Number.isInteger(totalBudgetCents)) {
    return { ok: false, code: 'TOTAL_BUDGET_NOT_INTEGER' };
  }
  if (dailyCapCents < MIN_DAILY_CAP) {
    return { ok: false, code: 'DAILY_CAP_TOO_LOW' };
  }
  if (dailyCapCents > MAX_DAILY_CAP) {
    return { ok: false, code: 'DAILY_CAP_TOO_HIGH' };
  }
  if (totalBudgetCents < dailyCapCents) {
    return { ok: false, code: 'TOTAL_BELOW_DAILY_CAP' };
  }
  if (totalBudgetCents > MAX_TOTAL_BUDGET) {
    return { ok: false, code: 'TOTAL_BUDGET_TOO_HIGH' };
  }
  return { ok: true, code: null };
}

module.exports = {
  validateCampaign,
  MIN_DAILY_CAP,
  MAX_DAILY_CAP,
  MAX_TOTAL_BUDGET,
};

=============== FILE: src/campaign.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCampaign } = require('./campaign');

test('accepts an ordinary campaign budget', () => {
  const result = validateCampaign({
    dailyCapCents: 5000,
    totalBudgetCents: 250000,
  });
  assert.deepEqual(result, { ok: true, code: null });
});
