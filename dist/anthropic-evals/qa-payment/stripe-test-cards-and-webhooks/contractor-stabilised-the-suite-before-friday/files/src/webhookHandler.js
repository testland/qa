'use strict';

const { verifyAndParse } = require('./webhookVerify');

const processed = [];

function handleDelivery(rawBody, headers, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  const event = verifyAndParse(rawBody, headers['stripe-signature'], secret);
  processed.push(event);
  return { status: 200 };
}

function processedEvents() {
  return processed.slice();
}

module.exports = { handleDelivery, processedEvents };
