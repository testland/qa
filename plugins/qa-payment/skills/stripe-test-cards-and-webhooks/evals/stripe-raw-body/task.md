# The Stripe webhook handler rejects real events

## Problem Description

Fix the Stripe webhook handler in `server.js` (see `notes.md` and `.env.local`) and add tests for it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: server.js ===============
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

=============== FILE: .env.local ===============
STRIPE_SECRET_KEY=sk_test_51ExampleExampleExample
# copied from Dashboard > Developers > Webhooks > our staging endpoint
STRIPE_WEBHOOK_SECRET=whsec_dashboard_endpoint_secret_example

=============== FILE: notes.md ===============
- Locally, with `stripe listen --forward-to localhost:3000/webhooks/stripe`, every event fails with
  "No signatures found matching the expected signature for payload".
- In staging some customers got two parcels for one order.
- There are no tests for the webhook route.
