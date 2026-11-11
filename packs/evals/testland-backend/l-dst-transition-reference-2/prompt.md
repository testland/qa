---
description: Short prompt that should load dst-transition-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our meeting scheduler stores times like this. What breaks on DST transition days?

```python
start = datetime(2026, 3, 29, 2, 30)  # Europe/Berlin, naive
end = start + timedelta(hours=1)
```
