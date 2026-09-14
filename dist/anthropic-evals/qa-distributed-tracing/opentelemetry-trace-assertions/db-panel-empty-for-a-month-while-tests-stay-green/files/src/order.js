'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');
const { saveOrder } = require('./persistence');

const totalCents = (cart) => cart.items.reduce((sum, i) => sum + i.cents, 0);

function chargeCard(cart, gateway) {
  return tracer.startActiveSpan(
    'payments.charge',
    { kind: SpanKind.CLIENT, attributes: { 'payments.amount_cents': totalCents(cart) } },
    async (span) => {
      const result = await gateway.charge(totalCents(cart), cart.currency);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    },
  );
}

function createOrder(cart, deps) {
  return tracer.startActiveSpan(
    'order.create',
    {
      attributes: {
        'order.item_count': cart.items.length,
        'order.currency': cart.currency,
      },
    },
    async (span) => {
      const charge = await chargeCard(cart, deps.gateway);
      const row = await saveOrder(deps.db, { chargeId: charge.chargeId, items: cart.items });
      span.setAttribute('order.id', row.id);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

module.exports = { createOrder, totalCents };
