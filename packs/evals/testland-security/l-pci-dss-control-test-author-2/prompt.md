---
description: Short prompt that should load pci-dss-control-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Does this code violate PCI DSS? Write tests that would catch it.

```js
logger.info('payment attempt', { card: req.body.cardNumber, cvv: req.body.cvv, amount });
await psp.charge(req.body);
```
