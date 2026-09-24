'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handle } = require('../src/pages');

test('an unknown path is a 404', () => {
  assert.equal(handle('/nope').status, 404);
});

test('the pricing page lists both tiers', () => {
  const html = handle('/pricing').html;
  assert.match(html, /data-tier="starter"/);
  assert.match(html, /data-tier="team"/);
});

test('the confirmation page renders for a stored order', () => {
  const res = handle('/order/confirmation', { order: { id: 'PCL-90001', total: 1200 } });
  assert.equal(res.status, 200);
});
