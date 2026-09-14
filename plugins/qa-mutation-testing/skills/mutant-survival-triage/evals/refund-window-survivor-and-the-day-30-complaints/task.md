# Audit finding ARC-77 wants three tests on the refunds module today

## Problem Description

The internal audit of the returns pipeline left us one open finding, ARC-77:
"three decision lines in `src/refunds.js` are executed by the suite but no
assertion distinguishes their outcome." It came out of the StrykerJS run we
started publishing in June; the auditor's evidence is the clear-text extract
attached below, which lists three mutants that lived through the whole suite.

Ops would like the three tests written today so the finding can be closed before
the quarterly pack goes out on the 19th. I am less keen on closing it fast than
on closing it correctly, because three things landed in my inbox this week that
may or may not be related:

- the published returns policy page (v4, the one customer support quotes),
- three complaint tickets support escalated on Tuesday,
- a blame line Tomas asked me to include for one of the flagged lines, because
  he does not remember where that rule came from.

Work through the three flagged lines and tell me, for each one, exactly what
should happen. Where a test is the answer, give me the input and the assertion
written out so it can be pasted in. Where a test is not the answer, say what is
and who has to decide it. I need to be able to hand this to the auditor and to
Ops on the same page.

## Output Specification

1. Write `docs/arc-77-response.md`.
2. One entry per flagged line, each naming the file and line, the input on which
   the two versions of that line disagree, and the outcome you expect on that
   input.
3. Where an entry does not end in a test, state what it ends in instead and who
   owns the decision.
4. `src/refunds.js` and `test/refunds.test.js` are under a change freeze until
   ARC-77 is answered - describe any change you want rather than making it.

## Input Files

Extract the following files before beginning.

=============== FILE: src/refunds.js ===============
'use strict';

const REFUND_WINDOW_DAYS = 30;
const FREE_RETURN_MIN_EUR = 100;
const RESTOCK_FEE_RATE = 0.15;
const RESTOCK_AFTER_DAYS = 14;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isRefundable(daysSinceDelivery) {
  return daysSinceDelivery < REFUND_WINDOW_DAYS;
}

function returnShippingRefunded(orderTotalEur) {
  return orderTotalEur >= FREE_RETURN_MIN_EUR;
}

function restockingFee(priceEur, daysSinceDelivery) {
  if (daysSinceDelivery > RESTOCK_AFTER_DAYS) {
    return round2(priceEur * RESTOCK_FEE_RATE);
  }
  return 0;
}

module.exports = {
  isRefundable,
  returnShippingRefunded,
  restockingFee,
  REFUND_WINDOW_DAYS,
};

=============== FILE: test/refunds.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRefundable,
  returnShippingRefunded,
  restockingFee,
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

test('no restocking fee in the first days', () => {
  assert.equal(restockingFee(80, 3), 0);
});

test('restocking fee charged on a late return', () => {
  assert.equal(restockingFee(80, 40), 12);
});

=============== FILE: reports/stryker-cleartext-extract.txt ===============
Mutation testing  [==================================================] 100%
3 mutant(s) survived. Full report at reports/mutation/index.html

#1. [Survived] EqualityOperator
src/refunds.js:13:10
-     return daysSinceDelivery < REFUND_WINDOW_DAYS;
+     return daysSinceDelivery <= REFUND_WINDOW_DAYS;
Tests ran:
    a recent delivery is refundable
    an old delivery is not refundable

#2. [Survived] EqualityOperator
src/refunds.js:17:10
-     return orderTotalEur >= FREE_RETURN_MIN_EUR;
+     return orderTotalEur > FREE_RETURN_MIN_EUR;
Tests ran:
    small orders pay their own return shipping
    large orders get return shipping refunded

#3. [Survived] EqualityOperator
src/refunds.js:21:7
-     if (daysSinceDelivery > RESTOCK_AFTER_DAYS) {
+     if (daysSinceDelivery >= RESTOCK_AFTER_DAYS) {
Tests ran:
    no restocking fee in the first days
    restocking fee charged on a late return

Ran 6 tests per mutant on average (6 total).
Mutation score: 88.24% (detected / valid)

=============== FILE: docs/returns-policy-v4.md ===============
# Returns and refunds - customer-facing policy v4

Effective 2026-01-01. This is the text support quotes and the text Legal signed
off. Supersedes v3 (which said "within 30 days" and caused the 2025 dispute).

## Window

A delivered order may be returned **within 30 calendar days of delivery,
inclusive of the thirtieth day**. A request that reaches us on day 30 is inside
the window and must be accepted.

## Return shipping

Return shipping is refunded on orders of **EUR 100 or more**. An order totalling
exactly EUR 100 qualifies.

## Restocking

Items returned **opened** carry a restocking fee of 15% of the item price. Items
returned sealed carry no fee.

There is no elapsed-time component to the restocking fee in this policy. v3 did
not have one either.

=============== FILE: support/escalations-tuesday.md ===============
# Escalated to eng by @support-lead, Tuesday

**CS-90412** - customer returned a jacket, request submitted on day 30 after
delivery (delivery 2026-08-04, request 2026-09-03). Portal rejected it with
"outside the returns window". Support overrode it manually and refunded.

**CS-90455** - same shape. Day 30. Portal rejected, support overrode.

**CS-90478** - day 30 again. Customer had already quoted the policy page at us
before support picked it up. Overridden and refunded, plus a goodwill voucher.

**CS-90390** - unrelated, filed for context: order total exactly EUR 100.00,
return shipping was refunded automatically, customer happy, no override needed.

@support-lead: three manual overrides in one week, all on the same day number. I
have no idea which side is the odd one out. Someone tell me what to train the
team on, because right now they are guessing.

=============== FILE: notes/blame-line-21.md ===============
Tomas asked me to attach this for the third flagged line.

$ git log -1 --format='%h %an %ad %s' -L 21,21:src/refunds.js
4f1c9aa  Tomas Reiner  2025-11-12  match what the warehouse does

No ticket referenced in the commit, no linked design doc, nothing in the PR
description beyond the subject line. Tomas says he was told verbally by someone
in the Rotterdam warehouse and cannot remember who. Product owner for returns
policy is @nsalvatore.
