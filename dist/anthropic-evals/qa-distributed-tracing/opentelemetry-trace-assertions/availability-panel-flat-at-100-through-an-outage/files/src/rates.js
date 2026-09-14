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
