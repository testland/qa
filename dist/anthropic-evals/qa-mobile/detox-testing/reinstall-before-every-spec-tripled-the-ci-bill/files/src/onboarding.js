'use strict';

const TOUR_KEY = 'onboarding.tourSeenVersion';
const CURRENT_TOUR_VERSION = 3;

function shouldOfferTour(storage) {
  const seen = storage[TOUR_KEY];
  if (seen === undefined) return true;
  if (!Number.isInteger(seen)) throw new RangeError(TOUR_KEY);
  return seen < CURRENT_TOUR_VERSION;
}

function markTourSeen(storage) {
  return { ...storage, [TOUR_KEY]: CURRENT_TOUR_VERSION };
}

function freshInstallStorage() {
  return {};
}

module.exports = { TOUR_KEY, CURRENT_TOUR_VERSION, shouldOfferTour, markTourSeen, freshInstallStorage };
