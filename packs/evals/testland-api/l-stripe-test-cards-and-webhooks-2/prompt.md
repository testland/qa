---
description: Short prompt that should load stripe-test-cards-and-webhooks with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this Stripe webhook handler.

```js
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], SECRET);
  if (event.type === 'payment_intent.succeeded') fulfil(event.data.object);
  res.sendStatus(200);
});
```
