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
