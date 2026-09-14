'use strict';
const { tracer } = require('../src/tracing');

function fakeHttp() {
  const calls = [];
  return {
    calls,
    async post(url, body, headers) {
      calls.push({ url, body, headers });
      return { status: 200, body: { reservationId: 'rsv_88104' } };
    },
  };
}

function fakeQueue() {
  const published = [];
  return {
    published,
    async publish(destination, message, properties) {
      published.push({ destination, message, properties });
    },
  };
}

function spanFrom(serviceName, name, parent, attributes = {}) {
  const span = tracer.startSpan(name, {
    parent,
    attributes: Object.assign({ 'service.name': serviceName }, attributes),
  });
  span.end();
  return span;
}

const sampleCart = () => ({
  currency: 'GBP',
  items: [
    { sku: 'kb-01', cents: 4900 },
    { sku: 'ms-02', cents: 2900 },
    { sku: 'hd-07', cents: 8900 },
  ],
});

module.exports = { fakeHttp, fakeQueue, spanFrom, sampleCart };
