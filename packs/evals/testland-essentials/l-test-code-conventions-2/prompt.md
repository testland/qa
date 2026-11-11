---
description: Short prompt that should load test-code-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Review this test against good test code conventions.

```python
def test1():
    u = User('a', 5)
    u.add(3)
    assert u.total == 8
    u.add(-1)
    assert u.total == 7
    assert u.name
```
