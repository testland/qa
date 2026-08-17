# The commit on BUG-3318 does not appear to be in the staging build

## Problem Description

BUG-3318 (a discount larger than the line subtotal produces a negative cart
total) is sitting in Fixed. Before I move it on I checked whether staging is
actually running the change, using the commit id the developer put on the
ticket. The check says no - see `ops/checks.txt`.

My first instinct was to bounce the ticket back and ask the platform team why
staging is stale, but the release engineer says nothing has been rolled back
this week and the deploy that put `d4c7a03` on staging ran after the pull
request landed. Two people now disagree about whether the fix is on the box.

The repository is checked out in full, the automated reproduction from the
defect is committed, and staging reports the exact commit it was built from.

## Output Specification

1. Write `qa-record/BUG-3318.md`: whether this defect can move to Verified,
   and the evidence for it, including how the disagreement about the commit was
   settled and which commit identifier a future reader should use for this fix.
2. Run only what the decision requires and paste real output into the record -
   no summaries of what you believe happened.
3. Do not edit `issues/BUG-3318.md`, `src/cart.js`, or anything under `ops/`.

## Input Files

Extract the following files before beginning.

=============== FILE: issues/BUG-3318.md ===============
# BUG-3318 - Percentage discount can drive a line total negative

**Status:** Fixed (awaiting verification)
**Reported:** 2026-07-11 by t.abara
**Fix commit:** `a17f2d9` (from the developer's branch, PR #812)

## Reproduction

`tests/cart-discount.repro.test.js` was added on the fix branch and was red at
`0aa9e51` (CI job 4471, "expected 0 to be >= 0, received -250"). It is the
artifact that failed before the change.

Manual equivalent: add SKU `A-1` at 1000 cents, apply promo `HALFOFF` twice,
observe the line total at -250 cents. Expected: never below 0.

## Comments

**2026-07-30 elena-r:** Fixed, PR #812, commit `a17f2d9`.

=============== FILE: package.json ===============
{
  "name": "cart-service",
  "version": "3.7.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/cart.js ===============
'use strict';

function lineTotal(line, promos) {
  const subtotal = line.unitCents * line.quantity;
  const off = promos
    .filter((p) => p.sku === line.sku)
    .reduce((sum, p) => sum + Math.round(subtotal * p.rate), 0);
  return Math.max(0, subtotal - off);
}

function cartTotal(lines, promos) {
  return lines.reduce((sum, line) => sum + lineTotal(line, promos), 0);
}

module.exports = { lineTotal, cartTotal };

=============== FILE: tests/cart-discount.repro.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal } = require('../src/cart');

test('BUG-3318: stacked promos never drive a line total negative', () => {
  const line = { sku: 'A-1', unitCents: 1000, quantity: 1 };
  const promos = [
    { sku: 'A-1', rate: 0.5 },
    { sku: 'A-1', rate: 0.75 },
  ];
  assert.equal(lineTotal(line, promos), 0);
});

=============== FILE: tests/cart-total.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cartTotal } = require('../src/cart');

test('cart total sums line totals', () => {
  const lines = [
    { sku: 'A-1', unitCents: 1000, quantity: 2 },
    { sku: 'B-2', unitCents: 250, quantity: 4 },
  ];
  assert.equal(cartTotal(lines, []), 3000);
});

=============== FILE: ops/checks.txt ===============
$ curl -s https://cart.staging.internal/internal/build-info
{"service":"cart-service","commit":"d4c7a03","branch":"main","deployedAt":"2026-08-03T08:14:52Z"}

$ git merge-base --is-ancestor a17f2d9 d4c7a03; echo $?
1

=============== FILE: ops/git-log-main.txt ===============
$ git log --oneline -6 main
d4c7a03 chore(deps): bump undici to 6.19.8
2f8b115 feat(cart): show savings badge
6e0b4c1 fix(cart): clamp discount to line subtotal (#812)
0aa9e51 chore: bump version to 3.7.0
b7712de test(cart): promo fixtures
15c0e88 feat(cart): promo stacking

=============== FILE: ops/pr-812.txt ===============
PR #812 - fix(cart): clamp discount to line subtotal
base: main  <-  head: fix/3318-negative-line-total

Commits on the branch (3):
  8ac1120 test(cart): failing repro for negative line total
  c9d5e41 fix: clamp to zero
  a17f2d9 review feedback: use Math.max

elena-r squashed and merged 3 commits into main on 2026-07-30.
Merged as 6e0b4c1. The branch was deleted.

Repository setting: "Squash merging" is the only enabled merge method.
