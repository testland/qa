---
description: Short prompt that should delegate to the data-anomaly-triager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

This Great Expectations check failed overnight: expect_column_values_to_be_between on amount, 3% of rows over 10,000. Triage it.
