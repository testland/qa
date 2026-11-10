---
description: Short prompt that should load red-green-refactor with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add a `--dry-run` flag to this function so it prints what it would delete instead of deleting.

```python
import os
def cleanup(paths):
    for p in paths:
        os.remove(p)
```
