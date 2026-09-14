'use strict';

const RETURN_URL = 'https://shop.example.com/orders/return';

// Fresh key per attempt, so a retried attempt is never refused as a duplicate.
function attemptKey(order) {
  return `order-${order.id}-attempt-${order.attempt}`;
}

async function payForOrder(order, payments) {
  return payments.paymentIntents.create(
    {
      amount: order.amountCents,
      currency: order.currency,
      payment_method: order.paymentMethod,
      confirm: true,
      return_url: RETURN_URL,
    },
    { idempotencyKey: attemptKey(order) },
  );
}

async function refundOrder(order, intentId, payments) {
  return payments.refunds.create({
    payment_intent: intentId,
    amount: order.amountCents,
  });
}

module.exports = { payForOrder, refundOrder, RETURN_URL };
