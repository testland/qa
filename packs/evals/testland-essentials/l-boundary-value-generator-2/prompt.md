---
description: Short prompt that should load boundary-value-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write boundary tests for this validator.

```python
def valid_username(name: str) -> bool:
    return 3 <= len(name) <= 20 and name.isalnum()
```
