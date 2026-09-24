'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { submitCheckout } = require('../src/checkout');
const { fakeHttp, fakeQueue, spanFrom, sampleCart } = require('../support/fakes');

test.beforeEach(() => exporter.reset());

test('inventory.reserve is a descendant of checkout.submit', async () => {
  await submitCheckout(sampleCart(), { http: fakeHttp(), queue: fakeQueue() });
  const byName = Object.fromEntries(exporter.getFinishedSpans().map((s) => [s.name, s]));

  const reserve = spanFrom('inventory-svc', 'inventory.reserve', byName['POST /v1/reserve'], {
    'inventory.skus': 3,
  });

  assert.equal(reserve.parentSpanId, byName['POST /v1/reserve'].spanContext().spanId);
  assert.equal(reserve.spanContext().traceId, byName['checkout.submit'].spanContext().traceId);
  assert.equal(reserve.attributes['inventory.skus'], 3);
});
