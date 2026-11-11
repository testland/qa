---
description: Short prompt that should delegate to the daily-test-suite-aggregator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Combine today's results into one summary: unit 4,210/4,212 passed (dev), integration 380/391 (staging), E2E 96/104 (staging), contract 55/55, prod-canary smoke 12/12.
