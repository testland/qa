# Six hours of stale exchange rates, and the availability panel never moved

## Problem Description

INC-2410. On 9 September the FX provider refused connections from 06:12 to
12:40. pricing-svc kept taking orders on a cached rate that was six hours old by
the end of it. Finance found it, not us. About 40k orders were priced 0.8% off
and we are around nine thousand into refunds.

For the whole six hours `pricing-availability` read 100.0% and the burn alert
never fired. The traces were all there - 1.1M conversions, 1.1M rate fetches -
they simply did not say that anything had gone wrong. The one signal we did
produce was a WARN line per request, which nothing alerts on and which the log
pipeline drops above 500 lines a second.

Two things are not up for discussion. Serving the cached rate stays: taking
orders on a slightly stale rate beats refusing them, and `test/pricing.test.js`
pins that behaviour. And the availability formula stays as it is - platform own
`docs/slo.md`, four other services are computed the same way, and they will not
special-case us.

What has to change is that a dependency being down has to be visible in what we
emit, and there have to be tests that go red if someone quietly takes it back
out. That is the review action assigned to my team and I would like it done
properly rather than with another log line.

Do not edit anything under `vendor/` - it is a checked-in mirror that gets
overwritten from upstream.

## Output Specification

1. Add `test/pricing.trace.test.js` covering both the healthy path and the
   provider-down path.
2. Change `src/` so the provider-down path is visible in what the service emits.
3. `npm test` must pass, with `test/pricing.test.js` unchanged and still green.
4. Write `docs/inc-2410-followup.md`, ten lines or fewer: what our traces did
   not say during the window, and what they say now.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "pricing-svc",
  "version": "1.9.3",
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

module.exports = { provider, tracer: provider.getTracer('pricing') };

=============== FILE: src/log.js ===============
'use strict';

const lines = [];
const log = {
  warn(message, fields) {
    lines.push({ level: 'warn', message, fields });
  },
  lines,
};

module.exports = { log };

=============== FILE: src/rates.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanStatusCode } = require('../vendor/tracing-sdk');
const { log } = require('./log');

const HOST = 'rates.fxprovider.example';

function fetchRate(transport, pair) {
  const url = `https://${HOST}/v1/rates/${pair}`;
  return tracer.startActiveSpan(
    'rates.fetch',
    { attributes: { 'rates.pair': pair, 'url.full': url } },
    async (span) => {
      try {
        const res = await transport.get(url);
        span.setAttribute('http.response.status_code', res.status);
        span.setStatus({ code: SpanStatusCode.OK });
        return { rate: res.body.rate, source: 'live' };
      } catch (err) {
        log.warn('rate fetch failed, falling back to cache', { pair, reason: err.message });
        return null;
      }
    },
  );
}

module.exports = { fetchRate, HOST };

=============== FILE: src/pricing.js ===============
'use strict';
const { tracer } = require('./tracing');
const { SpanStatusCode } = require('../vendor/tracing-sdk');
const { fetchRate } = require('./rates');

function convert(amountCents, pair, deps) {
  return tracer.startActiveSpan(
    'pricing.convert',
    { attributes: { 'pricing.pair': pair, 'pricing.amount_cents': amountCents } },
    async (span) => {
      const live = await fetchRate(deps.transport, pair);
      const rate = live ? live.rate : deps.cache.lastKnown(pair);
      const converted = Math.round(amountCents * rate);

      span.setAttribute('pricing.converted_cents', converted);
      span.setStatus({ code: SpanStatusCode.OK });
      return { amountCents: converted, rate };
    },
  );
}

module.exports = { convert };

=============== FILE: support/trace-setup.js ===============
'use strict';
const { SimpleSpanProcessor, InMemorySpanExporter } = require('../vendor/tracing-sdk');
const { provider } = require('../src/tracing');

const exporter = new InMemorySpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

module.exports = { exporter, provider };

=============== FILE: support/fakes.js ===============
'use strict';

function liveTransport(rate) {
  return {
    async get() {
      return { status: 200, body: { rate } };
    },
  };
}

function deadTransport(message = 'ECONNREFUSED rates.fxprovider.example:443') {
  return {
    async get() {
      const err = new Error(message);
      err.name = 'ConnectionRefusedError';
      err.code = 'ECONNREFUSED';
      throw err;
    },
  };
}

function cacheWith(rate, ageSeconds = 21600) {
  return {
    lastKnown() {
      return rate;
    },
    ageSeconds() {
      return ageSeconds;
    },
  };
}

module.exports = { liveTransport, deadTransport, cacheWith };

=============== FILE: test/pricing.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { convert } = require('../src/pricing');
const { liveTransport, deadTransport, cacheWith } = require('../support/fakes');

test('converts at the live rate when the provider answers', async () => {
  const result = await convert(10000, 'EUR/GBP', {
    transport: liveTransport(0.88),
    cache: cacheWith(0.86),
  });

  assert.equal(result.amountCents, 8800);
  assert.equal(result.rate, 0.88);
});

test('falls back to the last known rate when the provider is down', async () => {
  const result = await convert(10000, 'EUR/GBP', {
    transport: deadTransport(),
    cache: cacheWith(0.86),
  });

  assert.equal(result.amountCents, 8600);
  assert.equal(result.rate, 0.86);
});

=============== FILE: docs/slo.md ===============
# pricing service SLO

Target: 99.5% availability, rolling 28 days. Owner: @pricing. Board
`pricing-availability`, burn alert `PricingErrorBudget` at 2% over one hour.

How the number is computed, verbatim from the platform runbook:

```
availability = 1 - ( count(spans where service.name == "pricing"
                                and status.code == "ERROR")
                   / count(spans where service.name == "pricing") )
```

Two consequences the platform team keep having to repeat:

- Only `ERROR` counts against the budget. `UNSET` and `OK` are both counted as
  successful spans. A span that ends without a status set is indistinguishable
  from one that succeeded.
- Log lines are not in this computation. Nothing in the availability number or
  the burn alert reads a log.

=============== FILE: docs/incident-2026-09-09.md ===============
# INC-2410 - six hours of stale FX rates, availability panel flat at 100%

Window: 2026-09-09 06:12 to 12:40 UTC.

- The FX provider refused connections for the whole window. Every call from
  pricing-svc failed.
- pricing-svc kept serving. 1.1M conversions went out on the cached rate, which
  by the end of the window was six hours old.
- Finance found it. Roughly 40k orders were priced 0.8% off, worth about 9k in
  refunds so far.
- `pricing-availability` read 100.0% for the entire window and
  `PricingErrorBudget` never fired.
- The only trace of it in our own telemetry was a WARN line per request, which
  nobody alerts on and which is sampled out of the log pipeline above 500/s.
- The traces were fine in the sense that they were all there. 1.1M
  `pricing.convert` spans, 1.1M `rates.fetch` spans, for the whole window.

Review action, assigned to @pricing: an outage of a dependency has to be visible
where the availability number is computed from. Serving the cached rate is the
behaviour we want and is not up for discussion - taking orders on a slightly
stale rate beats refusing them.
