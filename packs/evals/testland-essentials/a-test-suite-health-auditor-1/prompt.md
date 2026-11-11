---
description: Short prompt that should delegate to the test-suite-health-auditor agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Give me a health verdict on our suite: 2,400 tests (70% unit, 12% integration, 18% E2E), E2E flake rate 6%, 300 tests skipped for a year, CI 48 minutes.
