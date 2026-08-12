# The report golden file fails on every run

## Problem Description

`src/report.golden.test.js` compares a generated report against a baseline
checked in at `__golden__/report.json`. It has never passed on anyone's
machine except the one that produced the baseline, so the team runs the suite
with that test skipped and nobody looks at it.

We would like the golden comparison to be worth keeping: stable across
machines and runs, while still failing if the report's actual content
changes.

## Output Specification

1. Make the golden test pass reliably on any machine, without weakening it to
   the point that a real content change would slip through.
2. Produce `golden-review-notes.md`: which parts of the report were volatile,
   how each is handled now, and what a reviewer should do when this baseline
   legitimately changes in a future pull request.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "reporting",
  "version": "1.6.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/report.js ===============
'use strict';

const { randomUUID } = require('node:crypto');
const path = require('node:path');

function buildReport(items) {
  return {
    reportId: randomUUID(),
    createdAt: new Date().toISOString(),
    sourcePath: path.join(process.cwd(), 'data', 'items.json'),
    itemCount: items.length,
    totalCents: items.reduce((sum, item) => sum + item.priceCents, 0),
    currency: 'EUR',
    items: items.map((item) => ({ sku: item.sku, priceCents: item.priceCents })),
  };
}

module.exports = { buildReport };

=============== FILE: __golden__/report.json ===============
{
  "reportId": "8f14e45f-ceea-467a-9575-9f0ed7f0a4b1",
  "createdAt": "2026-01-05T09:14:22.517Z",
  "sourcePath": "/Users/maria/projects/reporting/data/items.json",
  "itemCount": 3,
  "totalCents": 4750,
  "currency": "EUR",
  "items": [
    { "sku": "SKU-100", "priceCents": 1500 },
    { "sku": "SKU-200", "priceCents": 2000 },
    { "sku": "SKU-300", "priceCents": 1250 }
  ]
}

=============== FILE: src/report.golden.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildReport } = require('./report');

const ITEMS = [
  { sku: 'SKU-100', priceCents: 1500 },
  { sku: 'SKU-200', priceCents: 2000 },
  { sku: 'SKU-300', priceCents: 1250 },
];

test('report matches the golden baseline', () => {
  const golden = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '__golden__', 'report.json'), 'utf8'),
  );

  assert.deepEqual(buildReport(ITEMS), golden);
});
