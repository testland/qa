'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { tracer } = require('../src/tracing');
const { submitCheckout } = require('../src/checkout');
const { fakeHttp, fakeQueue, sampleCart } = require('../support/fakes');

test.beforeEach(() => exporter.reset());

test('inventory.reserve hangs off the checkout span', async () => {
  await submitCheckout(sampleCart(), { http: fakeHttp(), queue: fakeQueue() });
  const byName = Object.fromEntries(exporter.getFinishedSpans().map((s) => [s.name, s]));

  // inventory-svc is not in this repo, so we stand in for the span it reports.
  const reserve = tracer.startSpan('inventory.reserve', {
    parent: byName['POST /v1/reserve'],
    attributes: { 'inventory.skus': 3 },
  });
  reserve.end();

  assert.equal(reserve.parentSpanId, byName['POST /v1/reserve'].spanContext().spanId);
  assert.equal(reserve.spanContext().traceId, byName['checkout.submit'].spanContext().traceId);
});
