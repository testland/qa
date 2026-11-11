---
description: Short prompt that should load test-coverage-targeter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have time for five new tests this sprint. Which of these uncovered areas matter most?

| file | uncovered branches | changes last 90d | complexity |
|---|---|---|---|
| pricing.py | 14 | 22 | high |
| utils/strings.py | 30 | 1 | low |
| refunds.py | 6 | 15 | high |
| admin/export.py | 9 | 2 | medium |
