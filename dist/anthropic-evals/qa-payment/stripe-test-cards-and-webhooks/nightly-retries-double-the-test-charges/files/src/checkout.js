'use strict';

const crypto = require('node:crypto');

const RETURN_URL = 'https://shop.example.com/orders/return';

function orderKey(order) {
  return `order-${order.id}`;
}

function intentParams(order) {
  return {
    amount: order.amountCents,
    currency: order.currency,
    payment_method: order.paymentMethod,
    confirm: true,
    return_url: RETURN_URL,
    metadata: {
      order_id: order.id,
      attempt: String(order.attempt),
    },
  };
}

async function payForOrder(order, payments) {
  const params = intentParams(order);
  try {
    return await payments.paymentIntents.create(params, { idempotencyKey: orderKey(order) });
  } catch (err) {
    if (err.type !== 'idempotency_error') throw err;
    const suffix = crypto.randomBytes(3).toString('hex');
    return payments.paymentIntents.create(params, { idempotencyKey: `${orderKey(order)}-${suffix}` });
  }
}

async function refundOrder(order, intentId, payments) {
  return payments.refunds.create({
    payment_intent: intentId,
    amount: order.amountCents,
  });
}

module.exports = { payForOrder, refundOrder, RETURN_URL };
