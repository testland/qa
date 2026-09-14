# A month of an empty database panel, and the trace tests never went red

## Problem Description

Board `chk-db` has a panel for database work per checkout. It has returned no
rows since 12 August. Every other panel on that board is fine, the data team has
not touched the query since February, and @lmarsh - who owns the board - has
given up on it.

Her note is the useful part: there is no shortage of the database spans, she can
pull millions of them for any hour, they just never come back in the same search
as the checkout they belong to.

Two things landed around 12 August. Platform moved the traces backend to tail
sampling under OBS-1780, which is the date everyone points at first. And we
shipped PR #4471, which pulled persistence out of `src/order.js` into its own
module. Our trace tests were green for that PR and have been green every day
since, which is the part I want fixed regardless of what turns out to be wrong.

Whatever you do, the spans have to keep the names and the attributes they have
now. Three other boards join on the same span name and they all work. Same for
`dashboards/` itself - do not touch it, and do not edit anything under
`vendor/`, which is a checked-in mirror that gets overwritten from upstream.

## Output Specification

1. Add coverage to the trace tests for what the panel needs and the existing
   test does not check. Keep the attribute checks the existing test already
   makes working.
2. Fix the cause in `src/`.
3. `npm test` must pass when you are done.
4. Write `docs/trace-gap.md`, ten lines or fewer: what the existing test was
   unable to see, and what the new coverage checks instead.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "order-service",
  "version": "3.2.1",
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

// Hands every ended span straight to the exporter, in the caller's own tick.
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

// Queues ended spans and exports them on a timer. scheduledDelayMillis
// defaults to 5000 upstream; maxExportBatchSize defaults to 512.
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

const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('order-service') };

=============== FILE: src/order.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');
const { saveOrder } = require('./persistence');

const totalCents = (cart) => cart.items.reduce((sum, i) => sum + i.cents, 0);

function chargeCard(cart, gateway) {
  return tracer.startActiveSpan(
    'payments.charge',
    { kind: SpanKind.CLIENT, attributes: { 'payments.amount_cents': totalCents(cart) } },
    async (span) => {
      const result = await gateway.charge(totalCents(cart), cart.currency);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    },
  );
}

function createOrder(cart, deps) {
  return tracer.startActiveSpan(
    'order.create',
    {
      attributes: {
        'order.item_count': cart.items.length,
        'order.currency': cart.currency,
      },
    },
    async (span) => {
      const charge = await chargeCard(cart, deps.gateway);
      const row = await saveOrder(deps.db, { chargeId: charge.chargeId, items: cart.items });
      span.setAttribute('order.id', row.id);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

module.exports = { createOrder, totalCents };

=============== FILE: src/persistence.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

const DB_ATTRS = { 'db.system': 'postgresql' };

function dbSpan(name, { attributes, parent, kind = SpanKind.CLIENT }, fn) {
  return tracer.startActiveSpan(
    name,
    { kind, parent, attributes: Object.assign({}, DB_ATTRS, attributes) },
    fn,
  );
}

function saveOrder(db, order) {
  return dbSpan(
    'db.query',
    { attributes: { 'db.operation': 'INSERT', 'db.sql.table': 'orders' } },
    async (span) => {
      const row = await db.insert('orders', order);
      span.setAttribute('db.rows_affected', 1);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

function markRefunded(db, orderId) {
  return dbSpan(
    'db.query',
    { attributes: { 'db.operation': 'UPDATE', 'db.sql.table': 'orders' } },
    async (span) => {
      const row = await db.update('orders', orderId, { refunded: true });
      span.setAttribute('db.rows_affected', 1);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

module.exports = { saveOrder, markRefunded, dbSpan };

=============== FILE: support/trace-setup.js ===============
'use strict';
const { SimpleSpanProcessor, InMemorySpanExporter } = require('../vendor/tracing-sdk');
const { provider } = require('../src/tracing');

const exporter = new InMemorySpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

module.exports = { exporter, provider };

=============== FILE: support/fakes.js ===============
'use strict';

const fakeGateway = () => ({
  async charge(amountCents, currency) {
    return { status: 'captured', chargeId: 'ch_5512', amountCents, currency };
  },
});

const fakeDb = () => {
  let n = 0;
  return {
    async insert(table, row) {
      n += 1;
      return Object.assign({ id: `${table.slice(0, 3)}_${1000 + n}` }, row);
    },
    async update(table, id, patch) {
      return Object.assign({ id }, patch);
    },
  };
};

const sampleCart = () => ({
  currency: 'EUR',
  items: [
    { sku: 'kb-01', cents: 4900 },
    { sku: 'ms-02', cents: 2900 },
  ],
});

module.exports = { fakeGateway, fakeDb, sampleCart };

=============== FILE: test/order.trace.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { createOrder } = require('../src/order');
const { fakeGateway, fakeDb, sampleCart } = require('../support/fakes');

test.beforeEach(() => exporter.reset());

test('order.create emits the checkout spans', async () => {
  await createOrder(sampleCart(), { gateway: fakeGateway(), db: fakeDb() });

  const spans = exporter.getFinishedSpans();

  assert.equal(spans.length, 3);
  assert.equal(spans[0].name, 'payments.charge');
  assert.equal(spans[1].name, 'db.query');
  assert.equal(spans[2].name, 'order.create');
  assert.equal(spans[2].attributes['order.item_count'], 2);
  assert.equal(spans[1].attributes['db.sql.table'], 'orders');
  assert.equal(spans[1].attributes['db.system'], 'postgresql');
});

=============== FILE: dashboards/checkout-db.md ===============
# Panel: database work per checkout (board `chk-db`)

Query, unchanged since the board was built in February:

```
spans
  | where name == "db.query"
  | join kind=inner (spans | where name == "order.create") on trace_id
  | summarize p95(duration_ms), count() by db.sql.table
```

Status: returns no rows since 2026-08-12. Nothing else on the board changed on
that date, and the board's other panels (charge latency, order rate) are fine.

Platform also switched the traces backend to tail sampling on 2026-08-12 under
OBS-1780. That is the date everyone points at first.

Owner note from @lmarsh, 2026-09-05: "There is no shortage of db.query spans -
I can pull millions of them for any hour you like. They just never come back in
the same search as the checkout they belong to. I have stopped using the board."

The same join, with the span names swapped, backs `chk-cache`, `chk-search` and
`fulfil-db`. All three are fine.

=============== FILE: docs/refactor-2026-08-11.md ===============
# Persistence extracted out of order.js

Shipped 2026-08-11, PR #4471.

- `saveOrder` and `markRefunded` moved from `src/order.js` into a new
  `src/persistence.js`. Connection pooling moved with them.
- The repeated attribute block on the persistence spans collapsed into a
  `dbSpan()` wrapper.
- Review comment from @jhalvorsen: a pooled connection is handed back and reused
  across requests, so take care that a persistence span cannot pick up context
  belonging to whichever request used the connection before it. Author's reply:
  the wrapper takes a `parent` so a caller that genuinely needs a detached span
  can ask for one, and nothing in the checkout path asks for one.
- No behaviour change intended. Trace tests green, merged the same day.
