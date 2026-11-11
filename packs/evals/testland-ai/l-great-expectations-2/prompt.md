---
description: Short prompt that should load great-expectations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write expectations for this data and run them in CI.

```python
df = pd.DataFrame({'user_id': [1, 2, None], 'age': [34, 210, 27], 'country': ['DE', 'US', 'XX']})
```
