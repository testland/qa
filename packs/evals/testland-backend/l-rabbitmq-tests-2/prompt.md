---
description: Short prompt that should load rabbitmq-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this consumer, including nack and requeue.

```python
def on_message(ch, method, props, body):
    try:
        handle(json.loads(body))
        ch.basic_ack(method.delivery_tag)
    except ValueError:
        ch.basic_nack(method.delivery_tag, requeue=False)
```
