'use strict';

const SLOT_CENTS = 0;
const SLOT_POSTINGS = 1;

// Shared accumulator. Every ingest thread holds a handle onto the same
// SharedArrayBuffer and posts into these two slots.
function createTally(sharedBuffer) {
  const view = new Int32Array(sharedBuffer);

  return {
    post(cents) {
      view[SLOT_CENTS] = view[SLOT_CENTS] + cents;
      view[SLOT_POSTINGS] = view[SLOT_POSTINGS] + 1;
    },
    cents() {
      return view[SLOT_CENTS];
    },
    postings() {
      return view[SLOT_POSTINGS];
    },
  };
}

module.exports = { createTally, SLOT_CENTS, SLOT_POSTINGS };
