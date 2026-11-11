---
description: Short prompt that should load flake-pattern-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This test passes locally but fails in CI about once a week. What's the likely cause?

```python
def test_report_date():
    r = build_report()
    assert r.date == datetime.now().date()
```
