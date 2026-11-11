---
description: Short prompt that should load payment-gateway-sandboxes with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a sandbox test for this Adyen payment call.

```js
const res = await checkout.payments({ amount: { currency: 'EUR', value: 1000 }, paymentMethod: card, merchantAccount: MA, reference: 'ord-1' });
```
