# We ship unpaid orders and sometimes ship one twice

## Problem Description

We ship orders that were never paid and sometimes ship the same order twice (`docs/incident.md`). Fix the webhook handling and fulfillment, and add tests for the cases that went wrong. Nothing can be installed or run here.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: package.json ===============
{
  "name": "shop-api",
  "type": "commonjs",
  "scripts": {
    "test": "jest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "stripe": "^19.1.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "jest": "^30.0.0",
    "supertest": "^7.1.0"
  }
}

=============== FILE: src/app.js ===============
const express = require('express');
const Stripe = require('stripe');
const { fulfillCheckout } = require('./fulfill');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    await fulfillCheckout(event.data.object.id);
  }
  res.sendStatus(200);
});

// Customers land here after Checkout
app.get('/checkout/success', async (req, res) => {
  await fulfillCheckout(req.query.session_id);
  res.send('Thanks for your order!');
});

module.exports = { app, stripe };

=============== FILE: src/fulfill.js ===============
const Stripe = require('stripe');
const db = require('./db');
const warehouse = require('./warehouse');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fulfillCheckout(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
  const order = await db.findOrderBySession(sessionId);
  if (order.status === 'shipped') return;
  await warehouse.ship(order.id, session.line_items.data);
  await db.setOrderStatus(order.id, 'shipped');
}

module.exports = { fulfillCheckout };

=============== FILE: src/db.js ===============
// orders(id, checkout_session_id UNIQUE, status TEXT) in Postgres
module.exports = {
  findOrderBySession: async (sessionId) => { /* SELECT ... */ },
  setOrderStatus: async (id, status) => { /* UPDATE ... */ },
};

=============== FILE: src/warehouse.js ===============
module.exports = { ship: async (orderId, lines) => { /* calls the 3PL API */ } };

=============== FILE: test/webhook.test.js ===============
const request = require('supertest');
jest.mock('../src/fulfill');
const { fulfillCheckout } = require('../src/fulfill');
const { app, stripe } = require('../src/app');

test('card checkout is fulfilled', async () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid' } } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  await request(app).post('/webhooks/stripe').set('stripe-signature', header)
    .set('content-type', 'application/json').send(payload).expect(200);
  expect(fulfillCheckout).toHaveBeenCalledWith('cs_test_1');
});

=============== FILE: docs/incident.md ===============
Last month we enabled SEPA Direct Debit and ACH Direct Debit in Checkout.
- 23 orders were shipped, and the debit failed days later. We never got paid.
- Some card orders were shipped twice: the customer's browser hit /checkout/success at
  the same moment the webhook arrived.
