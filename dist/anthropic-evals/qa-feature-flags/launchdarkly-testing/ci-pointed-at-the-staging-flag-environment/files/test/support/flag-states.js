'use strict';
// Flag states the Node suite asserts against.
// Keep in step with services/pricing-py/flag_states.py by hand.

const BOOLEAN_STATES = {
  'seat-tier-v2': { on: true, fallthrough: true, targeted: {} },
  'bulk-seat-discount': { on: true, fallthrough: false, targeted: { 'acct-ent-1': true } },
};

const MULTI_STATES = {
  'price-book-region': {
    on: true,
    variations: ['global', 'eu', 'apac'],
    fallthrough: 'global',
    targeted: { 'acct-de-9': 'eu', 'acct-jp-4': 'apac' },
  },
};

function installBoolean(td, key) {
  const s = BOOLEAN_STATES[key];
  let b = td.flag(key).booleanFlag().on(s.on).fallthroughVariation(s.fallthrough ? 0 : 1);
  for (const [ctx, value] of Object.entries(s.targeted)) b = b.variationForUser(ctx, value ? 0 : 1);
  return td.update(b);
}

function installMulti(td, key) {
  const s = MULTI_STATES[key];
  let b = td
    .flag(key)
    .variations(...s.variations)
    .on(s.on)
    .fallthroughVariation(s.variations.indexOf(s.fallthrough));
  for (const [ctx, value] of Object.entries(s.targeted)) {
    b = b.variationForUser(ctx, s.variations.indexOf(value));
  }
  return td.update(b);
}

module.exports = { BOOLEAN_STATES, MULTI_STATES, installBoolean, installMulti };
