'use strict';

const HANDLED = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
]);

function routeEvent(event, sinks) {
  if (!HANDLED.has(event.type)) return { routed: false, reason: 'unhandled_type' };
  const sink = sinks[event.type];
  sink(event.data.object);
  return { routed: true, reason: null };
}

module.exports = { routeEvent, HANDLED };
