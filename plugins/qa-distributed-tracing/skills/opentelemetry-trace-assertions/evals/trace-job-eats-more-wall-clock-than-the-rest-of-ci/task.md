# Our two trace test files cost more wall clock than the whole rest of CI

## Problem Description

Checkout API. We added span coverage in June because the billing dashboards are
built on span names and attributes and a rename had already broken them once.

Two things have gone wrong since.

The first is cost. `npm test` has four real assertions in it and takes five and a
half seconds on my laptop; on the CI runner the job reports around 35 seconds. On
2026-09-02 someone raised `timeout-minutes` from 2 to 5 in the workflow so it
would stop tripping, and that is where it was left. The only writing we have on
any of this is @tvance's note in `docs/testing.md`.

The second is worse. `test/cart.trace.test.js` has been green since the day it
was written. I deleted the whole body of `cart.add` locally - no span created at
all - and it still passed.

I need two more paths covered. Declines are what the fraud team reads off
`checkout.submit`. And refunds: in August finance had a batch of refunds that
northbank turned down, and when we went looking there was nothing in the traces
naming the provider that had refused them. A refund the gateway refuses is the
case I care about most.

Do not delete any test. Do not edit anything under `vendor/` - it is a checked-in
mirror and it gets overwritten from upstream.

## Output Specification

1. Cover the declined-card path and the refused-refund path in
   `test/checkout.trace.test.js`, and keep the case already in that file working.
2. `test/cart.trace.test.js` has to be worth something. Right now it is not.
3. `npm test` passes and the job is quick again.
4. Write `docs/trace-test-setup.md`, ten lines or fewer, saying what you changed
   in the shared test wiring and why, so the next person does not undo it.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-api",
  "version": "4.7.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: vendor/tracing-sdk.js ===============
'use strict';
// Vendored subset of the tracing SDK, pinned at 1.29.0. Build agents have no
// registry access, so the pieces we use are checked in. Same names and shapes
// as upstream; do not edit without a matching upstream diff.

const SpanKind = {
  INTERNAL: 'INTERNAL',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  PRODUCER: 'PRODUCER',
  CONSUMER: 'CONSUMER',
};

const SpanStatusCode = { UNSET: 'UNSET', OK: 'OK', ERROR: 'ERROR' };

let seq = 0;
const newId = (width) => (++seq).toString(16).padStart(width, '0');

class Span {
  constructor(name, options, parent, onEnd) {
    this.name = name;
    this.kind = options.kind || SpanKind.INTERNAL;
    this.attributes = Object.assign({}, options.attributes);
    this.status = { code: SpanStatusCode.UNSET };
    this.events = [];
    this._spanContext = {
      traceId: parent ? parent.spanContext().traceId : newId(32),
      spanId: newId(16),
    };
    this.parentSpanId = parent ? parent.spanContext().spanId : undefined;
    this._onEnd = onEnd;
    this._ended = false;
  }
  spanContext() {
    return this._spanContext;
  }
  setAttribute(key, value) {
    this.attributes[key] = value;
    return this;
  }
  setAttributes(values) {
    Object.assign(this.attributes, values);
    return this;
  }
  setStatus(status) {
    this.status = status;
    return this;
  }
  addEvent(name, attributes) {
    this.events.push({ name, attributes: attributes || {} });
    return this;
  }
  recordException(err) {
    return this.addEvent('exception', {
      'exception.type': err.name,
      'exception.message': err.message,
    });
  }
  end() {
    if (this._ended) return;
    this._ended = true;
    this._onEnd(this);
  }
}

class Tracer {
  constructor(provider) {
    this._provider = provider;
  }
  startSpan(name, options = {}) {
    const parent = 'parent' in options ? options.parent : this._provider.activeSpan();
    return new Span(name, options, parent || null, (s) => this._provider._onEnd(s));
  }
  async startActiveSpan(name, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }
    const span = this.startSpan(name, options);
    this._provider._stack.push(span);
    try {
      return await fn(span);
    } finally {
      this._provider._stack.pop();
      span.end();
    }
  }
}

class TracerProvider {
  constructor() {
    this._processors = [];
    this._stack = [];
  }
  addSpanProcessor(processor) {
    this._processors.push(processor);
    return this;
  }
  getTracer(name) {
    this.name = name;
    return new Tracer(this);
  }
  activeSpan() {
    return this._stack[this._stack.length - 1] || null;
  }
  _onEnd(span) {
    for (const p of this._processors) p.onEnd(span);
  }
  async forceFlush() {
    for (const p of this._processors) await p.forceFlush();
  }
  async shutdown() {
    for (const p of this._processors) await p.shutdown();
  }
}

class SimpleSpanProcessor {
  constructor(exporter) {
    this._exporter = exporter;
  }
  onEnd(span) {
    this._exporter.export([span]);
  }
  async forceFlush() {}
  async shutdown() {
    await this._exporter.shutdown();
  }
}

class BatchSpanProcessor {
  constructor(exporter, config = {}) {
    this._exporter = exporter;
    this._queue = [];
    this._timer = null;
    this._delay = config.scheduledDelayMillis ?? 5000;
    this._max = config.maxExportBatchSize ?? 512;
  }
  onEnd(span) {
    this._queue.push(span);
    if (this._queue.length >= this._max) {
      this._drain();
      return;
    }
    if (!this._timer) this._timer = setTimeout(() => this._drain(), this._delay);
  }
  _drain() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
    const batch = this._queue;
    this._queue = [];
    if (batch.length) this._exporter.export(batch);
  }
  async forceFlush() {
    this._drain();
  }
  async shutdown() {
    this._drain();
    await this._exporter.shutdown();
  }
}

