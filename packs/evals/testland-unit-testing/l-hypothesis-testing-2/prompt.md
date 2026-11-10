---
description: Short prompt that should load hypothesis-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Hypothesis test for this function.

```python
def dedupe(xs):
    seen = set(); out = []
    for x in xs:
        if x not in seen:
            seen.add(x); out.append(x)
    return out
```
