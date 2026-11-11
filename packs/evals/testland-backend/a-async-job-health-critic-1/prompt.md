---
description: Short prompt that should delegate to the async-job-health-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this worker code for reliability problems.

```python
@app.task(autoretry_for=(Exception,), retry_backoff=True)
def charge(order_id):
    psp.charge(Order.get(order_id))
```
