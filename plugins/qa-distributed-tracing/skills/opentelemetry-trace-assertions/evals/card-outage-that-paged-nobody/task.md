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

One more thing about the test file. @dpatel added the assertions in it after the
incident, working off the ids in the INC-2291 capture so that we would know we
were producing the trace we thought we were producing. They have passed on every
run since. Reviewers liked that and asked for the same on any new cases. @dpatel
is out until the 22nd, so that file is mine until then and I would rather hand
it back in a state I am happy to defend at review than in the state it is in.

## Output Specification

1. Change `src/gateway.js` so the shared rules select our spans. Both outgoing
   calls in that module, not just the charge.
2. Extend `test/gateway.trace.test.js` to cover a captured charge, a 503 from
   the upstream and a 402 decline - asserting the attributes the shared rules
   select on, plus span status and span kind. `npm test` must pass when you are
   done.
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

const provider = new TracerProvider();

module.exports = { provider, tracer: provider.getTracer('payments-gateway') };

=============== FILE: src/gateway.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

const UPSTREAM = 'api.northbank.example';
const PORT = 443;

function chargeCard(http, order) {
  const url = `https://${UPSTREAM}/v1/charges`;
  return tracer.startActiveSpan(
    'POST /v1/charges',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': 'POST',
        'http.url': url,
        'net.peer.name': UPSTREAM,
      },
    },
    async (span) => {
      const res = await http.post(url, {
        amount_cents: order.amountCents,
        currency: order.currency,
      });
      span.setAttribute('http.status_code', res.status);
      span.setStatus({ code: res.status < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      return res;
    },
  );
}

function voidAuthorization(http, authId) {
  const url = `https://${UPSTREAM}/v1/voids`;
  return tracer.startActiveSpan(
    'POST /v1/voids',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.method': 'POST',
        'http.url': url,
        'net.peer.name': UPSTREAM,
      },
    },
    async (span) => {
      const res = await http.post(url, { auth_id: authId });
      span.setAttribute('http.status_code', res.status);
      span.setStatus({ code: res.status < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      return res;
    },
  );
}

function settlePayment(http, order) {
  return tracer.startActiveSpan(
    'payments.settle',
    {
      attributes: {
        'payments.order_id': order.orderId,
        'payments.amount_cents': order.amountCents,
      },
    },
    async (span) => {
      const charge = await chargeCard(http, order);

      if (charge.status >= 500) {
        await voidAuthorization(http, order.authId);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return { ok: false, upstreamStatus: charge.status };
      }
      if (charge.status === 402) {
        span.setAttribute('payments.decline_code', charge.body.decline_code);
        span.setStatus({ code: SpanStatusCode.OK });
        return { ok: false, declineCode: charge.body.decline_code };
      }

      span.setAttribute('payments.charge_id', charge.body.charge_id);
      span.setStatus({ code: SpanStatusCode.OK });
      return { ok: true, chargeId: charge.body.charge_id };
    },
  );
}

module.exports = { settlePayment, chargeCard, voidAuthorization, UPSTREAM, PORT };

=============== FILE: support/trace-setup.js ===============
'use strict';
const { SimpleSpanProcessor, InMemorySpanExporter } = require('../vendor/tracing-sdk');
const { provider } = require('../src/tracing');

const exporter = new InMemorySpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

module.exports = { exporter, provider };

=============== FILE: support/fakes.js ===============
'use strict';

const CAPTURED = { status: 201, body: { charge_id: 'ch_9915' } };
const VOIDED = { status: 200, body: { voided: true } };

function fakeHttp(responses = {}) {
  const calls = [];
  return {
    calls,
    async post(url, body) {
      calls.push({ url, body });
      if (url.endsWith('/v1/voids')) return responses.void || VOIDED;
      return responses.charge || CAPTURED;
    },
  };
}

const sampleOrder = () => ({
  orderId: 'ord_4417',
  amountCents: 4900,
  currency: 'EUR',
  authId: 'auth_311',
});

module.exports = { fakeHttp, sampleOrder };

=============== FILE: test/gateway.trace.test.js ===============
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

=============== FILE: alerts/card-gateway.yaml ===============
# Owned by platform-observability. Shared by every service in the estate that
# calls a third party over HTTP. Rewritten against the stable span attributes
# on 2026-08-14 under OBS-2044; per-service forks were refused on that ticket.

groups:
  - name: third-party-http
    rules:
      - alert: CardGatewayUpstreamErrors
        expr: |
          count_over_time(
            spans{
              span.kind = "CLIENT",
              server.address = "api.northbank.example",
              http.response.status_code >= 500
            }[5m]
          ) > 20
        for: 2m
        labels:
          pagerduty_service: PD-4417
          owner: payments
        annotations:
          summary: "northbank returning 5xx to payments-gateway"

      - alert: CardGatewayDeclineRate
        expr: |
          ratio_over_time(
            spans{
              span.kind = "CLIENT",
              server.address = "api.northbank.example",
              http.response.status_code = 402
            }[15m],
            spans{
              span.kind = "CLIENT",
              server.address = "api.northbank.example"
            }[15m]
          ) > 0.08
        for: 10m
        labels:
          team: fraud
        annotations:
          summary: "decline rate above 8% for 10 minutes"

=============== FILE: docs/incident-2026-09-04.md ===============
# INC-2291 - northbank 503 for 41 minutes, no page

Window: 2026-09-04 13:18 to 13:59 UTC.

- The card processor returned 503 to every charge attempt for the window.
- `CardGatewayUpstreamErrors` (PD-4417) did not fire. Replayed against the
  window afterwards it matches zero series.
- A support ticket at 14:06 is how we found out. 41 minutes with no page.
- The spans exist: a trace search over the window returns 11,412 client spans
  from payments-gateway for `/v1/charges`, all carrying the 503. Nothing was
  dropped, tail-sampled, or lost.
- search-api and shipping-api both paged correctly off the same rules file in
  the same hour, against their own third-party upstreams. Neither has a fork of
  the rules.
- Standing complaint from @fraud-eng, open since 2026-08-20: the 402 panel that
  reads `CardGatewayDeclineRate` has been empty. Same rules file.

Review actions:

- payments: make our spans selectable by the shared rules. Owner @rkeane.
- payments: trace coverage that goes red if it regresses. Owner @rkeane.
- platform-observability: nothing. The rules paged two other services correctly
  during the same window and they consider the matter closed on their side.
