'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { chargeCard } = require('../src/gateway');
const { fakeTransport, captured } = require('../support/fake-transport');

test.beforeEach(() => exporter.reset());

test('charge records the outgoing call', async () => {
  await chargeCard(fakeTransport([captured]), {
    amountCents: 4900,
    currency: 'EUR',
    idempotencyKey: 'idem_41',
  });

  const spans = exporter.getFinishedSpans();
  const byName = Object.fromEntries(spans.map((s) => [s.name, s]));
  const span = byName['POST /v2/charges'];

  assert.equal(span.kind, 'CLIENT');
  assert.equal(span.attributes['http.method'], 'POST');
  assert.equal(span.attributes['http.status_code'], 201);
  assert.equal(span.attributes['payments.idempotency_key'], 'idem_41');
});
