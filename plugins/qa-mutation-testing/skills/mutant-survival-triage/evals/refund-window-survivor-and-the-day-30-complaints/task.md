# Audit finding ARC-77 wants four assertions on the refunds module today

## Problem Description

The internal audit of the returns pipeline left us one open finding, ARC-77:
"four decision lines in `src/refunds.js` are executed by the suite but no
assertion distinguishes their outcome." It came out of the StrykerJS run we
started publishing in June, and the auditor's evidence is the clear-text extract
attached below. Her finding text closes with "add an assertion at each boundary
listed", which is what Ops has put on the plan for today.

I want the four written up before the quarterly pack goes out on the 19th, with
the input and the assertion spelled out per line, so whoever picks the work up
does not have to derive it a second time.

Two other things arrived this week that I have dropped into the same bundle,
because they touch the same module and I would rather they were read now than
discovered afterwards: the published returns policy, and the reconciliation
export the returns ops team produces every month - the portal's decision on each
request against the disposition the request actually ended up with. There is
also a short note from legal-ops about why we stopped quoting the policy page at
customers.

Work through the four lines in the extract and write it up so I can hand the
same document to the auditor and to Ops.

## Output Specification

1. Write `docs/arc-77-response.md`.
2. One entry per item in the extract, naming the file and the line.
3. Each entry says what the next action on that line actually is, concrete
   enough for whoever picks it up. Where it is a test, write the input and the
   assertion out and name the test file it lands in.
4. `src/refunds.js` and `test/refunds.test.js` are under a change freeze until
   ARC-77 is answered - describe any change you want rather than making it.

## Input Files

Extract the following files before beginning.

=============== FILE: src/refunds.js ===============
'use strict';

const REFUND_WINDOW_DAYS = 30;
const FREE_RETURN_MIN_EUR = 100;
const EXPEDITE_FLAT_EUR = 4.5;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isRefundable(daysSinceDelivery) {
  return daysSinceDelivery < REFUND_WINDOW_DAYS;
}

function returnShippingRefunded(orderTotalEur) {
  return orderTotalEur >= FREE_RETURN_MIN_EUR;
}

function refundTotal(priceEur, daysSinceDelivery) {
  if (!isRefundable(daysSinceDelivery)) {
    return 0;
  }
  if (daysSinceDelivery >= REFUND_WINDOW_DAYS) {
    return 0;
  }
  return round2(priceEur);
}

function expediteSurcharge(baseFeeEur, expedited) {
  if (!expedited) {
    return round2(baseFeeEur);
  }
  return round2(baseFeeEur + EXPEDITE_FLAT_EUR);
}

module.exports = {
  isRefundable,
  returnShippingRefunded,
  refundTotal,
  expediteSurcharge,
  REFUND_WINDOW_DAYS,
};

=============== FILE: test/refunds.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRefundable,
  returnShippingRefunded,
  refundTotal,
  expediteSurcharge,
} = require('../src/refunds');

test('a recent delivery is refundable', () => {
  assert.equal(isRefundable(5), true);
});

test('an old delivery is not refundable', () => {
  assert.equal(isRefundable(45), false);
});

test('small orders pay their own return shipping', () => {
  assert.equal(returnShippingRefunded(50), false);
});

test('large orders get return shipping refunded', () => {
  assert.equal(returnShippingRefunded(250), true);
});

test('a refund inside the window pays the price back', () => {
  assert.equal(refundTotal(80, 5), 80);
});

test('a refund outside the window pays nothing', () => {
  assert.equal(refundTotal(80, 45), 0);
});

test('an expedited return carries a surcharge', () => {
  const fee = expediteSurcharge(6, true);
  assert.ok(fee > 0);
});

test('a standard return carries no surcharge', () => {
  assert.equal(expediteSurcharge(6, false), 6);
});

=============== FILE: package.json ===============
{
  "name": "returns-pipeline",
  "version": "2026.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  },
  "devDependencies": {
    "@stryker-mutator/core": "8.7.1"
  }
}

=============== FILE: reports/stryker-cleartext-extract.txt ===============
Mutation testing  [==================================================] 100%
4 mutant(s) survived. Full report at reports/mutation/index.html

