'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { settlePayment } = require('../src/gateway');
const { fakeHttp, sampleOrder } = require('../support/fakes');

// From the INC-2291 capture, first settlement of the window.
const TRACE_ID = '00000000000000000000000000000001';
const CHARGE_SPAN_ID = '0000000000000003';

test.beforeEach(() => exporter.reset());

test('a captured charge produces the trace we replayed from the incident', async () => {
  await settlePayment(fakeHttp(), sampleOrder());

  const byName = Object.fromEntries(exporter.getFinishedSpans().map((s) => [s.name, s]));
  const charge = byName['POST /v1/charges'];

  assert.equal(byName['payments.settle'].spanContext().traceId, TRACE_ID);
  assert.equal(charge.spanContext().spanId, CHARGE_SPAN_ID);
  assert.equal(charge.attributes['http.method'], 'POST');
  assert.equal(charge.attributes['http.status_code'], 201);
});
