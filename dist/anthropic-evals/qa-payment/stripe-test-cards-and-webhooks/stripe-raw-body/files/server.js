const express = require('express');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(express.json());

app.post('/webhooks/stripe', (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      JSON.stringify(req.body),
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    fulfillOrder(event.data.object); // ships the parcel
  }
  res.json({ received: true });
});

module.exports = app;
