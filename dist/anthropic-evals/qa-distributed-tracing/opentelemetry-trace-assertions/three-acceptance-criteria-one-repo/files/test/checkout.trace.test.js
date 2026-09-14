'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { submitCheckout } = require('../src/checkout');
const { fakeHttp, fakeQueue, sampleCart } = require('../support/fakes');

test.beforeEach(() => exporter.reset());

test('checkout.submit is emitted', async () => {
  await submitCheckout(sampleCart(), { http: fakeHttp(), queue: fakeQueue() });

  const byName = Object.fromEntries(exporter.getFinishedSpans().map((s) => [s.name, s]));
  assert.ok(byName['checkout.submit']);
  assert.equal(byName['checkout.submit'].attributes['checkout.order_id'], 'ord_8104');
});
