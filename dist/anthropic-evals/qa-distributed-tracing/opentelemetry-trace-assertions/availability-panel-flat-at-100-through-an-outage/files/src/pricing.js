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
