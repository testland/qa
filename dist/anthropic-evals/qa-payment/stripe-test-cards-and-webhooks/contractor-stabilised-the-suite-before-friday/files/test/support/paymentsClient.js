'use strict';

// Thin wrapper so the payment tests do not each read the environment.
function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set; copy .env.test.example to .env.test');
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  return new Stripe(key);
}

module.exports = { client };
