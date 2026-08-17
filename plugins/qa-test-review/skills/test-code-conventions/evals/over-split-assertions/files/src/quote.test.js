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
