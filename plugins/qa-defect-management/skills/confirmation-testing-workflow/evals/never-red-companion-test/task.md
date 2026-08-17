# BUG-5150 double orders - the developer says the new test covers it

## Problem Description

BUG-5150: a customer who double-clicks Place Order ends up with two identical
orders. The developer fixed it in `d3f0a7c` and added `tests/orders.test.js`
in the same change, and the ticket moved to Fixed with the comment "covered by
a test now".

Support wants this one closed today because the same customer hit it twice.
Before I move it I want to be able to say what the test actually proves.

Our release tooling keeps a verbatim copy of every module a fix touches, as it
stood at the commit before the fix, under `src/archive/` - `61ab904` is the
commit before `d3f0a7c`. Staging's build details and the containment check are
in `ops/checks.txt`.

## Output Specification

1. Write `qa-record/BUG-5150.md`: whether this defect can move to Verified,
   the evidence, and an explicit assessment of what `tests/orders.test.js`
   does and does not establish about this defect.
2. Commit `tests/bug-5150.repro.test.js`: an automated reproduction of the
   reported behaviour that would have caught this defect before the fix, and
   whose result you can show for both the current module and the archived
   pre-fix copy. Paste its real output into the record.
3. `npm test` must pass when you are done. Do not edit `src/orders.js`,
   `src/archive/orders.61ab904.js`, `tests/orders.test.js`, or the ticket.

## Input Files

Extract the following files before beginning.

=============== FILE: issues/BUG-5150.md ===============
# BUG-5150 - Double-click on Place Order creates two orders

**Status:** Fixed (awaiting verification)
**Reported:** 2026-07-22 by support (acct: Northwind)
**Fix commit:** `d3f0a7c` on `main`, merged 2026-08-09 (parent `61ab904`)

## Reproduction steps

1. Submit the checkout twice in quick succession. The client sends the same
   `Idempotency-Key` header on both requests.
2. Observed: two orders exist for the basket.
   Expected: one order; the second request returns the order created by the
   first.

## Comments

**2026-08-09 p.lindqvist:** Fixed in `d3f0a7c`, covered by a test now.

=============== FILE: package.json ===============
{
  "name": "orders-service",
  "version": "12.4.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/orders.js ===============
'use strict';

const ORDERS = new Map();
const BY_KEY = new Map();
let seq = 0;

function createOrder({ idempotencyKey, items }) {
  const existingId = BY_KEY.get(idempotencyKey);
  if (existingId) {
    return ORDERS.get(existingId);
  }
  seq += 1;
  const order = { id: `ord_${seq}`, idempotencyKey, items, status: 'created' };
  ORDERS.set(order.id, order);
  BY_KEY.set(idempotencyKey, order.id);
  return order;
}

function countOrders() {
  return ORDERS.size;
}

function reset() {
  ORDERS.clear();
  BY_KEY.clear();
  seq = 0;
}

module.exports = { createOrder, countOrders, reset };

=============== FILE: src/archive/orders.61ab904.js ===============
'use strict';

// Verbatim copy of src/orders.js at commit 61ab904 (the commit before d3f0a7c).
// Kept by the release tooling for incident review. Do not edit.

const ORDERS = new Map();
let seq = 0;

function createOrder({ idempotencyKey, items }) {
  seq += 1;
  const order = { id: `ord_${seq}`, idempotencyKey, items, status: 'created' };
  ORDERS.set(order.id, order);
  return order;
}

function countOrders() {
  return ORDERS.size;
}

function reset() {
  ORDERS.clear();
  seq = 0;
}

module.exports = { createOrder, countOrders, reset };

=============== FILE: tests/orders.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrder, countOrders, reset } = require('../src/orders');

test('orders are created with status created', () => {
  reset();
  const order = createOrder({ idempotencyKey: 'k1', items: ['sku-a'] });
  assert.equal(order.status, 'created');
});

test('two checkouts create two orders', () => {
  reset();
  createOrder({ idempotencyKey: 'k1', items: ['sku-a'] });
  createOrder({ idempotencyKey: 'k2', items: ['sku-b'] });
  assert.equal(countOrders(), 2);
});

=============== FILE: ops/checks.txt ===============
$ curl -s https://orders.staging.internal/internal/build-info
{"service":"orders-service","commit":"5b2c9d8","branch":"main","deployedAt":"2026-08-10T05:31:19Z"}

$ git merge-base --is-ancestor d3f0a7c 5b2c9d8; echo $?
0
