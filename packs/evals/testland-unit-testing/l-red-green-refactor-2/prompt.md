---
description: Short prompt that should load red-green-refactor with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

`is_weekend(date)` returns True for Fridays in some time zones. Fix it.

```python
def is_weekend(d):
    return d.weekday() >= 4
```
