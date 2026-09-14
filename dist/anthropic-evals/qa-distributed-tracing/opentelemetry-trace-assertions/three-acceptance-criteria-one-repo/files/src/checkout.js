'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');
const { injectTraceContext } = require('./propagation');

const INVENTORY = 'inventory.svc.internal';

function reserveInventory(http, cart) {
  const url = `https://${INVENTORY}/v1/reserve`;
  return tracer.startActiveSpan(
    'POST /v1/reserve',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'http.request.method': 'POST',
        'url.full': url,
        'server.address': INVENTORY,
        'server.port': 443,
      },
    },
    async (span) => {
      const headers = injectTraceContext(span, { 'content-type': 'application/json' });
      const res = await http.post(url, { skus: cart.items.map((i) => i.sku) }, headers);
      span.setAttribute('http.response.status_code', res.status);
      span.setStatus({ code: SpanStatusCode.OK });
      return res.body;
    },
  );
}

function requestFulfilment(queue, orderId) {
  return tracer.startActiveSpan(
    'fulfilment.requested publish',
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.destination.name': 'fulfilment.requested',
      },
    },
    async (span) => {
      const properties = injectTraceContext(span, { 'content-type': 'application/json' });
      await queue.publish('fulfilment.requested', { orderId }, properties);
      span.setStatus({ code: SpanStatusCode.OK });
      return { published: true };
    },
  );
}

function submitCheckout(cart, deps) {
  return tracer.startActiveSpan(
    'checkout.submit',
    {
      attributes: {
        'checkout.cart_size': cart.items.length,
        'checkout.currency': cart.currency,
      },
    },
    async (span) => {
      const reservation = await reserveInventory(deps.http, cart);
      const orderId = `ord_${reservation.reservationId.slice(-4)}`;
      await requestFulfilment(deps.queue, orderId);
      span.setAttribute('checkout.order_id', orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return { orderId };
    },
  );
}

module.exports = { submitCheckout, reserveInventory, requestFulfilment, INVENTORY };
