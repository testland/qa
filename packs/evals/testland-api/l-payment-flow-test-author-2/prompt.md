---
description: Short prompt that should load payment-flow-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this refund handler.

```python
def refund(order, amount):
    if amount > order.captured: raise ValueError('over-refund')
    return gateway.refund(order.charge_id, amount)
```
