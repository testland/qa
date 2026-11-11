---
description: Short prompt that should load wcag-compliance-reporter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Here's pa11y-ci output for 120 pages. Turn it into a report for management.

```json
{"total": 120, "errors": 846, "results": {"https://example.com/": [{"code": "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail"}]}}
```
