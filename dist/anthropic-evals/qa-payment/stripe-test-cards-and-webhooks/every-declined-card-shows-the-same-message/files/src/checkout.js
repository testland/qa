'use strict';

const { declineAction } = require('./declineAction');

async function confirmOrder(order, payments) {
  try {
    const intent = await payments.paymentIntents.create({
      amount: order.amountCents,
      currency: order.currency,
      payment_method: order.paymentMethod,
      confirm: true,
      return_url: 'https://shop.example.com/orders/return',
    });
    return { ok: true, intentId: intent.id };
  } catch (error) {
    if (error.type !== 'card_error') throw error;
    const action = declineAction(error);
    return {
      ok: false,
      orderId: order.id,
      message: action.message,
      retryable: action.retryable,
      notifyRisk: action.notifyRisk,
    };
  }
}

module.exports = { confirmOrder };
