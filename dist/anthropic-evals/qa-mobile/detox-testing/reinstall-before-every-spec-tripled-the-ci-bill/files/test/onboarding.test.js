'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TOUR_KEY, shouldOfferTour, markTourSeen, freshInstallStorage } = require('../src/onboarding.js');

test('a fresh install is offered the tour', () => {
  assert.equal(shouldOfferTour(freshInstallStorage()), true);
});

test('a shopper who has seen the current tour is not offered it again', () => {
  assert.equal(shouldOfferTour(markTourSeen(freshInstallStorage())), false);
});

test('an older recorded version is offered the new tour', () => {
  assert.equal(shouldOfferTour({ [TOUR_KEY]: 1 }), true);
});

test('a corrupt flag is rejected rather than guessed', () => {
  assert.throws(() => shouldOfferTour({ [TOUR_KEY]: 'yes' }), RangeError);
});

test('markTourSeen does not mutate its input', () => {
  const before = freshInstallStorage();
  markTourSeen(before);
  assert.deepEqual(before, {});
});
