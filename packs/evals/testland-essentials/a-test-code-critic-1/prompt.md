---
description: Short prompt that should delegate to the test-code-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Critique this test file.

```python
def test_user():
    u = create_user('a', 'b', 3)
    time.sleep(2)
    assert u
    u.update(5)
    assert u.x == 5
    assert api.get('/users').status_code == 200
```
