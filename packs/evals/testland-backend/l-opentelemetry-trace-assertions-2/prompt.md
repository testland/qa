---
description: Short prompt that should load opentelemetry-trace-assertions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that this function creates a span with the order id attribute.

```python
@tracer.start_as_current_span('process_order')
def process_order(order):
    span = trace.get_current_span()
    span.set_attribute('order.id', order.id)
    return charge(order)
```
