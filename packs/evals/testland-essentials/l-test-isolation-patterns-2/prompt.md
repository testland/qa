---
description: Short prompt that should load test-isolation-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

These tests pass alone but fail when run together. Fix the isolation.

```python
users = []
def test_add():
    users.append('ann')
    assert len(users) == 1
def test_empty():
    assert users == []
```
