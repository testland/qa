# The promo brief and the promo code disagree about the endpoints

## Problem Description

`src/discount.js` decides whether an order qualifies for the spring promo. The
brief it was built from is quoted at the top of the file, and it is worded the
way briefs usually are: "between 10 and 100 items", "a subtotal of up to
500.00 EUR".

Support has now asked twice whether an order of exactly 100 items qualifies,
and once whether an order whose subtotal is exactly 500.00 qualifies. Reading
the brief does not settle it. Reading the module does, but nobody trusts an
answer that lives only in someone's head, and the current tests use an order
that is comfortably inside every limit so they do not settle it either.

Marketing is about to reuse the same wording for the summer promo, so we want
the shipped behaviour written down as tests before anyone copies the brief.

## Output Specification

1. Add `src/discount.test.js` giving every limit in this module systematic
   edge coverage, so each endpoint's treatment is pinned by a test rather than
   inferred from the brief.
2. Where the brief is ambiguous, record the shipped reading explicitly - in a
   test name or a comment in the new file - so a reader knows the endpoint
   behaviour was determined from the implementation and not from the wording.
3. Every rejecting case asserts the specific code, not merely that the order
   was ineligible.
4. Run `npm test` before you finish; it must pass.
5. Do not edit `src/discount.js`, and leave `src/discount.smoke.test.js` in
   place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "promo-engine",
  "version": "4.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/discount.js ===============
'use strict';

// Spring promo eligibility, quoted verbatim from the promo brief:
//   "Applies to orders between 10 and 100 items with a subtotal of up to
//    500.00 EUR."
// The brief does not say whether those endpoints count. The comparisons below
// are the shipped behaviour.
const MIN_ITEMS = 10;
const MAX_ITEMS = 100;
const SUBTOTAL_LIMIT_CENTS = 50000; // 500.00 EUR

function isEligible(order) {
  if (!order || typeof order !== 'object') {
    return { eligible: false, code: 'MALFORMED' };
  }
  const { itemCount, subtotalCents } = order;
  if (!Number.isInteger(itemCount) || itemCount < 0) {
    return { eligible: false, code: 'BAD_ITEM_COUNT' };
  }
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    return { eligible: false, code: 'BAD_SUBTOTAL' };
  }
  if (itemCount < MIN_ITEMS) {
    return { eligible: false, code: 'TOO_FEW_ITEMS' };
  }
  if (itemCount > MAX_ITEMS) {
    return { eligible: false, code: 'TOO_MANY_ITEMS' };
  }
  if (subtotalCents >= SUBTOTAL_LIMIT_CENTS) {
    return { eligible: false, code: 'SUBTOTAL_TOO_HIGH' };
  }
  return { eligible: true, code: null };
}

module.exports = { isEligible, MIN_ITEMS, MAX_ITEMS, SUBTOTAL_LIMIT_CENTS };

=============== FILE: src/discount.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isEligible } = require('./discount');

test('an ordinary order qualifies', () => {
  const result = isEligible({ itemCount: 20, subtotalCents: 12000 });
  assert.deepEqual(result, { eligible: true, code: null });
});
