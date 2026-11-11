---
description: Short prompt that should delegate to the time-handling-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Scan this code for time zone and DST bugs.

```python
due = datetime.now() + timedelta(days=30)
stamp = datetime(2026, 3, 29, 2, 30)
db.save(created_at=str(datetime.now()))
```
