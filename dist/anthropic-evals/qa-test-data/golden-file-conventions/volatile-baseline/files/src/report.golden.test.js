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
