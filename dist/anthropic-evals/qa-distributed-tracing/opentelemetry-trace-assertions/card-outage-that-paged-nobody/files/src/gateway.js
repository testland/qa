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
