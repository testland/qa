---
description: Short prompt that should load coverage-py-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Make CI fail when coverage drops below 85% and include branch coverage.

```yaml
- run: pip install pytest coverage
- run: pytest -n 4
```
