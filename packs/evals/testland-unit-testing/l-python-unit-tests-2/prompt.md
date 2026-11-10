---
description: Short prompt that should load python-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this function.

```python
def parse_price(s: str) -> int:
    s = s.strip().replace('$', '').replace(',', '')
    return round(float(s) * 100)
```
