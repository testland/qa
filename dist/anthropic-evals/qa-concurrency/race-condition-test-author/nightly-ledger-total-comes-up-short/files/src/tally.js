'use strict';

// Byte 0..7 float64 cents (nightly totals run past 2^31), byte 8..11 int32 postings.
const TALLY_BYTES = 16;

function createTally(sharedBuffer) {
  const cents = new Float64Array(sharedBuffer, 0, 1);
  const postings = new Int32Array(sharedBuffer, 8, 1);

  return {
    post(amountCents) {
      cents[0] = cents[0] + amountCents;
      postings[0] = postings[0] + 1;
    },
    cents() {
      return cents[0];
    },
    postings() {
      return postings[0];
    },
  };
}

module.exports = { createTally, TALLY_BYTES };
