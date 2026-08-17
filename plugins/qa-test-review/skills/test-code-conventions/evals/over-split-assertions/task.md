# Every new field on a shipping quote costs us five more tests

## Problem Description

`src/quote.test.js` has fourteen tests. Eleven of them call `quote` with one of
three orders and check a single field of the returned object each - one test
for the shipping cost, one for the free flag, one for the carrier, one for the
delivery estimate, one for the currency.

When `etaDays` was added it cost us three new tests, one per order. The next
field will cost three more again.

Worse, a failure comes in one field at a time. When the parcel rate changed
last month the run reported the shipping cost mismatch, we fixed the test,
reran, and only then learned the delivery estimate had moved too. It took four
rounds to see the whole picture, which one look at the returned quote would
have given us immediately.

Three tests in the file are not like the others and are there on purpose: two
of them sit either side of the free-shipping threshold, and one checks that
`quote` leaves the order it was given untouched.

## Output Specification

1. Rework `src/quote.test.js` so that a failure in a scenario shows the whole
   quote that scenario produces, and so that adding a field to the returned
   object does not require adding tests.
2. Every field asserted today must still be asserted, with the same expected
   values. Scenarios that are there to distinguish two different situations
   must remain distinguishable from each other when one of them fails.
3. Produce `quote-test-review.md` listing what you combined, on what basis, and
   what you deliberately left alone.

Do not change `src/quote.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "shipping-quote",
  "version": "5.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/quote.js ===============
'use strict';

const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
const BASE_CENTS = 599;
const PER_KG_CENTS = 120;
const FREIGHT_ABOVE_KG = 20;

function quote(order) {
  const free = order.subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const weightCents = Math.round(order.weightKg * PER_KG_CENTS);
  const heavy = order.weightKg > FREIGHT_ABOVE_KG;
  return {
    shippingCents: free ? 0 : BASE_CENTS + weightCents,
    free,
    carrier: heavy ? 'freight' : 'parcel',
    etaDays: heavy ? 5 : 2,
    currency: 'EUR',
  };
}

module.exports = { quote };

=============== FILE: src/quote.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('./quote');

const lightOrder = { subtotalCents: 2000, weightKg: 2, destination: 'DE' };
const heavyOrder = { subtotalCents: 3000, weightKg: 30, destination: 'DE' };
const freeOrder = { subtotalCents: 6000, weightKg: 2, destination: 'DE' };

test('a light parcel is charged 839 cents', () => {
  assert.equal(quote(lightOrder).shippingCents, 839);
});

test('a light parcel is not free', () => {
  assert.equal(quote(lightOrder).free, false);
});

test('a light parcel ships by parcel carrier', () => {
  assert.equal(quote(lightOrder).carrier, 'parcel');
});

test('a light parcel arrives in 2 days', () => {
  assert.equal(quote(lightOrder).etaDays, 2);
});

test('a light parcel is priced in euros', () => {
  assert.equal(quote(lightOrder).currency, 'EUR');
});

test('a heavy order is charged 4199 cents', () => {
  assert.equal(quote(heavyOrder).shippingCents, 4199);
});

test('a heavy order ships by freight', () => {
  assert.equal(quote(heavyOrder).carrier, 'freight');
});

test('a heavy order arrives in 5 days', () => {
  assert.equal(quote(heavyOrder).etaDays, 5);
});

test('a heavy order is not free', () => {
  assert.equal(quote(heavyOrder).free, false);
});

test('an order over the threshold ships free', () => {
  assert.equal(quote(freeOrder).free, true);
});

test('an order over the threshold is charged nothing', () => {
  assert.equal(quote(freeOrder).shippingCents, 0);
});

test('one cent below the threshold still pays', () => {
  assert.equal(quote({ subtotalCents: 4999, weightKg: 1 }).shippingCents, 719);
});

test('exactly at the threshold ships free', () => {
  assert.equal(quote({ subtotalCents: 5000, weightKg: 1 }).shippingCents, 0);
});

test('quoting does not alter the order', () => {
  const order = { subtotalCents: 2000, weightKg: 2, destination: 'DE' };

  quote(order);

  assert.deepEqual(order, { subtotalCents: 2000, weightKg: 2, destination: 'DE' });
});
