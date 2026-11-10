---
description: Short prompt that should load chart-render-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After upgrading our charting library the dashboard bars look slightly off but no test failed. How do I catch that?
