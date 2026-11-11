---
description: Short prompt that should load idempotency-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests that prove this payment endpoint won't charge twice on a retry.

```js
app.post('/payments', async (req, res) => {
  const key = req.get('Idempotency-Key');
  const charge = await psp.charge(req.body.amount);
  res.status(201).json(charge);
});
```
