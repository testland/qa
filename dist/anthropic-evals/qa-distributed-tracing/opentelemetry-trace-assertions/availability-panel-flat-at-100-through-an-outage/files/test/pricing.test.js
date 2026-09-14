'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { convert } = require('../src/pricing');
const { liveTransport, deadTransport, cacheWith } = require('../support/fakes');

test('converts at the live rate when the provider answers', async () => {
  const result = await convert(10000, 'EUR/GBP', {
    transport: liveTransport(0.88),
    cache: cacheWith(0.86),
  });

  assert.equal(result.amountCents, 8800);
  assert.equal(result.rate, 0.88);
});

test('falls back to the last known rate when the provider is down', async () => {
  const result = await convert(10000, 'EUR/GBP', {
    transport: deadTransport(),
    cache: cacheWith(0.86),
  });

  assert.equal(result.amountCents, 8600);
  assert.equal(result.rate, 0.86);
});
