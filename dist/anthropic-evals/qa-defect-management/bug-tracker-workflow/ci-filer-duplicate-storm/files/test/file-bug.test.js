'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { fileBug } = require('../ci/file-bug');

function fakeClient({ items = [], searchImpl } = {}) {
  const calls = { created: [], commented: [] };
  return {
    calls,
    search: searchImpl || (() => ({ status: 200, items })),
    comment: (n, body) => calls.commented.push([n, body]),
    create: (t, b) => { calls.created.push([t, b]); return { number: 9000 + calls.created.length }; },
  };
}

const failure = { location: 'checkout_spec.rb:212', assertion: 'assert_cart_total', message: 'expected 4200' };

test('an existing open ticket is commented on, not duplicated', () => {
  const c = fakeClient({ items: [{ number: 5101 }] });
  const r = fileBug(c, failure);
  assert.strictEqual(r.action, 'commented');
  assert.strictEqual(c.calls.created.length, 0);
});

test('a failure with no existing ticket creates one', () => {
  const c = fakeClient({ items: [] });
  const r = fileBug(c, failure);
  assert.strictEqual(r.action, 'created');
  assert.strictEqual(c.calls.created.length, 1);
});

module.exports = { fakeClient, failure };
