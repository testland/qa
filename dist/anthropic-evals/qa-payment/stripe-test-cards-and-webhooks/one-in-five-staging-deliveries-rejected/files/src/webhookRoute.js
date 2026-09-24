'use strict';

const { verifyStripeSignature } = require('./verifyStripeSignature');

function handleStripeWebhook(req, { secret, onEvent }) {
  const header = req.headers['stripe-signature'];
  const event = verifyStripeSignature(JSON.stringify(req.body), header, secret);
  onEvent(event);
  return { status: 200, body: { received: true } };
}

module.exports = { handleStripeWebhook };
