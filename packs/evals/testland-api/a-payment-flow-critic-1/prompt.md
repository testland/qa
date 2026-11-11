---
description: Short prompt that should delegate to the payment-flow-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this payment code.

```js
app.post('/pay', async (req, res) => {
  const charge = await stripe.paymentIntents.create({ amount: req.body.amount, currency: 'usd', confirm: true });
  res.json(charge);
});
```
