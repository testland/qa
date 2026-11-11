---
description: Short prompt that should load test-framework-architecture-audit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Audit this framework layout and tell me what's wrong.

```
tests/
  base_test.py        # 900 lines, 60 helper methods
  utils.py            # sleeps, retries, DB helpers, string helpers
  pages/              # 45 page objects
  test_*.py           # 300 files, many with their own login code
```
