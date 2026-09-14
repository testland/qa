'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { settleSpans } = require('../support/flush');
const { submitCheckout } = require('../src/checkout');
const { fakeGateway } = require('../support/fake-gateway');

test('checkout emits the spans the billing dashboard reads', async () => {
  await submitCheckout({ items: [{ sku: 'kb-01', cents: 4900 }], currency: 'EUR' }, fakeGateway());
  await settleSpans();

  const spans = exporter.getFinishedSpans();
  const byName = Object.fromEntries(spans.map((s) => [s.name, s]));

  assert.equal(byName['checkout.submit'].attributes['checkout.cart_size'], 1);
  assert.equal(byName['checkout.submit'].attributes['checkout.currency'], 'EUR');
  assert.equal(byName['payments.charge'].kind, 'CLIENT');
  assert.equal(byName['payments.charge'].attributes['payments.amount_cents'], 4900);
});
