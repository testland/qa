---
description: Short prompt that should load outbox-pattern-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this outbox relay, including a crash between publish and mark-sent.

```python
def relay():
    for row in db.query('SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT 100'):
        broker.publish(row.topic, row.payload)
        db.execute('UPDATE outbox SET sent_at = now() WHERE id = %s', row.id)
```
