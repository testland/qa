---
description: Short prompt that should delegate to the vacuous-property-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Is this property test actually testing anything?

```python
@given(st.integers())
def test_abs(x):
    assume(x > 10**9)
    assert abs(x) >= 0
```