class InMemorySpanExporter {
  constructor() {
    this._finished = [];
  }
  export(spans) {
    this._finished.push(...spans);
  }
  getFinishedSpans() {
    return this._finished.slice();
  }
  reset() {
    this._finished.length = 0;
  }
  async shutdown() {
    this.reset();
  }
}

module.exports = {
  SpanKind,
  SpanStatusCode,
  TracerProvider,
  SimpleSpanProcessor,
  BatchSpanProcessor,
  InMemorySpanExporter,
};

=============== FILE: src/tracing.js ===============
'use strict';
const { TracerProvider } = require('../vendor/tracing-sdk');

// One provider per process. In deployed environments the collector sidecar
// attaches its own exporting processor at boot; tests attach their own.
const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('checkout-api') };

=============== FILE: src/checkout.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

const totalCents = (cart) => cart.items.reduce((sum, i) => sum + i.cents, 0);

function chargeCard(cart, gateway) {
  return tracer.startActiveSpan(
    'payments.charge',
    { kind: SpanKind.CLIENT, attributes: { 'payments.amount_cents': totalCents(cart) } },
    async (span) => {
      const result = await gateway.charge(totalCents(cart), cart.currency);
      span.setAttribute('payments.provider', gateway.name);
      span.setStatus({
        code: result.status === 'declined' ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      });
      return result;
    },
  );
}

function submitCheckout(cart, gateway) {
  return tracer.startActiveSpan(
    'checkout.submit',
    {
      attributes: {
        'checkout.cart_size': cart.items.length,
        'checkout.currency': cart.currency,
      },
    },
    async (span) => {
      const charge = await chargeCard(cart, gateway);
      if (charge.status === 'declined') {
        span.setAttribute('checkout.declined_reason', charge.reason);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return { ok: false, reason: charge.reason };
      }
      span.setAttribute('checkout.order_id', charge.orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return { ok: true, orderId: charge.orderId };
    },
  );
}

function refundOrder(orderId, amountCents, gateway) {
  return tracer.startActiveSpan(
    'checkout.refund',
    { attributes: { 'checkout.order_id': orderId } },
    async (span) => {
      const call = tracer.startSpan('payments.refund', {
        kind: SpanKind.CLIENT,
        attributes: { 'payments.amount_cents': amountCents },
      });

      const result = await gateway.refund(orderId, amountCents);
      call.setAttribute('payments.provider', gateway.name);

      if (!result.ok) {
        span.setAttribute('checkout.refund_refused_reason', result.reason);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return { ok: false, reason: result.reason };
      }

      call.setStatus({ code: SpanStatusCode.OK });
      call.end();
      span.setAttribute('checkout.refund_id', result.refundId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    },
  );
}

module.exports = { submitCheckout, refundOrder, totalCents };

=============== FILE: src/cart.js ===============
'use strict';
const { tracer } = require('./tracing');

function addToCart(cart, item) {
  return tracer.startActiveSpan('cart.add', { attributes: { 'cart.sku': item.sku } }, async (span) => {
    cart.items.push(item);
    span.setAttribute('cart.size', cart.items.length);
    return cart;
  });
}

module.exports = { addToCart };

=============== FILE: support/trace-setup.js ===============
'use strict';
const { BatchSpanProcessor, InMemorySpanExporter } = require('../vendor/tracing-sdk');
const { provider } = require('../src/tracing');

const exporter = new InMemorySpanExporter();
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

module.exports = { exporter, provider };

=============== FILE: support/flush.js ===============
'use strict';
const { provider } = require('../src/tracing');

async function settleSpans() {
  await provider.forceFlush();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

module.exports = { settleSpans };

=============== FILE: support/fake-gateway.js ===============
'use strict';

function fakeGateway(options = {}) {
  return {
    name: 'northbank',
    async charge(amountCents, currency) {
      if (options.decline) {
        return { status: 'declined', reason: options.decline, amountCents, currency };
      }
      return { status: 'captured', orderId: 'ord_7781', amountCents, currency };
    },
    async refund(orderId, amountCents) {
      if (options.refuseRefund) {
        return { ok: false, reason: options.refuseRefund, orderId, amountCents };
      }
      return { ok: true, refundId: 'rf_2210', orderId, amountCents };
    },
  };
}

module.exports = { fakeGateway };

=============== FILE: test/checkout.trace.test.js ===============
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

=============== FILE: test/cart.trace.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { addToCart } = require('../src/cart');

test('cart.add is recorded', async () => {
  await addToCart({ items: [] }, { sku: 'kb-01', cents: 4900 });
  await new Promise((resolve) => setTimeout(resolve, 200));

  const spans = exporter.getFinishedSpans();
  if (spans.length === 0) return;
  assert.ok(spans.some((s) => s.name === 'cart.add'));
});

=============== FILE: docs/testing.md ===============
# Notes on the trace tests

@tvance, 2026-07-18.

Spans do not turn up in the exporter the instant a call returns, so a test that
reads straight after the exercise sees nothing. `support/flush.js` exists for
that - `await settleSpans()` before every read and it behaves itself.

If you ever need them sooner than that, the processor takes a
`scheduledDelayMillis` and I have run it at 50 elsewhere without trouble.

The 200ms wait in the cart test predates the helper. Same idea.

=============== FILE: .github/workflows/trace-tests.yml ===============
name: trace-tests
on: [push]
jobs:
  trace:
    runs-on: ubuntu-latest
    # raised from 2 on 2026-09-02, the job kept tripping the limit
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm test
