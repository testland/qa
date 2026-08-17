'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { loadCatalog, loadCount, total } = require('../src/catalog');

let catalog;

before(() => {
  catalog = loadCatalog();
});

function cartFixture() {
  return { ...catalog };
}

test('totals a cart at list prices', () => {
  assert.equal(total(cartFixture()), 30);
});

test('applies a discount to a line item', () => {
  const cart = cartFixture();
  cart.items[0].price = 5;
  assert.equal(total(cart), 15);
});

test('adds a line item', () => {
  const cart = cartFixture();
  cart.items.push({ sku: 'chair', price: 40 });
  assert.equal(cart.items.length, 3);
});

test('starts from the catalogue default lines', () => {
  assert.equal(cartFixture().items.length, 2);
});

test('totals the default cart', () => {
  assert.equal(total(cartFixture()), 30);
});

test('parses the catalogue once for the whole file', () => {
  assert.equal(loadCount(), 1);
});
