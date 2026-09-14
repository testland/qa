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
