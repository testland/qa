---
description: Short prompt that should delegate to the daily-test-suite-aggregator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Aggregate today's test runs from unit, integration, E2E and performance suites across dev and staging into one report.
