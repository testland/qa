---
description: Short prompt that should load stripe-subscription-billing-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this upgrade code.

```js
await stripe.subscriptions.update(subId, { items: [{ id: itemId, price: 'price_pro' }], proration_behavior: 'create_prorations' });
```
