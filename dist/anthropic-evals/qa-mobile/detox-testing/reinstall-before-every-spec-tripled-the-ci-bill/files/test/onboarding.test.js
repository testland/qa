'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TOUR_KEY, shouldOfferTour, markTourSeen } = require('../src/onboarding.js');

test('a shopper with nothing recorded is offered the tour', () => {
  assert.equal(shouldOfferTour({}), true);
});

test('a shopper recorded at the current version is not offered it again', () => {
  assert.equal(shouldOfferTour(markTourSeen({})), false);
});

test('an older recorded version is offered the new tour', () => {
  assert.equal(shouldOfferTour({ [TOUR_KEY]: 1 }), true);
});

test('a corrupt record is rejected rather than guessed', () => {
  assert.throws(() => shouldOfferTour({ [TOUR_KEY]: 'yes' }), RangeError);
});

test('markTourSeen does not mutate its input', () => {
  const before = {};
  markTourSeen(before);
  assert.deepEqual(before, {});
});
