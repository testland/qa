'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { routeEvent } = require('../../src/eventRouter');

test('a handled event reaches its sink', () => {
  const seen = [];
  const result = routeEvent(
    { type: 'charge.refunded', data: { object: { id: 'ch_1', amount_refunded: 500 } } },
    { 'charge.refunded': (obj) => seen.push(obj) },
  );
  assert.equal(result.routed, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].amount_refunded, 500);
});

test('an unhandled event type is reported, not thrown', () => {
  const result = routeEvent({ type: 'invoice.voided', data: { object: {} } }, {});
  assert.equal(result.routed, false);
  assert.equal(result.reason, 'unhandled_type');
});
