# Inventory import test fails about once a week and never reproduces

## Problem Description

`test/inventory.test.js` fails roughly one CI run in a hundred. The usual
message is `expected 39 to equal 40` on `every imported row gets its own
inventory record`. Twice this quarter we also saw
`Error: price is required for SKU-40213` from the other test in the file.

Re-running the job always goes green. The sku in the error message is
different every time and never matches anything in the repository. We have
never reproduced either failure locally, including with the suite in a loop
overnight on one machine.

The failures started when this file was written and have not changed
frequency since. `src/inventory.js` has not been touched in that period and
is the code path the nightly supplier feed uses in production. Its input
contract is in the comment at the top of the file.

## Output Specification

1. Fix `test/inventory.test.js` so the two tests give the same result on
   every run, on every machine, forever - not a lower failure rate.
2. Keep both tests and their assertions: forty records for forty rows, and a
   catalog value equal to the sum of the imported rows. Do not modify
   `src/inventory.js`.
3. Write `random-data-report.md`: what makes one run differ from the next,
   why both failure messages come from the same cause, and what a reviewer
   should reject in a future test in this file.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "warehouse",
  "version": "1.4.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/inventory.js ===============
'use strict';

// Import contract: every row carries a sku that is unique within the batch
// and a price of at least 1 (in cents). Rows are keyed by sku.
function importRows(rows) {
  const inventory = new Map();
  for (const row of rows) {
    if (!row.price) {
      throw new Error(`price is required for ${row.sku}`);
    }
    inventory.set(row.sku, { sku: row.sku, price: row.price, qty: row.qty });
  }
  return inventory;
}

function catalogValue(inventory) {
  let total = 0;
  for (const item of inventory.values()) {
    total += item.price * item.qty;
  }
  return total;
}

module.exports = { importRows, catalogValue };

=============== FILE: test/inventory.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { importRows, catalogValue } = require('../src/inventory');

const randomSku = () => `SKU-${Math.floor(Math.random() * 100000)}`;
const randomPrice = () => Math.floor(Math.random() * 10000);
const randomRow = () => ({ sku: randomSku(), price: randomPrice(), qty: 1 });

test('every imported row gets its own inventory record', () => {
  const rows = Array.from({ length: 40 }, randomRow);

  const inventory = importRows(rows);

  assert.equal(inventory.size, 40);
});

test('catalog value adds up the imported rows', () => {
  const rows = Array.from({ length: 12 }, randomRow);
  const expected = rows.reduce((sum, row) => sum + row.price * row.qty, 0);

  const inventory = importRows(rows);

  assert.equal(catalogValue(inventory), expected);
});
