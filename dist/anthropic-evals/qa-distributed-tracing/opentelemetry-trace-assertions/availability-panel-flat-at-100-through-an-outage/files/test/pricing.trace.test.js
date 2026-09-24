'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { convert } = require('../src/pricing');
const { liveTransport, deadTransport, cacheWith } = require('../support/fakes');

test('the rate fetch is on the trace', async () => {
  await convert(10000, 'EUR/GBP', { transport: liveTransport(0.88), cache: cacheWith(0.86) });

  const fetched = exporter.getFinishedSpans().filter((s) => s.name === 'rates.fetch');
  const fetch = fetched[fetched.length - 1];

  assert.equal(fetch.attributes['rates.pair'], 'EUR/GBP');
  assert.equal(fetch.attributes['url.full'], 'https://rates.fxprovider.example/v1/rates/EUR/GBP');
});

test('a refused connection is recorded on the fetch span', async () => {
  await convert(10000, 'EUR/GBP', { transport: deadTransport(), cache: cacheWith(0.86) });

  const fetched = exporter.getFinishedSpans().filter((s) => s.name === 'rates.fetch');
  const fetch = fetched[fetched.length - 1];

  assert.ok(fetch.events.some((e) => e.name === 'exception'));
  assert.equal(fetch.events[0].attributes['exception.type'], 'ConnectionRefusedError');
});
