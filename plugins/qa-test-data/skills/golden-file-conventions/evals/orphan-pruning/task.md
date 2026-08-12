# The golden directory has drifted from the tests

## Problem Description

`__golden__/` has accumulated baselines over two years of refactors. Some
belong to tests that no longer exist. At least one test points at a baseline
that was never committed, so the suite is currently red.

Nobody knows which files are still load-bearing, so nobody deletes anything.

## Output Specification

1. Get the suite green without weakening any test that is currently
   asserting real behaviour.
2. Remove the baselines that no test uses.
3. Produce `golden-directory-audit.md` listing every file in `__golden__/`
   with its status - in use by which test, or removed and why - plus the rule
   the team should apply when a baseline stops being referenced.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "documents",
  "version": "4.0.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/documents.js ===============
'use strict';

function buildInvoice(order) {
  return {
    kind: 'invoice',
    number: order.number,
    lines: order.lines.map((line) => ({ sku: line.sku, cents: line.cents })),
    totalCents: order.lines.reduce((sum, line) => sum + line.cents, 0),
  };
}

function buildReceipt(order) {
  return {
    kind: 'receipt',
    number: order.number,
    paidCents: order.paidCents,
    method: order.method,
  };
}

function buildStatement(account) {
  return {
    kind: 'statement',
    accountId: account.id,
    openingCents: account.openingCents,
    closingCents: account.openingCents + account.movements.reduce((sum, m) => sum + m, 0),
    movementCount: account.movements.length,
  };
}

module.exports = { buildInvoice, buildReceipt, buildStatement };

=============== FILE: src/fixtures.js ===============
'use strict';

const ORDER = {
  number: 'INV-1001',
  paidCents: 3000,
  method: 'card',
  lines: [
    { sku: 'A-1', cents: 1000 },
    { sku: 'B-2', cents: 2000 },
  ],
};

const ACCOUNT = { id: 'acc_9', openingCents: 5000, movements: [-1200, 400, -300] };

module.exports = { ORDER, ACCOUNT };

=============== FILE: __golden__/invoice.json ===============
{
  "kind": "invoice",
  "number": "INV-1001",
  "lines": [
    { "sku": "A-1", "cents": 1000 },
    { "sku": "B-2", "cents": 2000 }
  ],
  "totalCents": 3000
}

=============== FILE: __golden__/receipt.json ===============
{
  "kind": "receipt",
  "number": "INV-1001",
  "paidCents": 3000,
  "method": "card"
}

=============== FILE: __golden__/legacy-summary.json ===============
{
  "kind": "summary",
  "generatedBy": "reports-v1",
  "rows": []
}

=============== FILE: __golden__/old-invoice-v1.json ===============
{
  "kind": "invoice",
  "number": "INV-1001",
  "total": "30.00",
  "currency": "EUR"
}

=============== FILE: src/documents.golden.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildInvoice, buildReceipt, buildStatement } = require('./documents');
const { ORDER, ACCOUNT } = require('./fixtures');

function golden(name) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '__golden__', `${name}.json`), 'utf8'),
  );
}

test('invoice matches its baseline', () => {
  assert.deepEqual(buildInvoice(ORDER), golden('invoice'));
});

test('receipt matches its baseline', () => {
  assert.deepEqual(buildReceipt(ORDER), golden('receipt'));
});

test('statement matches its baseline', () => {
  assert.deepEqual(buildStatement(ACCOUNT), golden('statement'));
});
