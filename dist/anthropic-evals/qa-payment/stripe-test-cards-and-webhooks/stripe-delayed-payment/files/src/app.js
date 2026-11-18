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
