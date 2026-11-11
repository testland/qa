---
description: Short prompt that should delegate to the ai-test-shallow-coverage-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Do these tests cover more than the happy path?

```python
def test_discount():
    assert apply_discount(100, 'SAVE10') == 90
def test_discount_two():
    assert apply_discount(200, 'SAVE10') == 180
```
