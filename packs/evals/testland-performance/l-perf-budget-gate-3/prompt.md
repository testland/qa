---
description: Short prompt that should load perf-budget-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our performance checks are spread across three tools and each posts its own comment, so regressions get merged anyway. How do we get one decision?
