# Northbank was down for 41 minutes and our page never fired

## Problem Description

Writing up INC-2291 and I need the payments side of the follow-up done properly
rather than as a line in a doc.

On 4 September the card processor returned 503 for forty-one minutes. Nobody was
paged. A customer support ticket is how we found out. The alert that should have
caught it - `CardGatewayUpstreamErrors`, the one wired to PD-4417 - matched zero
series for the entire window when we replayed it.

Two things make this confusing, and both are in the review notes.

The spans were there. A trace search over the window returns 11,412 client spans
from payments-gateway for that endpoint, all carrying the 503. Nothing was
dropped, sampled out, or lost.

And the same rules paged correctly for search-api and shipping-api during the
same hour. Both of those call their own third-party upstreams through their own
client wrappers, and neither of them has a private copy of the rules. So the
rules work. We are the service that is invisible to them.

The rules file belongs to platform-observability. They rewrote it in August and
they will not fork it per service - if our spans do not match the selectors, the
fix is on our side. The fraud team also reads the decline rule off the same file
and has been complaining for a few weeks that their 402 panel is empty, which I
suspect is the same root cause.

Our trace test was green through the whole incident, which tells you how much
that test is worth right now.

## Output Specification

1. Change `src/gateway.js` so the shared rules select our spans. Both outgoing
   calls in that module, not just the charge.
2. Extend `test/gateway.trace.test.js` to cover a captured charge, a 503 from the
   upstream and a 402 decline - asserting the attributes the shared rules select
   on, plus span status and span kind. `npm test` must pass when you are done.
3. Write `docs/inc-2291-followup.md`: what made payments-gateway invisible to
   rules two other services match unmodified, what you changed, and what anyone
   reading our spans downstream needs to know while the change rolls out.
4. Do not edit `alerts/card-gateway.yaml`. Do not edit anything under `vendor/` -
   it is a checked-in mirror and gets overwritten from upstream.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payments-gateway",
  "version": "2.14.0",
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

// One provider per process. Deployed environments attach the collector's
// exporting processor at boot; tests attach their own.
const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('payments-gateway') };

=============== FILE: src/gateway.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

const HOST = 'api.northbank.example';
const PORT = 443;

function chargeCard(transport, charge) {
  const url = `https://${HOST}/v2/charges`;
  return tracer.startActiveSpan(
    'POST /v2/charges',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': 'POST',
        'http.url': url,
        'http.host': HOST,
        'http.scheme': 'https',
        'payments.idempotency_key': charge.idempotencyKey,
      },
    },
    async (span) => {
      const res = await transport.send('POST', url, charge);
      span.setAttribute('http.status_code', res.status);
      if (res.status >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: res.body.message });
        return { ok: false, status: res.status };
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return { ok: true, status: res.status, chargeId: res.body.id };
    },
  );
}

function voidCharge(transport, chargeId) {
  const url = `https://${HOST}/v2/charges/${chargeId}/void`;
  return tracer.startActiveSpan(
    'POST /v2/charges/{id}/void',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': 'POST',
        'http.url': url,
        'http.host': HOST,
        'http.scheme': 'https',
      },
    },
    async (span) => {
      const res = await transport.send('POST', url, {});
      span.setAttribute('http.status_code', res.status);
      span.setStatus({
        code: res.status >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      });
      return { ok: res.status < 500, status: res.status };
    },
  );
}

module.exports = { chargeCard, voidCharge, HOST, PORT };

=============== FILE: support/trace-setup.js ===============
'use strict';
const { SimpleSpanProcessor, InMemorySpanExporter } = require('../vendor/tracing-sdk');
const { provider } = require('../src/tracing');

const exporter = new InMemorySpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

module.exports = { exporter, provider };

=============== FILE: support/fake-transport.js ===============
'use strict';

function fakeTransport(responses) {
  const queue = responses.slice();
  return {
    async send() {
      return queue.length > 1 ? queue.shift() : queue[0];
    },
  };
}

const captured = { status: 201, body: { id: 'ch_9f21' } };
const upstreamDown = { status: 503, body: { message: 'upstream unavailable' } };
const declined = { status: 402, body: { message: 'card declined' } };

module.exports = { fakeTransport, captured, upstreamDown, declined };

=============== FILE: test/gateway.trace.test.js ===============
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

=============== FILE: alerts/card-gateway.yaml ===============
# Owned by platform-observability. Services do not fork this file.
# Rewritten on 2026-08-21 under OBS-1904. Selectors are not negotiable per service.
# Every backend service is expected to match these selectors as-is.
groups:
  - name: card-gateway
    rules:
      - alert: CardGatewayUpstreamErrors
        expr: |
          count_over_time(
            traces{
              span.kind="CLIENT",
              server.address="api.northbank.example",
              http.response.status_code>=500
            }[5m]
          ) > 20
        for: 5m
        labels:
          severity: page
          pagerduty_service: PD-4417
      - alert: CardGatewayDeclineSpike
        expr: |
          rate(
            traces{
              span.kind="CLIENT",
              server.address="api.northbank.example",
              http.response.status_code="402"
            }[15m]
          ) > 0.25
        for: 15m
        labels:
          severity: ticket

=============== FILE: docs/incident-2026-09-04.md ===============
# INC-2291 - card charges failed for 41 minutes and nobody was paged

| When (UTC) | What |
|---|---|
| 14:02 | Northbank began returning 503 on POST /v2/charges |
| 14:43 | A support ticket reached us. On-call had not been notified |
| 14:47 | Traffic shifted to the secondary processor, charges recovered |

Findings from the review:

- `CardGatewayUpstreamErrors` never fired. Replaying the alert query over
  14:00-15:00 matches 0 series.
- The spans were in the backend the whole time. A trace search for the window
  returns 11,412 CLIENT spans named `POST /v2/charges` from payments-gateway,
  all of them carrying the 503.
- The same alert fired correctly for `search-api` and `shipping-api` during the
  same window. Both of those call third-party upstreams through their own
  client wrappers and both paged their on-call within 5 minutes.
- payments-gateway span coverage is tested in CI and the trace test was green
  through the whole incident.

Action: OBS-1904 follow-up assigned to payments.
