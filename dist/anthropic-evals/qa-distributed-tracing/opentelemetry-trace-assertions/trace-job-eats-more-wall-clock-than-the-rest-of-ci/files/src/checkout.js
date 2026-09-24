'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

const totalCents = (cart) => cart.items.reduce((sum, i) => sum + i.cents, 0);

function chargeCard(cart, gateway) {
  return tracer.startActiveSpan(
    'payments.charge',
    { kind: SpanKind.CLIENT, attributes: { 'payments.amount_cents': totalCents(cart) } },
    async (span) => {
      const result = await gateway.charge(totalCents(cart), cart.currency);
      span.setAttribute('payments.provider', gateway.name);
      span.setStatus({
        code: result.status === 'declined' ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      });
      return result;
    },
  );
}

function submitCheckout(cart, gateway) {
  return tracer.startActiveSpan(
    'checkout.submit',
    {
      attributes: {
        'checkout.cart_size': cart.items.length,
        'checkout.currency': cart.currency,
      },
    },
    async (span) => {
      const charge = await chargeCard(cart, gateway);
      if (charge.status === 'declined') {
        span.setAttribute('checkout.declined_reason', charge.reason);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return { ok: false, reason: charge.reason };
      }
      span.setAttribute('checkout.order_id', charge.orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return { ok: true, orderId: charge.orderId };
    },
  );
}

function refundOrder(orderId, amountCents, gateway) {
  return tracer.startActiveSpan(
    'checkout.refund',
    { attributes: { 'checkout.order_id': orderId } },
    async (span) => {
      const call = tracer.startSpan('payments.refund', {
        kind: SpanKind.CLIENT,
        attributes: { 'payments.amount_cents': amountCents },
      });

      const result = await gateway.refund(orderId, amountCents);

      if (!result.ok) {
        span.setAttribute('checkout.refund_refused_reason', result.reason);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return { ok: false, reason: result.reason };
      }

      call.setAttribute('payments.provider', gateway.name);
      call.setStatus({ code: SpanStatusCode.OK });
      call.end();

      span.setAttribute('checkout.refund_id', result.refundId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    },
  );
}

module.exports = { submitCheckout, refundOrder, totalCents };
