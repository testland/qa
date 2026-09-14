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