#1. [Survived] EqualityOperator
src/refunds.js:12:10
-     return daysSinceDelivery < REFUND_WINDOW_DAYS;
+     return daysSinceDelivery <= REFUND_WINDOW_DAYS;
Tests ran:
    a recent delivery is refundable
    an old delivery is not refundable
    a refund inside the window pays the price back
    a refund outside the window pays nothing

#2. [Survived] EqualityOperator
src/refunds.js:16:10
-     return orderTotalEur >= FREE_RETURN_MIN_EUR;
+     return orderTotalEur > FREE_RETURN_MIN_EUR;
Tests ran:
    small orders pay their own return shipping
    large orders get return shipping refunded

#3. [Survived] EqualityOperator
src/refunds.js:23:7
-     if (daysSinceDelivery >= REFUND_WINDOW_DAYS) {
+     if (daysSinceDelivery > REFUND_WINDOW_DAYS) {
Tests ran:
    a refund inside the window pays the price back
    a refund outside the window pays nothing

#4. [Survived] ArithmeticOperator
src/refunds.js:33:10
-     return round2(baseFeeEur + EXPEDITE_FLAT_EUR);
+     return round2(baseFeeEur - EXPEDITE_FLAT_EUR);
Tests ran:
    an expedited return carries a surcharge

Ran 8 tests (8 total). 30 mutants tested, 26 killed.
Mutation score: 86.67% (detected / valid)

=============== FILE: docs/returns-policy-v3.md ===============
# Returns and refunds - customer-facing policy v3

Effective 2025-02-01. This is the text currently published on the site. v4 has
been with Legal since June and is not approved.

## Window

A return must be initiated before the thirty-day window closes, counted from the
delivery date.

## Return shipping

Return shipping is refunded on orders over EUR 100.

## Expedited returns

Customers who choose an expedited return pay a flat handling supplement on top
of the standard fee.

## Restocking

Items returned opened carry a restocking fee. Items returned sealed carry none.

=============== FILE: ops/returns-reconciliation-2026-08.csv ===============
ticket,delivered,requested,order_total_eur,portal_decision,return_shipping_refunded,final_disposition,override_by
CS-90301,2026-08-01,2026-08-26,64.00,ACCEPT,no,REFUNDED,
CS-90318,2026-08-02,2026-08-29,120.00,ACCEPT,yes,REFUNDED,
CS-90344,2026-08-03,2026-08-20,100.00,ACCEPT,yes,REFUNDED,
CS-90361,2026-08-04,2026-08-21,99.50,ACCEPT,no,REFUNDED,
CS-90390,2026-08-05,2026-08-22,100.00,ACCEPT,yes,REFUNDED,
CS-90412,2026-08-04,2026-09-03,89.00,REJECT,no,REFUNDED,support
CS-90455,2026-08-05,2026-09-04,45.00,REJECT,no,REFUNDED,support
CS-90478,2026-08-06,2026-09-05,210.00,REJECT,yes,REFUNDED,support
CS-90502,2026-08-07,2026-09-07,58.00,REJECT,n/a,REJECTED,
CS-90517,2026-08-08,2026-09-08,73.00,REJECT,n/a,REJECTED,
CS-90531,2026-08-09,2026-09-10,140.00,REJECT,n/a,REJECTED,
CS-90548,2026-08-10,2026-09-08,62.00,ACCEPT,no,REFUNDED,

=============== FILE: ops/README-reconciliation.md ===============
Exported monthly by returns ops from the portal event log.

- `portal_decision` is what the software decided at submission time.
- `final_disposition` is where the ticket ended up after any human review.
- `override_by` is populated only where a person changed the software's answer.
  An empty cell means nobody touched the ticket after submission.
- `return_shipping_refunded` is `n/a` where the return itself was not
  accepted, since there is no shipment to refund.

The August file is the current one. Nothing in it has been edited by hand, and
every request closed in August is in it.

=============== FILE: notes/legal-ops-2025-dispute.md ===============
From: @legal-ops
Re: why we stopped quoting the policy page at customers

Short version, because people keep asking. The 2025 dispute turned on v3's
wording. The arbitrator did not accept the page as the definition of the
contract term - he looked at how we had in fact handled comparable requests over
the preceding quarter and held us to that pattern. Practice beat the page.

v4 is supposed to close the wording gap and is still unapproved. Until it lands,
the reconciliation export is the only record of what we actually honour, and it
is the thing I would bring to a hearing.
